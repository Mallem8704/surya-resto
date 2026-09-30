import datetime
import random
import os
import re
import json
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Header, Request
from sqlalchemy.orm import Session, selectinload
from jose import JWTError, jwt

from app.database import get_db
from app.models import Customer, CustomerAddress, CustomerOTP, Order, OrderItem, MenuItemVariant, MenuItemAddon, User
from app.schemas import (
    CustomerRegisterReq,
    CustomerLoginReq,
    CustomerCheckPhoneReq,
    CustomerQuickLoginReq,
    CustomerSendOTPReq,
    CustomerVerifyOTPReq,
    CustomerAddressCreate,
    CustomerAddressOut,
    CustomerOut,
    CustomerAuthResponse,
    AdminCustomerListItem,
    AdminCustomersSummary,
    AdminCustomersResponse,
)
from app.auth_utils import SECRET_KEY, ALGORITHM, verify_password, get_password_hash
from app.routers.auth import require_staff_or_owner
from app.rate_limiter import customer_login_limiter, customer_register_limiter


router = APIRouter()


@router.post("/register", response_model=CustomerAuthResponse)
def register_customer(req: CustomerRegisterReq, request: Request, db: Session = Depends(get_db)):
    """Customer registration with 10-digit mobile number and password (Zero OTP)."""
    customer_register_limiter.check(request)
    phone = normalize_phone(req.phone)
    now = datetime.datetime.utcnow()

    customer = db.query(Customer).filter(Customer.phone == phone).first()
    if customer and customer.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this mobile number already exists. Please sign in."
        )

    if not customer:
        customer = Customer(
            phone=phone,
            name=req.name.strip() if req.name else None,
            email=req.email.strip() if req.email else None,
            hashed_password=get_password_hash(req.password),
            created_at=now,
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)
    else:
        # Existing walk-in customer setting their password for the first time
        if req.name and req.name.strip():
            customer.name = req.name.strip()
        if req.email and req.email.strip():
            customer.email = req.email.strip()
        customer.hashed_password = get_password_hash(req.password)
        db.commit()
        db.refresh(customer)

    token = create_customer_token(customer.id, customer.phone)

    return CustomerAuthResponse(
        access_token=token,
        token_type="bearer",
        customer=CustomerOut.model_validate(customer),
    )


@router.post("/login", response_model=CustomerAuthResponse)
def login_customer(req: CustomerLoginReq, request: Request, db: Session = Depends(get_db)):
    """Customer login with 10-digit mobile number and password (Zero OTP)."""
    customer_login_limiter.check_pre_attempt(request)
    phone = normalize_phone(req.phone)
    customer = db.query(Customer).filter(Customer.phone == phone).first()

    if not customer:
        customer_login_limiter.record_failure(request)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this mobile number. Please register first."
        )

    if not customer.hashed_password:
        customer_login_limiter.record_failure(request)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No password set for this account. Please register to set up your password."
        )
    elif not verify_password(req.password, customer.hashed_password):
        customer_login_limiter.record_failure(request)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect password. Please verify and try again."
        )

    customer_login_limiter.record_success(request)
    token = create_customer_token(customer.id, customer.phone)

    return CustomerAuthResponse(
        access_token=token,
        token_type="bearer",
        customer=CustomerOut.model_validate(customer),
    )


@router.post("/check-phone")
def check_phone(req: CustomerCheckPhoneReq, db: Session = Depends(get_db)):
    """Check if a phone number is registered and has a password set."""
    phone = normalize_phone(req.phone)
    customer = db.query(Customer).filter(Customer.phone == phone).first()
    return {
        "exists": customer is not None and customer.hashed_password is not None,
        "has_record": customer is not None,
        "name": customer.name if customer else None,
    }


@router.post("/quick-login", response_model=CustomerAuthResponse)
def quick_login(req: CustomerQuickLoginReq, db: Session = Depends(get_db)):
    """Backward-compatible Quick Login fallback (Zero OTP)."""
    phone = normalize_phone(req.phone)
    now = datetime.datetime.utcnow()

    customer = db.query(Customer).filter(Customer.phone == phone).first()
    if not customer:
        customer = Customer(
            phone=phone,
            name=req.name.strip() if req.name else None,
            created_at=now,
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)
    else:
        if req.name and (not customer.name or customer.name == "Customer"):
            customer.name = req.name.strip()
            db.commit()
            db.refresh(customer)

    token = create_customer_token(customer.id, customer.phone)

    return CustomerAuthResponse(
        access_token=token,
        token_type="bearer",
        customer=CustomerOut.model_validate(customer),
    )


