import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import CashierShift, Order, Payment, AuditLog, User, Outlet
from app.routers.auth import require_staff_or_owner
from app.routers.outlets import get_effective_outlet_id

router = APIRouter(prefix="", tags=["Cashier Shifts & Cash Register"])


class ShiftOpenRequest(BaseModel):
    opening_float_paise: int = 0
    shift_name: str = "Counter Shift"
    notes: Optional[str] = None


class ShiftCloseRequest(BaseModel):
    actual_cash_paise: int
    denominations_json: Optional[str] = None
    closing_notes: Optional[str] = None


@router.get("/current")
def get_current_shift(
    outlet_id: Optional[int] = Query(None),
    current_user: User = Depends(require_staff_or_owner),
    db: Session = Depends(get_db),
):
    """Retrieve currently open cashier shift with real-time live sales reconciliation."""
    target_outlet_id = get_effective_outlet_id(outlet_id or current_user.outlet_id, db)

    shift = (
        db.query(CashierShift)
        .filter(
            CashierShift.outlet_id == target_outlet_id,
            CashierShift.status == "open",
        )
        .order_by(CashierShift.id.desc())
        .first()
    )

    if not shift:
        return {"has_open_shift": False, "shift": None}

    # Calculate live sales from shift.opened_at to now
    orders = (
        db.query(Order)
        .filter(
            Order.outlet_id == target_outlet_id,
            Order.status != "cancelled",
            Order.created_at >= shift.opened_at,
        )
        .all()
    )

    cash_sales_paise = 0
    upi_sales_paise = 0
    card_sales_paise = 0
    total_orders = len(orders)

    for o in orders:
        method = (o.payment_method or "cash").lower()
        if method in ["cash", "counter"]:
            cash_sales_paise += o.total_paise
        elif method in ["upi", "online", "razorpay"]:
            upi_sales_paise += o.total_paise
        elif method == "card":
            card_sales_paise += o.total_paise
        else:
            cash_sales_paise += o.total_paise

    petty_cash_in = shift.petty_cash_in_paise or 0
    petty_cash_out = shift.petty_cash_out_paise or 0
    opening_float = shift.opening_float_paise or 0
    expected_cash_paise = opening_float + cash_sales_paise + petty_cash_in - petty_cash_out

    return {
        "has_open_shift": True,
        "shift": {
            "id": shift.id,
            "outlet_id": shift.outlet_id,
            "cashier_id": shift.cashier_id,
            "cashier_name": shift.cashier_name,
            "shift_name": shift.shift_name,
            "status": shift.status,
            "opened_at": shift.opened_at.isoformat() if shift.opened_at else None,
            "opening_float_paise": opening_float,
            "opening_float_rupees": round(opening_float / 100.0, 2),
            "cash_sales_paise": cash_sales_paise,
            "cash_sales_rupees": round(cash_sales_paise / 100.0, 2),
            "upi_sales_paise": upi_sales_paise,
            "upi_sales_rupees": round(upi_sales_paise / 100.0, 2),
            "card_sales_paise": card_sales_paise,
            "card_sales_rupees": round(card_sales_paise / 100.0, 2),
            "petty_cash_in_paise": petty_cash_in,
            "petty_cash_in_rupees": round(petty_cash_in / 100.0, 2),
            "petty_cash_out_paise": petty_cash_out,
            "petty_cash_out_rupees": round(petty_cash_out / 100.0, 2),
            "expected_cash_paise": expected_cash_paise,
            "expected_cash_rupees": round(expected_cash_paise / 100.0, 2),
            "total_orders_count": total_orders,
        }
    }


