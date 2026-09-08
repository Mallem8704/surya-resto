import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Coupon, User, AuditLog
from app.schemas import (
    CouponCreate,
    CouponOut,
    CouponValidateReq,
    CouponValidateResponse,
)
from app.routers.auth import require_owner, require_staff_or_owner
from app.routers.outlets import get_effective_outlet_id

router = APIRouter()


@router.post("/validate", response_model=CouponValidateResponse)
def validate_coupon(req: CouponValidateReq, db: Session = Depends(get_db)):
    """Public customer endpoint to validate promo coupon code and compute discount paise."""
    code_clean = req.code.strip().upper()
    subtotal = req.subtotal_paise

    coupon = db.query(Coupon).filter(Coupon.code == code_clean, Coupon.is_active == True).first()

    if not coupon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Coupon code '{code_clean}' is invalid or has expired."
        )

    # Check outlet restriction if set
    if coupon.outlet_id and req.outlet_id:
        eff_req_outlet = get_effective_outlet_id(req.outlet_id, db)
        eff_coupon_outlet = get_effective_outlet_id(coupon.outlet_id, db)
        if eff_req_outlet != eff_coupon_outlet:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Coupon code '{code_clean}' is only valid for another branch."
            )

    # Check usage limit
    if coupon.usage_limit and coupon.times_used >= coupon.usage_limit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Coupon code '{code_clean}' has reached its maximum usage limit."
        )

    # Check minimum order
    if subtotal < coupon.min_order_paise:
        min_rs = coupon.min_order_paise / 100
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Minimum order of ₹{min_rs:.0f} required for coupon '{code_clean}'."
        )

    # Compute discount
    if coupon.discount_type == "percent":
        discount = int(round((subtotal * coupon.discount_value) / 100))
        if coupon.max_discount_paise and discount > coupon.max_discount_paise:
            discount = coupon.max_discount_paise
    else:
        discount = min(coupon.discount_value, subtotal)

    return CouponValidateResponse(
        valid=True,
        code=coupon.code,
        discount_type=coupon.discount_type,
        discount_value=coupon.discount_value,
        discount_paise=discount,
        message=coupon.description or f"Applied {coupon.code} successfully! Saved ₹{discount/100:.2f}"
    )


@router.get("", response_model=List[CouponOut])
def list_coupons(
    outlet_id: Optional[int] = Query(None, description="Filter by outlet ID"),
    current_user: User = Depends(require_staff_or_owner),
    db: Session = Depends(get_db),
):
    """Admin endpoint to list all promo coupons."""
    query = db.query(Coupon)
    if outlet_id:
        target_id = get_effective_outlet_id(outlet_id, db)
        query = query.filter((Coupon.outlet_id == target_id) | (Coupon.outlet_id == None))
    return query.order_by(Coupon.created_at.desc()).all()


@router.post("", response_model=CouponOut, status_code=status.HTTP_201_CREATED)
def create_coupon(
    req: CouponCreate,
    current_user: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    """Owner-only endpoint to create a new promo code."""
    code_clean = req.code.strip().upper()
    existing = db.query(Coupon).filter(Coupon.code == code_clean).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Coupon code '{code_clean}' already exists."
        )

    target_outlet_id = get_effective_outlet_id(req.outlet_id, db) if req.outlet_id else None

    coupon = Coupon(
        outlet_id=target_outlet_id,
        code=code_clean,
        description=req.description,
        discount_type=req.discount_type,
        discount_value=req.discount_value,
        min_order_paise=req.min_order_paise,
        max_discount_paise=req.max_discount_paise,
        usage_limit=req.usage_limit,
        is_active=req.is_active,
        times_used=0,
    )
    db.add(coupon)
    db.commit()
    db.refresh(coupon)

    # Audit log
    from app.audit_utils import log_audit
    eff_outlet_id = get_effective_outlet_id(target_outlet_id or current_user.outlet_id, db)
    log_audit(
        db=db,
        outlet_id=eff_outlet_id,
        user_id=current_user.id,
        action="create_coupon",
        entity_type="coupon",
        entity_id=coupon.id,
        details={"code": code_clean, "discount_type": req.discount_type, "discount_value": req.discount_value}
    )
    db.commit()

    return coupon


@router.delete("/{coupon_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_coupon(
    coupon_id: int,
    current_user: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    """Owner-only endpoint to deactivate/delete a promo coupon."""
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coupon not found")

    coupon.is_active = False
    
    from app.audit_utils import log_audit
    eff_outlet_id = get_effective_outlet_id(coupon.outlet_id or current_user.outlet_id, db)
    log_audit(
        db=db,
        outlet_id=eff_outlet_id,
        user_id=current_user.id,
        action="deactivate_coupon",
        entity_type="coupon",
        entity_id=coupon.id,
        details={"code": coupon.code, "is_active": False}
    )
    db.commit()
