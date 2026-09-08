import os
import hmac
import hashlib
import datetime
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from dotenv import load_dotenv

import urllib.parse
from app.database import get_db
from app.models import Order, Payment, User, Outlet
from app.schemas import (
    RazorpayOrderRequest,
    RazorpayOrderResponse,
    RazorpayVerifyRequest,
    MarkCashPaidRequest,
    RecordPaymentRequest,
    SplitPaymentRequest,
    DynamicUpiQrResponse,
    PaymentOut,
    OrderOut,
)
from app.routers.auth import require_staff_or_owner
from app.routers.ws import manager
from app.audit_utils import log_audit

load_dotenv()

router = APIRouter(prefix="", tags=["Payments & Cashier"])

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "rzp_test_sampleKey123")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "sampleSecretKey123")


# ==========================================
# RAZORPAY UPI / ONLINE PAYMENT INTEGRATION
# ==========================================

@router.post("/create-razorpay-order", response_model=RazorpayOrderResponse)
def create_razorpay_order(
    data: RazorpayOrderRequest,
    db: Session = Depends(get_db),
):
    """Generate a Razorpay Order ID for online UPI / Card checkout."""
    order = db.query(Order).filter(Order.id == data.order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with ID {data.order_id} not found",
        )

    if order.payment_status == "paid":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order is already paid",
        )

    # In production, call razorpay_client.order.create(...)
    # For zero-config local & sandbox testing, generate compliant Razorpay order ID
    rzp_order_id = f"order_rzp_{uuid.uuid4().hex[:14]}"

    return RazorpayOrderResponse(
        razorpay_order_id=rzp_order_id,
        amount_paise=order.total_paise,
        currency="INR",
        key_id=RAZORPAY_KEY_ID,
        order_number=order.order_number,
    )


@router.post("/verify-razorpay-payment")
async def verify_razorpay_payment(
    data: RazorpayVerifyRequest,
    db: Session = Depends(get_db),
):
    """Verify Razorpay payment signature and mark order as paid."""
    order = db.query(Order).options(joinedload(Order.items), joinedload(Order.table)).filter(Order.id == data.order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with ID {data.order_id} not found",
        )

    # Validate HMAC signature if non-test secret or verify structure
    expected_msg = f"{data.razorpay_order_id}|{data.razorpay_payment_id}"
    generated_sig = hmac.new(
        RAZORPAY_KEY_SECRET.encode(),
        expected_msg.encode(),
        hashlib.sha256,
    ).hexdigest()

    # In test sandbox mode, allow simulated signatures or verified HMAC signatures
    is_production = os.getenv("ENVIRONMENT", "development") == "production"
    if is_production:
        is_valid = hmac.compare_digest(generated_sig, data.razorpay_signature)
    else:
        # In development/sandbox, allow mock signatures for testing
        is_valid = (
            hmac.compare_digest(generated_sig, data.razorpay_signature)
            or data.razorpay_signature.startswith("mock_sig_")
        )

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Razorpay payment signature",
        )

    # Update order payment state
    order.payment_status = "paid"
    order.payment_method = "upi"

    payment = Payment(
        order_id=order.id,
        method="upi",
        txn_id=data.razorpay_payment_id,
        amount_paise=order.total_paise,
        status="completed",
        paid_at=datetime.datetime.utcnow(),
        notes=f"Razorpay UPI/Online payment verified (Order: {data.razorpay_order_id})",
    )
    db.add(payment)

    log_audit(
        db=db,
        outlet_id=order.outlet_id,
        user_id=None,
        action="online_payment_completed",
        entity_type="payment",
        entity_id=order.id,
        details={
            "order_number": order.order_number,
            "amount_paise": order.total_paise,
            "amount_formatted": f"₹{order.total_paise / 100:.2f}",
            "txn_id": data.razorpay_payment_id,
            "method": "upi",
        },
    )

    db.commit()
    db.refresh(order)

    # Broadcast live payment update to customer and admin
    from app.routers.orders import format_order_response
    formatted = format_order_response(order)
    await manager.broadcast_to_order(
        order_id=order.id,
        event_type="order_status_updated",
        data=formatted.model_dump(mode="json"),
        outlet_id=order.outlet_id,
    )

    return {
        "success": True,
        "message": "Payment verified successfully",
        "order_number": order.order_number,
        "amount_paise": order.total_paise,
        "amount_formatted": f"₹{order.total_paise / 100:.2f}",
        "payment_status": "paid",
    }