def normalize_phone(phone: str) -> str:
    cleaned = re.sub(r"[^\d]", "", phone)
    if len(cleaned) > 10 and cleaned.startswith("91"):
        cleaned = cleaned[2:]
    elif len(cleaned) > 10 and cleaned.startswith("0"):
        cleaned = cleaned[1:]
    if len(cleaned) != 10 or not re.match(r"^[6-9]\d{9}$", cleaned):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9)."
        )
    return cleaned


def create_customer_token(customer_id: int, phone: str) -> str:
    # 90-Day Long-Lived Token to keep customer login session active across visits
    expire = datetime.datetime.utcnow() + datetime.timedelta(days=90)
    to_encode = {
        "sub": str(customer_id),
        "phone": phone,
        "role": "customer",
        "exp": expire,
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def extract_customer_token(authorization: Optional[str], x_customer_token: Optional[str]) -> Optional[str]:
    if x_customer_token and x_customer_token.strip():
        return x_customer_token.strip()
    if authorization and authorization.startswith("Bearer "):
        return authorization.split(" ")[1].strip()
    return None


def get_current_customer(
    authorization: Optional[str] = Header(None),
    x_customer_token: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Customer:
    token = extract_customer_token(authorization, x_customer_token)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Customer authentication required. Please sign in with your mobile number and password."
        )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        customer_id: str = payload.get("sub")
        role: str = payload.get("role")
        if customer_id is None or role != "customer":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid customer credentials")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Customer session expired, please re-login")

    customer = db.query(Customer).filter(Customer.id == int(customer_id)).first()
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return customer


def get_current_customer_optional(
    authorization: Optional[str] = Header(None),
    x_customer_token: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Optional[Customer]:
    token = extract_customer_token(authorization, x_customer_token)
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        customer_id: str = payload.get("sub")
        role: str = payload.get("role")
        if customer_id and role == "customer":
            return db.query(Customer).filter(Customer.id == int(customer_id)).first()
    except Exception:
        return None
    return None


@router.post("/send-otp")
def send_otp(req: CustomerSendOTPReq, db: Session = Depends(get_db)):
    phone = normalize_phone(req.phone)
    now = datetime.datetime.utcnow()

    ten_mins_ago = now - datetime.timedelta(minutes=10)
    recent_otps = db.query(CustomerOTP).filter(
        CustomerOTP.phone == phone,
        CustomerOTP.created_at >= ten_mins_ago
    ).count()

    if recent_otps >= 5:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many OTP requests for this number. Please wait a few minutes."
        )

    otp_code = "123456" if os.getenv("ENVIRONMENT") != "production" else f"{random.randint(100000, 999999)}"
    expires_at = now + datetime.timedelta(minutes=10)

    otp_record = CustomerOTP(
        phone=phone,
        otp_code=otp_code,
        expires_at=expires_at,
        is_used=False,
    )
    db.add(otp_record)
    db.commit()

    import logging
    logging.getLogger("surya.customer").info(f"OTP generated for +91-{phone[:3]}****{phone[-3:]}")

    return {
        "status": "success",
        "message": f"OTP successfully sent to +91 {phone}",
        "phone": phone,
        "debug_otp": otp_code if os.getenv("ENVIRONMENT", "development") != "production" else None,
    }


@router.post("/verify-otp", response_model=CustomerAuthResponse)
def verify_otp(req: CustomerVerifyOTPReq, db: Session = Depends(get_db)):
    phone = normalize_phone(req.phone)
    now = datetime.datetime.utcnow()

    otp_entry = db.query(CustomerOTP).filter(
        CustomerOTP.phone == phone,
        CustomerOTP.is_used == False,
        CustomerOTP.expires_at >= now
    ).order_by(CustomerOTP.id.desc()).first()

    is_demo = req.otp_code == "123456" and os.getenv("ENVIRONMENT", "development") != "production"
    if not is_demo and (not otp_entry or otp_entry.otp_code != req.otp_code):
        if otp_entry:
            otp_entry.attempts += 1
            db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP code. Please request a new OTP."
        )

    if otp_entry:
        otp_entry.is_used = True
        db.commit()

    customer = db.query(Customer).filter(Customer.phone == phone).first()
    if not customer:
        customer = Customer(
            phone=phone,
            name=req.name.strip() if req.name else None,
            created_at=now,
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)
    elif req.name and not customer.name:
        customer.name = req.name.strip()
        db.commit()
        db.refresh(customer)

    token = create_customer_token(customer.id, customer.phone)

    return CustomerAuthResponse(
        access_token=token,
        token_type="bearer",
        customer=CustomerOut.model_validate(customer),
    )