@router.post("/open")
def open_cashier_shift(
    req: ShiftOpenRequest,
    outlet_id: Optional[int] = Query(None),
    current_user: User = Depends(require_staff_or_owner),
    db: Session = Depends(get_db),
):
    """Open a new cashier shift with starting drawer float."""
    target_outlet_id = get_effective_outlet_id(outlet_id or current_user.outlet_id, db)

    # Check if there's already an open shift
    existing = (
        db.query(CashierShift)
        .filter(
            CashierShift.outlet_id == target_outlet_id,
            CashierShift.status == "open",
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Shift #{existing.id} ({existing.shift_name}) is already open. Please close it first before opening a new shift.",
        )

    shift = CashierShift(
        outlet_id=target_outlet_id,
        cashier_id=current_user.id,
        cashier_name=current_user.name or "Cashier",
        shift_name=req.shift_name,
        status="open",
        opened_at=datetime.datetime.utcnow(),
        opening_float_paise=req.opening_float_paise,
        closing_notes=req.notes,
    )
    db.add(shift)
    db.commit()
    db.refresh(shift)

    # Log to audit
    audit = AuditLog(
        outlet_id=target_outlet_id,
        user_id=current_user.id,
        action="shift_opened",
        entity_type="cashier_shift",
        entity_id=shift.id,
        details=f"Shift #{shift.id} opened with ₹{round(req.opening_float_paise / 100.0, 2)} float by {current_user.name}",
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": f"Shift #{shift.id} ({shift.shift_name}) opened successfully",
        "shift_id": shift.id,
        "opening_float_rupees": round(shift.opening_float_paise / 100.0, 2),
    }


@router.post("/{shift_id}/close")
def close_cashier_shift(
    shift_id: int,
    req: ShiftCloseRequest,
    current_user: User = Depends(require_staff_or_owner),
    db: Session = Depends(get_db),
):
    """Close cashier shift, calculate drawer match/shortage/overage, and finalize handover."""
    shift = db.query(CashierShift).filter(CashierShift.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    if shift.status == "closed":
        raise HTTPException(status_code=400, detail="Shift is already closed")

    # Compute final sales from opened_at to now
    orders = (
        db.query(Order)
        .filter(
            Order.outlet_id == shift.outlet_id,
            Order.status != "cancelled",
            Order.created_at >= shift.opened_at,
        )
        .all()
    )

    cash_sales = 0
    upi_sales = 0
    card_sales = 0
    for o in orders:
        method = (o.payment_method or "cash").lower()
        if method in ["cash", "counter"]:
            cash_sales += o.total_paise
        elif method in ["upi", "online", "razorpay"]:
            upi_sales += o.total_paise
        elif method == "card":
            card_sales += o.total_paise
        else:
            cash_sales += o.total_paise

    petty_in = shift.petty_cash_in_paise or 0
    petty_out = shift.petty_cash_out_paise or 0
    expected_cash = (shift.opening_float_paise or 0) + cash_sales + petty_in - petty_out
    actual_cash = req.actual_cash_paise
    diff_paise = actual_cash - expected_cash

    now = datetime.datetime.utcnow()
    shift.status = "closed"
    shift.closed_at = now
    shift.cash_sales_paise = cash_sales
    shift.upi_sales_paise = upi_sales
    shift.card_sales_paise = card_sales
    shift.expected_cash_paise = expected_cash
    shift.actual_cash_paise = actual_cash
    shift.difference_paise = diff_paise
    shift.denominations_json = req.denominations_json
    if req.closing_notes:
        shift.closing_notes = (shift.closing_notes or "") + " | " + req.closing_notes

    db.commit()

    # Log to audit
    diff_rs = round(diff_paise / 100.0, 2)
    status_label = "EXACT MATCH" if diff_paise == 0 else f"OVERAGE +₹{diff_rs}" if diff_paise > 0 else f"SHORTAGE -₹{abs(diff_rs)}"
    audit = AuditLog(
        outlet_id=shift.outlet_id,
        user_id=current_user.id,
        action="shift_closed",
        entity_type="cashier_shift",
        entity_id=shift.id,
        details=f"Shift #{shift.id} closed. Expected ₹{round(expected_cash/100,2)}, Counted ₹{round(actual_cash/100,2)} ({status_label})",
    )
    db.add(audit)
    db.commit()

    outlet = db.query(Outlet).filter(Outlet.id == shift.outlet_id).first()

    return {
        "success": True,
        "message": f"Shift #{shift.id} closed successfully ({status_label})",
        "handover_report": {
            "shift_id": shift.id,
            "shift_name": shift.shift_name,
            "cashier_name": shift.cashier_name,
            "outlet_name": outlet.name if outlet else "Surya Family Restaurant",
            "opened_at": shift.opened_at.isoformat() if shift.opened_at else None,
            "closed_at": shift.closed_at.isoformat() if shift.closed_at else None,
            "opening_float_rupees": round(shift.opening_float_paise / 100.0, 2),
            "cash_sales_rupees": round(cash_sales / 100.0, 2),
            "upi_sales_rupees": round(upi_sales / 100.0, 2),
            "card_sales_rupees": round(card_sales / 100.0, 2),
            "total_sales_rupees": round((cash_sales + upi_sales + card_sales) / 100.0, 2),
            "petty_cash_in_rupees": round(petty_in / 100.0, 2),
            "petty_cash_out_rupees": round(petty_out / 100.0, 2),
            "expected_cash_rupees": round(expected_cash / 100.0, 2),
            "actual_cash_rupees": round(actual_cash / 100.0, 2),
            "difference_rupees": diff_rs,
            "status_label": status_label,
            "total_orders_count": len(orders),
            "notes": shift.closing_notes,
        }
    }


@router.get("/")
def list_past_shifts(
    limit: int = Query(20, ge=1, le=100),
    outlet_id: Optional[int] = Query(None),
    current_user: User = Depends(require_staff_or_owner),
    db: Session = Depends(get_db),
):
    """List historical shifts and handovers."""
    target_outlet_id = get_effective_outlet_id(outlet_id or current_user.outlet_id, db)

    shifts = (
        db.query(CashierShift)
        .filter(CashierShift.outlet_id == target_outlet_id)
        .order_by(CashierShift.id.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "id": s.id,
            "shift_name": s.shift_name,
            "cashier_name": s.cashier_name,
            "status": s.status,
            "opened_at": s.opened_at.isoformat() if s.opened_at else None,
            "closed_at": s.closed_at.isoformat() if s.closed_at else None,
            "opening_float_rupees": round(s.opening_float_paise / 100.0, 2),
            "cash_sales_rupees": round(s.cash_sales_paise / 100.0, 2),
            "upi_sales_rupees": round(s.upi_sales_paise / 100.0, 2),
            "expected_cash_rupees": round(s.expected_cash_paise / 100.0, 2),
            "actual_cash_rupees": round((s.actual_cash_paise or 0) / 100.0, 2) if s.actual_cash_paise is not None else None,
            "difference_rupees": round((s.difference_paise or 0) / 100.0, 2) if s.difference_paise is not None else None,
        }
        for s in shifts
    ]
