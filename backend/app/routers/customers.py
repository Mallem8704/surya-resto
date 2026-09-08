import datetime
import random
import os
import re
import json
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from jose import JWTError, jwt

from app.database import get_db
from app.models import Customer, CustomerAddress, CustomerOTP, Order, OrderItem, MenuItemVariant, MenuItemAddon
from app.schemas import (
    CustomerQuickLoginReq,
    CustomerSendOTPReq,
    CustomerVerifyOTPReq,
    CustomerAddressCreate,
    CustomerAddressOut,
    CustomerOut,
    CustomerAuthResponse,
)
from app.auth_utils import SECRET_KEY, ALGORITHM

router = APIRouter()


@router.post("/quick-login", response_model=CustomerAuthResponse)
@router.post("/login", response_model=CustomerAuthResponse)
def quick_login(req: CustomerQuickLoginReq, db: Session = Depends(get_db)):
    """Instant Zero-Cost 1-Tap Customer Mobile Login / Auto-Registration (Zero SMS / Zero OTP)."""
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
    if len(cleaned) != 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid 10-digit Indian mobile number."
        )
    return cleaned


def create_customer_token(customer_id: int, phone: str) -> str:
    expire = datetime.datetime.utcnow() + datetime.timedelta(days=90)
    to_encode = {
        "sub": str(customer_id),
        "phone": phone,
        "role": "customer",
        "exp": expire,
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_customer(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Customer:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Customer authentication required. Please login with mobile OTP."
        )
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        customer_id: str = payload.get("sub")
        role: str = payload.get("role")
        if customer_id is None or role != "customer":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid customer credentials")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired, please re-login")

    customer = db.query(Customer).filter(Customer.id == int(customer_id)).first()
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return customer


def get_current_customer_optional(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Optional[Customer]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
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

    print(f"[CUSTOMER-OTP] Generated OTP {otp_code} for mobile +91-{phone}")

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
def get_customer_profile(current_customer: Customer = Depends(get_current_customer)):
    return CustomerOut.model_validate(current_customer)


@router.post("/address", response_model=CustomerAddressOut)
def save_customer_address(
    req: CustomerAddressCreate,
    current_customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    if req.is_default:
        db.query(CustomerAddress).filter(CustomerAddress.customer_id == current_customer.id).update({"is_default": False})
        current_customer.default_address = req.address_line

    addr = CustomerAddress(
        customer_id=current_customer.id,
        label=req.label,
        address_line=req.address_line,
        landmark=req.landmark,
        is_default=req.is_default,
    )
    db.add(addr)
    db.commit()
    db.refresh(addr)
    return CustomerAddressOut.model_validate(addr)


@router.get("/orders")
def get_customer_orders(
    current_customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    orders = db.query(Order).filter(
        Order.customer_phone == current_customer.phone
    ).order_by(Order.id.desc()).limit(15).all()

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