@router.get("/profile", response_model=CustomerOut)
@router.get("/me", response_model=CustomerOut)
def get_customer_profile(current_customer: Customer = Depends(get_current_customer)):
    return CustomerOut.model_validate(current_customer)


@router.get("/addresses", response_model=List[CustomerAddressOut])
@router.get("/address", response_model=List[CustomerAddressOut])
def get_customer_addresses(
    current_customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Retrieve all saved addresses for the authenticated customer."""
    addresses = (
        db.query(CustomerAddress)
        .filter(CustomerAddress.customer_id == current_customer.id)
        .order_by(CustomerAddress.is_default.desc(), CustomerAddress.id.desc())
        .all()
    )
    return [CustomerAddressOut.model_validate(a) for a in addresses]


@router.post("/address", response_model=CustomerAddressOut)
@router.post("/addresses", response_model=CustomerAddressOut)
def save_customer_address(
    req: CustomerAddressCreate,
    current_customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    existing_count = db.query(CustomerAddress).filter(CustomerAddress.customer_id == current_customer.id).count()
    should_be_default = req.is_default or existing_count == 0

    if should_be_default:
        db.query(CustomerAddress).filter(CustomerAddress.customer_id == current_customer.id).update({"is_default": False})
        current_customer.default_address = req.address_line

    addr = CustomerAddress(
        customer_id=current_customer.id,
        label=req.label,
        address_line=req.address_line,
        landmark=req.landmark,
        is_default=should_be_default,
    )
    db.add(addr)
    db.commit()
    db.refresh(addr)
    return CustomerAddressOut.model_validate(addr)


@router.delete("/addresses/{address_id}")
@router.delete("/address/{address_id}")
def delete_customer_address(
    address_id: int,
    current_customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    addr = db.query(CustomerAddress).filter(
        CustomerAddress.id == address_id,
        CustomerAddress.customer_id == current_customer.id
    ).first()
    if not addr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found")

    was_default = addr.is_default
    db.delete(addr)
    db.commit()

    if was_default:
        next_addr = db.query(CustomerAddress).filter(CustomerAddress.customer_id == current_customer.id).first()
        if next_addr:
            next_addr.is_default = True
            current_customer.default_address = next_addr.address_line
        else:
            current_customer.default_address = None
        db.commit()

    return {"status": "success", "message": "Address deleted successfully"}


@router.get("/orders")
def get_customer_orders(
    current_customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    from sqlalchemy import or_
    orders = db.query(Order).options(selectinload(Order.items)).filter(
        or_(
            Order.customer_id == current_customer.id,
            Order.customer_phone == current_customer.phone,
        )
    ).order_by(Order.id.desc()).limit(25).all()

    result = []
    for o in orders:
        items_summary = []
        for it in o.items:
            items_summary.append({
                "item_id": it.item_id,
                "item_name": it.item_name,
                "variant_id": it.variant_id,
                "variant_name": it.variant_name,
                "selected_addons_json": it.selected_addons_json,
                "qty": it.qty,
                "total_price_paise": it.total_price_paise,
            })
        result.append({
            "id": o.id,
            "order_number": o.order_number,
            "outlet_id": o.outlet_id,
            "order_type": o.order_type,
            "status": o.status,
            "total_paise": o.total_paise,
            "delivery_address": o.delivery_address,
            "created_at": o.created_at.isoformat() if o.created_at else None,
            "items": items_summary,
        })
    return result


@router.get("/reorder/{order_id}")
def get_reorder_payload(
    order_id: int,
    db: Session = Depends(get_db)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    reorder_items = []
    for it in order.items:
        addon_ids = []
        if it.selected_addons_json:
            try:
                parsed = json.loads(it.selected_addons_json)
                addon_ids = [a.get("id") for a in parsed if a.get("id")]
            except Exception:
                pass

        reorder_items.append({
            "item_id": it.item_id,
            "variant_id": it.variant_id,
            "addon_ids": addon_ids,
            "qty": it.qty,
            "notes": it.notes,
        })

    return {
        "outlet_id": order.outlet_id,
        "order_type": order.order_type,
        "customer_name": order.customer_name,
        "customer_phone": order.customer_phone,
        "delivery_address": order.delivery_address,
        "items": reorder_items,
    }


# ==========================================
# ADMIN CUSTOMER CRM ENDPOINTS
# ==========================================

@router.get("/admin/list", response_model=AdminCustomersResponse)
def get_admin_customers(
    search: Optional[str] = None,
    tier: Optional[str] = None,
    current_user: User = Depends(require_staff_or_owner),
    db: Session = Depends(get_db),
):
    """
    Dedicated CRM endpoint for Admin & Staff.
    Provides customer aggregate stats, loyalty tier breakdown, spend metrics, and phone search.
    """
    all_customers = db.query(Customer).order_by(Customer.created_at.desc()).all()

    items = []
    total_revenue_paise = 0
    vip_count = 0
    returning_count = 0
    new_count = 0

    for c in all_customers:
        valid_orders = [o for o in c.orders if o.status != "cancelled"]
        total_orders = len(valid_orders)
        total_spent = sum(o.total_paise for o in valid_orders)
        total_revenue_paise += total_spent

        if total_orders >= 5:
            c_tier = "vip"
            vip_count += 1
        elif total_orders >= 2:
            c_tier = "returning"
            returning_count += 1
        else:
            c_tier = "new"
            new_count += 1

        latest_order = c.orders[0] if c.orders else None
        last_order_dt = latest_order.created_at if latest_order else c.last_order_at

        item = AdminCustomerListItem(
            id=c.id,
            phone=c.phone,
            name=c.name or "Guest Diner",
            email=c.email,
            default_address=c.default_address,
            created_at=c.created_at,
            last_order_at=last_order_dt,
            total_orders=total_orders,
            total_spent_paise=total_spent,
            tier=c_tier,
            addresses_count=len(c.addresses),
            latest_order_number=latest_order.order_number if latest_order else None,
        )
        items.append(item)

    filtered_items = items
    if search and search.strip():
        term = search.strip().lower()
        filtered_items = [
            it for it in filtered_items
            if (term in it.phone.lower()) or (it.name and term in it.name.lower()) or (it.email and term in it.email.lower())
        ]

    if tier and tier.strip() and tier.lower() != "all":
        t = tier.strip().lower()
        filtered_items = [it for it in filtered_items if it.tier == t]

    summary = AdminCustomersSummary(
        total_customers=len(all_customers),
        vip_count=vip_count,
        returning_count=returning_count,
        new_count=new_count,
        total_revenue_paise=total_revenue_paise,
    )

    return AdminCustomersResponse(
        summary=summary,
        customers=filtered_items,
    )


@router.get("/admin/{customer_id}")
def get_admin_customer_detail(
    customer_id: int,
    current_user: User = Depends(require_staff_or_owner),
    db: Session = Depends(get_db),
):
    """
    Get in-depth CRM view for a specific customer, including address book and full order chronology.
    """
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    valid_orders = [o for o in customer.orders if o.status != "cancelled"]
    total_orders = len(valid_orders)
    total_spent = sum(o.total_paise for o in valid_orders)

    tier = "new"
    if total_orders >= 5:
        tier = "vip"
    elif total_orders >= 2:
        tier = "returning"

    order_history = []
    for o in customer.orders:
        items_detail = []
        for it in o.items:
            items_detail.append({
                "id": it.id,
                "item_name": it.item_name,
                "variant_name": it.variant_name,
                "qty": it.qty,
                "total_price_paise": it.total_price_paise,
            })
        order_history.append({
            "id": o.id,
            "order_number": o.order_number,
            "outlet_id": o.outlet_id,
            "table_id": o.table_id,
            "order_type": o.order_type,
            "status": o.status,
            "total_paise": o.total_paise,
            "payment_status": o.payment_status,
            "payment_method": o.payment_method,
            "delivery_address": o.delivery_address,
            "created_at": o.created_at.isoformat() if o.created_at else None,
            "items": items_detail,
        })

    addresses = [
        {
            "id": a.id,
            "label": a.label,
            "address_line": a.address_line,
            "landmark": a.landmark,
            "is_default": a.is_default,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in customer.addresses
    ]

    return {
        "customer": {
            "id": customer.id,
            "phone": customer.phone,
            "name": customer.name or "Guest Diner",
            "email": customer.email,
            "default_address": customer.default_address,
            "created_at": customer.created_at.isoformat() if customer.created_at else None,
            "last_order_at": customer.last_order_at.isoformat() if customer.last_order_at else None,
            "tier": tier,
            "total_orders": total_orders,
            "total_spent_paise": total_spent,
        },
        "addresses": addresses,
        "orders": order_history,
    }