# ==========================================
# COUNTER CASH RECONCILIATION
# ==========================================

@router.post("/{order_id}/mark-cash-paid")
async def mark_cash_payment_paid(
    order_id: int,
    data: Optional[MarkCashPaidRequest] = None,
    current_user: User = Depends(require_staff_or_owner),
    db: Session = Depends(get_db),
):
    """Mark an order as paid in cash at counter (Cashier reconciliation)."""
    order = db.query(Order).options(joinedload(Order.items), joinedload(Order.table)).filter(Order.id == order_id, Order.outlet_id == current_user.outlet_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with ID {order_id} not found",
        )

    if order.payment_status == "paid":
        return {
            "success": True,
            "message": "Order was already marked as paid",
            "order_number": order.order_number,
            "payment_status": "paid",
        }

    order.payment_status = "paid"
    order.payment_method = "cash"
    notes = data.notes if data and data.notes else "Paid in cash at counter"

    txn_id = f"CASH-{order.order_number}-{uuid.uuid4().hex[:6]}"
    payment = Payment(
        order_id=order.id,
        method="cash",
        txn_id=txn_id,
        amount_paise=order.total_paise,
        status="completed",
        paid_at=datetime.datetime.utcnow(),
        notes=f"{notes} (Collected by {current_user.name})",
    )
    db.add(payment)

    log_audit(
        db=db,
        outlet_id=current_user.outlet_id,
        user_id=current_user.id,
        action="cash_payment_collected",
        entity_type="payment",
        entity_id=order.id,
        details={
            "order_number": order.order_number,
            "amount_paise": order.total_paise,
            "amount_formatted": f"₹{order.total_paise / 100:.2f}",
            "method": "cash",
            "collected_by": current_user.name,
        },
    )

    db.commit()
    db.refresh(order)

    # Broadcast updated payment state to customer screen & admin board
    from app.routers.orders import format_order_response
    formatted = format_order_response(order)
    await manager.broadcast_to_order(
        order_id=order.id,
        event_type="order_status_updated",
        data=formatted.model_dump(mode="json"),
        outlet_id=order.outlet_id,
    )

    return {
        "success": True,
        "message": f"Order #{order.order_number} marked as paid in cash",
        "order_number": order.order_number,
        "amount_paise": order.total_paise,
        "amount_formatted": f"₹{order.total_paise / 100:.2f}",
        "payment_status": "paid",
        "collected_by": current_user.name,
    }


# ==========================================
# DYNAMIC ZERO-FEE NPCI UPI QR GENERATION
# ==========================================

@router.get("/{order_id}/dynamic-upi", response_model=DynamicUpiQrResponse)
def get_dynamic_upi_qr(
    order_id: int,
    db: Session = Depends(get_db),
):
    """Generate official NPCI Dynamic UPI Intent URI for zero-fee direct payment with exact balance."""
    order = db.query(Order).options(joinedload(Order.table)).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail=f"Order #{order_id} not found")

    outlet = db.query(Outlet).filter(Outlet.id == order.outlet_id).first()
    outlet_name = outlet.name if outlet else "Surya Family Restaurant"
    upi_vpa = (outlet.upi_vpa if outlet and outlet.upi_vpa else "9880358634@upi").strip()

    # Calculate remaining balance to pay
    paid_paise = sum(
        p.amount_paise for p in db.query(Payment).filter(
            Payment.order_id == order.id,
            Payment.status == "completed"
        ).all()
    )
    balance_paise = max(0, order.total_paise - paid_paise)
    amount_rs = round(balance_paise / 100.0, 2)

    # Standard NPCI UPI URI: upi://pay?pa={vpa}&pn={name}&am={amount}&tn={note}&cu=INR
    encoded_name = urllib.parse.quote(outlet_name.replace("&", "and"))
    clean_note = f"Bill {order.order_number}".replace("_", " ")
    encoded_note = urllib.parse.quote(clean_note)
    upi_uri = f"upi://pay?pa={upi_vpa}&pn={encoded_name}&am={amount_rs:.2f}&tn={encoded_note}&cu=INR"

    return DynamicUpiQrResponse(
        upi_uri=upi_uri,
        amount_paise=balance_paise,
        amount_rs=amount_rs,
        order_number=order.order_number,
        outlet_name=outlet_name,
        upi_vpa=upi_vpa,
    )


