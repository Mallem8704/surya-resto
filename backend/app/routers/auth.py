from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Header, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import LoginRequest, TokenResponse, UserOut, ChangePasswordRequest, SwitchBranchRequest
from app.auth_utils import verify_password, create_access_token, decode_access_token, get_password_hash
from app.audit_utils import log_audit
from app.rate_limiter import auth_limiter

router = APIRouter(prefix="", tags=["Authentication"])

security = HTTPBearer(auto_error=False)


# ==========================================
# AUTH DEPENDENCIES
# ==========================================

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Dependency that extracts and validates the JWT bearer token."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("user_id") or payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user identity",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id_int = int(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id_int).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Optional authentication dependency that returns User if valid token is provided, else None."""
    if not credentials or not credentials.credentials:
        return None
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        return None
    user_id = payload.get("user_id") or payload.get("sub")
    if not user_id:
        return None
    try:
        user_id_int = int(user_id)
        return db.query(User).filter(User.id == user_id_int).first()
    except Exception:
        return None


def require_owner(
    current_user: User = Depends(get_current_user)
) -> User:
    """Dependency restricting endpoint access to owners only."""
    if current_user.role != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Owner privileges required for this action",
        )
    return current_user


def require_staff_or_owner(
    current_user: User = Depends(get_current_user)
) -> User:
    """Dependency allowing both staff and owner roles."""
    if current_user.role not in ["owner", "staff"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff or owner privileges required",
        )
    return current_user


# ==========================================
# AUTH ENDPOINTS
# ==========================================

@router.post("/login", response_model=TokenResponse)
def login(request_data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """Authenticate owner or staff user with brute-force protection & audit logging."""
    email_clean = request_data.email.strip().lower()

    # 1. Check brute force lockout
    auth_limiter.check_pre_login(request, email_clean)

    forwarded = request.headers.get("X-Forwarded-For")
    client_ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")
    user_agent = request.headers.get("User-Agent", "unknown")

    user = db.query(User).filter(User.email == email_clean).first()

    if not user or not verify_password(request_data.password, user.password_hash):
        auth_limiter.record_failure(request, email_clean)
        # Log failed attempt
        try:
            log_audit(
                db=db,
                outlet_id=user.outlet_id if user else 1,
                user_id=user.id if user else None,
                action="login_failed",
                entity_type="auth",
                entity_id=user.id if user else None,
                details={
                    "target_email": email_clean,
                    "ip": client_ip,
                    "user_agent": user_agent,
                    "reason": "invalid_credentials",
                },
            )
            db.commit()
        except Exception:
            pass

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2. Record successful login
    auth_limiter.record_success(request, email_clean)

    try:
        log_audit(
            db=db,
            outlet_id=user.outlet_id,
            user_id=user.id,
            action="login_success",
            entity_type="auth",
            entity_id=user.id,
            details={
                "email": user.email,
                "role": user.role,
                "ip": client_ip,
                "user_agent": user_agent,
            },
        )
        db.commit()
    except Exception:
        pass

    # Create JWT Token with role and outlet claims
    token_claims = {
        "sub": str(user.id),
        "user_id": user.id,
        "email": user.email,
        "role": user.role,
        "name": user.name,
        "outlet_id": user.outlet_id,
    }
    access_token = create_access_token(data=token_claims)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        role=user.role,
        user_id=user.id,
        name=user.name,
        email=user.email,
        outlet_id=user.outlet_id,
        user=UserOut.model_validate(user),
    )


@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Securely update account password with complexity validation & audit logging."""
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password does not match",
        )

    if data.current_password == data.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password",
        )

    if len(data.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters long",
        )

    # Update password hash
    current_user.password_hash = get_password_hash(data.new_password)

    log_audit(
        db=db,
        outlet_id=current_user.outlet_id,
        user_id=current_user.id,
        action="password_changed",
        entity_type="user",
        entity_id=current_user.id,
        details={
            "user_email": current_user.email,
            "role": current_user.role,
        },
    )

    db.commit()

    return {
        "success": True,
        "message": "Password updated successfully. Please use your new password on next login.",
    }


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """Return currently authenticated user profile."""
    return current_user


@router.get("/owner-check")
def test_owner_check(current_user: User = Depends(require_owner)):
    """Test endpoint to verify owner-only access."""
    return {
        "message": f"Welcome Owner {current_user.name}",
        "role": current_user.role,
        "outlet_id": current_user.outlet_id,
    }


@router.post("/switch-branch", response_model=TokenResponse)
def switch_branch(
    data: SwitchBranchRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Admin-only password-protected branch switching endpoint.
    
    Verifies admin credentials server-side and generates a newly scoped JWT token
    for the selected target branch with full tamper-evident audit logging.
    Supports both active sessions and password re-authentication.
    """
    admin_user = current_user

    # If token was missing/expired or user not resolved from token, resolve via admin_email
    if not admin_user and data.admin_email:
        email_clean = data.admin_email.strip().lower()
        admin_user = db.query(User).filter(User.email == email_clean).first()

    # If still not resolved from session or email, find matching owner account by password
    if not admin_user:
        owners = db.query(User).filter(User.role == "owner").all()
        for o in owners:
            if verify_password(data.admin_password, o.password_hash):
                admin_user = o
                break

    if not admin_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid admin credentials. Please enter your Admin password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify role is owner
    if admin_user.role != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators / owners can switch branches.",
        )

    # 1. Verify Admin password
    if not verify_password(data.admin_password, admin_user.password_hash):
        log_audit(
            db=db,
            outlet_id=admin_user.outlet_id,
            user_id=admin_user.id,
            action="branch_switch_failed",
            entity_type="auth",
            entity_id=admin_user.id,
            details={
                "target_outlet_id": data.target_outlet_id,
                "reason": "invalid_admin_password",
            },
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin password. Branch switch access denied.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2. Verify target outlet exists
    from app.models import Outlet
    target_outlet = db.query(Outlet).filter(Outlet.id == data.target_outlet_id).first()
    if not target_outlet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Branch with ID {data.target_outlet_id} does not exist.",
        )

    # 3. Create fresh JWT token scoped to the target branch
    token_claims = {
        "sub": str(admin_user.id),
        "user_id": admin_user.id,
        "email": admin_user.email,
        "role": admin_user.role,
        "name": admin_user.name,
        "outlet_id": target_outlet.id,
    }
    access_token = create_access_token(data=token_claims)

    log_audit(
        db=db,
        outlet_id=target_outlet.id,
        user_id=admin_user.id,
        action="branch_switch_success",
        entity_type="auth",
        entity_id=admin_user.id,
        details={
            "from_outlet_id": admin_user.outlet_id,
            "to_outlet_id": target_outlet.id,
            "to_outlet_name": target_outlet.name,
            "admin_name": admin_user.name,
        },
    )
    db.commit()

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        role=admin_user.role,
        user_id=admin_user.id,
        name=admin_user.name,
        email=admin_user.email,
        outlet_id=target_outlet.id,
        user=UserOut(
            id=admin_user.id,
            outlet_id=target_outlet.id,
            name=admin_user.name,
            email=admin_user.email,
            role=admin_user.role,
            created_at=admin_user.created_at,
        ),
    )