# ==========================================
# CASHIER FAST TENDER & HYBRID / RECORD PAYMENT
# ==========================================

@router.post("/{order_id}/record-payment")
async def record_order_payment(
    order_id: int,
    data: RecordPaymentRequest,
    current_user: User = Depends(require_staff_or_owner),
    db: Session = Depends(get_db),
):
    """Record a single payment (cash with change calculation, UPI, or card) towards an order."""
    order = (
        db.query(Order)
        .options(joinedload(Order.items), joinedload(Order.table))
        .filter(Order.id == order_id, Order.outlet_id == current_user.outlet_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail=f"Order with ID {order_id} not found")

    if order.payment_status == "paid":
        return {
            "success": True,
            "message": "Order is already fully paid",
            "order_number": order.order_number,
            "payment_status": "paid",
            "balance_paise": 0,
        }

    txn_prefix = data.method.upper()
    txn_id = data.txn_id or f"{txn_prefix}-{order.order_number}-{uuid.uuid4().hex[:6]}"
    
    notes = data.notes or f"Paid via {data.method.upper()}"
    if data.tendered_paise and data.change_returned_paise is not None:
        notes += f" (Tendered: ₹{data.tendered_paise/100:.2f}, Change: ₹{data.change_returned_paise/100:.2f})"

    payment = Payment(
        order_id=order.id,
        method=data.method.lower(),
        txn_id=txn_id,
        amount_paise=data.amount_paise,
        status="completed",
        paid_at=datetime.datetime.utcnow(),
        notes=f"{notes} (Collected by {current_user.name})",
    )
    db.add(payment)
    db.flush()

    # Recalculate total paid
    all_payments = db.query(Payment).filter(Payment.order_id == order.id, Payment.status == "completed").all()
    total_paid_paise = sum(p.amount_paise for p in all_payments)
    balance_paise = max(0, order.total_paise - total_paid_paise)

    if total_paid_paise >= order.total_paise:
        order.payment_status = "paid"
        methods = set(p.method for p in all_payments)
        order.payment_method = list(methods)[0] if len(methods) == 1 else "split"
    else:
        order.payment_status = "partially_paid"

    log_audit(
        db=db,
        outlet_id=current_user.outlet_id,
        user_id=current_user.id,
        action="payment_collected",
        entity_type="payment",
        entity_id=order.id,
        details={
            "order_number": order.order_number,
            "method": data.method,
            "amount_paise": data.amount_paise,
            "amount_formatted": f"₹{data.amount_paise / 100:.2f}",
            "tendered_paise": data.tendered_paise,
            "change_returned_paise": data.change_returned_paise,
            "total_paid_paise": total_paid_paise,
            "balance_paise": balance_paise,
            "collected_by": current_user.name,
        },
    )

    db.commit()
    db.refresh(order)

    # Broadcast updated payment state
    from app.routers.orders import format_order_response
    formatted = format_order_response(order)
    try:
        await manager.broadcast_to_admin(
            outlet_id=order.outlet_id,
            event_type="order_status_updated",
            data=formatted.model_dump(mode="json"),
        )
        await manager.broadcast_to_order(
            order_id=order.id,
            event_type="order_status_updated",
            data=formatted.model_dump(mode="json"),
            outlet_id=order.outlet_id,
        )
    except Exception:
        pass

    return {
        "success": True,
        "message": f"Payment of ₹{data.amount_paise/100:.2f} recorded",
        "order_number": order.order_number,
        "amount_paise": data.amount_paise,
        "total_paid_paise": total_paid_paise,
        "balance_paise": balance_paise,
        "payment_status": order.payment_status,
        "payment_method": order.payment_method,
        "collected_by": current_user.name,
    }


# ==========================================
# MULTI-TENDER & SPLIT BILLING SETTLEMENT
# ==========================================

@router.post("/{order_id}/split-payment")
@router.post("/{order_id}/split")
async def split_order_payment(
    order_id: int,
    data: SplitPaymentRequest,
    current_user: User = Depends(require_staff_or_owner),
    db: Session = Depends(get_db),
):
    """Process multiple split payment splits (e.g. 50% Cash + 50% UPI, or N persons) atomically."""
    order = (
        db.query(Order)
        .options(joinedload(Order.items), joinedload(Order.table))
        .filter(Order.id == order_id, Order.outlet_id == current_user.outlet_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail=f"Order with ID {order_id} not found")

    created_payments = []
    total_split_paise = 0

    for idx, p_req in enumerate(data.payments):
        txn_id = p_req.txn_id or f"SPLIT-{p_req.method.upper()}-{order.order_number}-{idx+1}-{uuid.uuid4().hex[:4]}"
        notes = p_req.notes or f"Split payment #{idx+1} ({p_req.method.upper()})"
        if p_req.tendered_paise and p_req.change_returned_paise is not None:
            notes += f" (Tendered: ₹{p_req.tendered_paise/100:.2f}, Change: ₹{p_req.change_returned_paise/100:.2f})"

        payment = Payment(
            order_id=order.id,
            method=p_req.method.lower(),
            txn_id=txn_id,
            amount_paise=p_req.amount_paise,
            status="completed",
            paid_at=datetime.datetime.utcnow(),
            notes=f"{notes} (Collected by {current_user.name})",
        )
        db.add(payment)
        created_payments.append(payment)
        total_split_paise += p_req.amount_paise

    db.flush()

    # Recalculate total paid
    all_payments = db.query(Payment).filter(Payment.order_id == order.id, Payment.status == "completed").all()
    total_paid_paise = sum(p.amount_paise for p in all_payments)
    balance_paise = max(0, order.total_paise - total_paid_paise)

    if total_paid_paise >= order.total_paise:
        order.payment_status = "paid"
        order.payment_method = "split"
    else:
        order.payment_status = "partially_paid"

    log_audit(
        db=db,
        outlet_id=current_user.outlet_id,
        user_id=current_user.id,
        action="split_payment_collected",
        entity_type="payment",
        entity_id=order.id,
        details={
            "order_number": order.order_number,
            "splits_count": len(data.payments),
            "total_split_paise": total_split_paise,
            "total_paid_paise": total_paid_paise,
            "balance_paise": balance_paise,
            "collected_by": current_user.name,
        },
    )

    db.commit()
    db.refresh(order)

    # Broadcast update
    from app.routers.orders import format_order_response
    formatted = format_order_response(order)
    try:
        await manager.broadcast_to_admin(
            outlet_id=order.outlet_id,
            event_type="order_status_updated",
            data=formatted.model_dump(mode="json"),
        )
        await manager.broadcast_to_order(
            order_id=order.id,
            event_type="order_status_updated",
            data=formatted.model_dump(mode="json"),
            outlet_id=order.outlet_id,
        )
    except Exception:
        pass

    return {
        "success": True,
        "message": f"Split payments totaling ₹{total_split_paise/100:.2f} recorded",
        "order_number": order.order_number,
        "splits_count": len(created_payments),
        "total_paid_paise": total_paid_paise,
        "balance_paise": balance_paise,
        "payment_status": order.payment_status,
        "payment_method": order.payment_method,
        "collected_by": current_user.name,
    }


# ==========================================
# PAYMENTS LIST & FILTER (ADMIN)
# ==========================================

@router.get("", response_model=List[PaymentOut])
def list_payments(
    outlet_id: Optional[int] = Query(None, description="Filter by outlet ID"),
    method: Optional[str] = Query(None, description="Filter by method: cash, upi, card"),
    status: Optional[str] = Query(None, description="Filter by status: completed, pending, refunded"),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(require_staff_or_owner),
    db: Session = Depends(get_db),
):
    """List all payment records for accounting and reconciliation."""
    from app.routers.outlets import get_effective_outlet_id
    if current_user.role == "owner" and outlet_id is not None:
        target_outlet_id = get_effective_outlet_id(outlet_id, db)
    else:
        target_outlet_id = get_effective_outlet_id(current_user.outlet_id, db)

    query = (
        db.query(Payment)
        .join(Order, Payment.order_id == Order.id)
        .filter(Order.outlet_id == target_outlet_id)
    )

    if method:
        query = query.filter(Payment.method == method.strip().lower())
    if status:
        query = query.filter(Payment.status == status.strip().lower())

    return query.order_by(Payment.paid_at.desc()).limit(limit).all()
