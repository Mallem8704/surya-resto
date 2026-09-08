import io
import os
import urllib.parse
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
import qrcode

import datetime
import uuid
from app.database import get_db
from app.models import CafeTable, ServiceCall, Order, User, Outlet, Payment
from app.schemas import (
    TableCreate,
    TableUpdate,
    TableStatusUpdate,
    TableOut,
    ServiceCallCreate,
    ServiceCallOut,
    RecordPaymentRequest,
    SplitPaymentRequest,
)
from app.routers.auth import get_current_user, get_current_user_optional, require_owner, require_staff_or_owner
from app.audit_utils import log_audit
from app.routers.ws import manager
from app.routers.outlets import get_effective_outlet_id

router = APIRouter(prefix="", tags=["Tables & QR"])

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
VALID_TABLE_STATUSES = {"free", "occupied", "reserved"}


# ==========================================
# TABLE CRUD
# ==========================================

@router.get("", response_model=List[TableOut])
def list_tables(
    outlet_id: Optional[int] = Query(None, description="Outlet ID"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """List all cafe tables with status and QR link."""
    if outlet_id is not None:
        target_id = get_effective_outlet_id(outlet_id, db)
    elif current_user is not None:
        target_id = current_user.outlet_id
    else:
        target_id = get_effective_outlet_id(None, db)

    return (
        db.query(CafeTable)
        .filter(CafeTable.outlet_id == target_id)
        .order_by(CafeTable.id.asc())
        .all()
    )


@router.get("/{table_id}", response_model=TableOut)
def get_table(table_id: int, db: Session = Depends(get_db)):
    """Fetch single table by ID."""
    table = db.query(CafeTable).filter(CafeTable.id == table_id).first()
    if not table:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Table with ID {table_id} not found",
        )
    return table


@router.post("", response_model=TableOut, status_code=status.HTTP_201_CREATED)
async def create_table(
    data: TableCreate,
    current_user: User = Depends(require_staff_or_owner),
    db: Session = Depends(get_db),
):
    """Create a new cafe table and generate its QR target URL."""
    label_clean = data.label.strip()
    if not label_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Table label cannot be empty",
        )

    # Check for duplicate label in same outlet (case-insensitive)
    existing = (
        db.query(CafeTable)
        .filter(
            CafeTable.outlet_id == current_user.outlet_id,
            func.lower(CafeTable.label) == label_clean.lower(),
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Table '{label_clean}' already exists in this outlet",
        )

    encoded_label = urllib.parse.quote(label_clean)
    qr_url = f"{FRONTEND_URL}/order?branch={current_user.outlet_id}&table={encoded_label}"
    new_table = CafeTable(
        outlet_id=current_user.outlet_id,
        label=label_clean,
        qr_code_url=qr_url,
        status="free",
    )
    db.add(new_table)
    db.flush()

    log_audit(
        db=db,
        outlet_id=current_user.outlet_id,
        user_id=current_user.id,
        action="create_table",
        entity_type="table",
        entity_id=new_table.id,
        details={"label": new_table.label, "qr_url": qr_url},
    )
    db.commit()
    db.refresh(new_table)

    # Broadcast real-time update to connected admin dashboards
    try:
        await manager.broadcast_to_admin(
            outlet_id=current_user.outlet_id,
            event_type="table_created",
            data={
                "id": new_table.id,
                "label": new_table.label,
                "status": new_table.status,
                "qr_code_url": new_table.qr_code_url,
            },
        )
    except Exception:
        pass

    return new_table


@router.put("/{table_id}", response_model=TableOut)
async def update_table(
    table_id: int,
    data: TableUpdate,
    current_user: User = Depends(require_staff_or_owner),
    db: Session = Depends(get_db),
):
    """Update table label or status."""
    table = db.query(CafeTable).filter(CafeTable.id == table_id, CafeTable.outlet_id == current_user.outlet_id).first()
    if not table:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Table with ID {table_id} not found",
        )

    if data.label is not None:
        label_clean = data.label.strip()
        if not label_clean:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Table label cannot be empty",
            )
        # Duplicate label check
        existing = (
            db.query(CafeTable)
            .filter(
                CafeTable.outlet_id == current_user.outlet_id,
                func.lower(CafeTable.label) == label_clean.lower(),
                CafeTable.id != table_id,
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Table '{label_clean}' already exists in this outlet",
            )
        table.label = label_clean
        encoded_label = urllib.parse.quote(label_clean)
        table.qr_code_url = f"{FRONTEND_URL}/order?table={encoded_label}"

    if data.status is not None:
        status_clean = data.status.strip().lower()
        if status_clean not in VALID_TABLE_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status '{data.status}'. Must be one of: free, occupied, reserved",
            )
        table.status = status_clean
        if status_clean == "free":
            table.active_order_id = None

    if data.qr_code_url is not None:
        table.qr_code_url = data.qr_code_url

    log_audit(
        db=db,
        outlet_id=current_user.outlet_id,
        user_id=current_user.id,
        action="update_table",
        entity_type="table",
        entity_id=table.id,
        details={"label": table.label, "status": table.status},
    )
    db.commit()
    db.refresh(table)

    try:
        await manager.broadcast_to_admin(
            outlet_id=current_user.outlet_id,
            event_type="table_updated",
            data={
                "id": table.id,
                "label": table.label,
                "status": table.status,
                "active_order_id": table.active_order_id,
            },
        )
    except Exception:
        pass

    return table


@router.patch("/{table_id}/status", response_model=TableOut)
async def update_table_status(
    table_id: int,
    data: TableStatusUpdate,
    current_user: User = Depends(require_staff_or_owner),
    db: Session = Depends(get_db),
):
    """Toggle table occupancy status (free, occupied, reserved)."""
    table = db.query(CafeTable).filter(CafeTable.id == table_id, CafeTable.outlet_id == current_user.outlet_id).first()
    if not table:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Table with ID {table_id} not found",
        )

    status_clean = data.status.strip().lower()
    if status_clean not in VALID_TABLE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status '{data.status}'. Must be one of: free, occupied, reserved",
        )

    old_status = table.status
    table.status = status_clean
    if status_clean == "free":
        table.active_order_id = None

    log_audit(
        db=db,
        outlet_id=current_user.outlet_id,
        user_id=current_user.id,
        action="table_status_change",
        entity_type="table",
        entity_id=table.id,
        details={"label": table.label, "old_status": old_status, "new_status": status_clean},
    )
    db.commit()
    db.refresh(table)

    try:
        await manager.broadcast_to_admin(
            outlet_id=current_user.outlet_id,
            event_type="table_updated",
            data={
                "id": table.id,
                "label": table.label,
                "status": table.status,
                "active_order_id": table.active_order_id,
            },
        )
    except Exception:
        pass

    return table


@router.delete("/{table_id}", status_code=status.HTTP_200_OK)
async def delete_table(
    table_id: int,
    current_user: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    """Delete a table (Owner only)."""
    table = db.query(CafeTable).filter(CafeTable.id == table_id, CafeTable.outlet_id == current_user.outlet_id).first()
    if not table:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Table with ID {table_id} not found",
        )

    # Check for active in-progress orders
    active_orders = (
        db.query(Order)
        .filter(
            Order.table_id == table_id,
            Order.status.in_(["placed", "accepted", "preparing", "ready"]),
        )
        .count()
    )
    if active_orders > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete table '{table.label}' because it has {active_orders} active order(s). Please complete or cancel them first.",
        )

    # Nullify historical orders referencing this table
    db.query(Order).filter(Order.table_id == table_id).update({"table_id": None})
    # Remove service calls for this table
    db.query(ServiceCall).filter(ServiceCall.table_id == table_id).delete()

    label = table.label
    db.delete(table)

    log_audit(
        db=db,
        outlet_id=current_user.outlet_id,
        user_id=current_user.id,
        action="delete_table",
        entity_type="table",
        entity_id=table_id,
        details={"label": label},
    )
    db.commit()

    try:
        await manager.broadcast_to_admin(
            outlet_id=current_user.outlet_id,
            event_type="table_deleted",
            data={"id": table_id, "label": label},
        )
    except Exception:
        pass

    return {"message": f"Table '{label}' successfully deleted"}


# ==========================================
# QR CODE GENERATION ENDPOINT
# ==========================================

@router.get("/{table_id}/qr")
def generate_table_qr(
    table_id: int,
    frontend_url: Optional[str] = Query(None, description="Optional frontend origin override for QR target"),
    db: Session = Depends(get_db),
):
    """Generate high-resolution PNG QR Code for table encoding /order?table=<label>."""
    table = db.query(CafeTable).filter(CafeTable.id == table_id).first()
    if not table:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Table with ID {table_id} not found",
        )

    # Resolve target URL dynamically based on frontend caller origin or production domain
    if frontend_url and frontend_url.startswith("http"):
        base_origin = frontend_url.rstrip("/")
        target_url = f"{base_origin}/order?branch={table.outlet_id}&table={table.label}"
    else:
        configured_origin = FRONTEND_URL.split(",")[0].strip().rstrip("/")
        if table.qr_code_url and not table.qr_code_url.startswith("http://localhost"):
            target_url = table.qr_code_url
        else:
            target_url = f"{configured_origin}/order?branch={table.outlet_id}&table={table.label}"

    # Generate QR Code image with cafe brand colors (crisp 15 box size)
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=15,
        border=3,
    )
    qr.add_data(target_url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="#1a0f0a", back_color="#ffffff")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    return Response(
        content=buf.getvalue(),
        media_type="image/png",
        headers={
            "Content-Disposition": f'inline; filename="qr_table_{table.label}.png"',
            "X-Target-Url": target_url,
        },
    )


# ==========================================
# CUSTOMER SERVICE CALLS (WAITER, WATER, BILL)
# ==========================================

@router.post("/{table_id}/call", response_model=ServiceCallOut, status_code=status.HTTP_201_CREATED)
async def request_table_service(
    table_id: int,
    data: ServiceCallCreate,
    db: Session = Depends(get_db),
):
    """Customer buzzer endpoint to request waiter, water, or bill from table."""
    table = db.query(CafeTable).filter(CafeTable.id == table_id).first()
    if not table:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Table with ID {table_id} not found",
        )

    # Check for existing pending call of same type to prevent spam
    existing_call = (
        db.query(ServiceCall)
        .filter(
            ServiceCall.table_id == table_id,
            ServiceCall.call_type == data.call_type,
            ServiceCall.status == "pending",
        )
        .first()
    )
    if existing_call:
        return ServiceCallOut(
            id=existing_call.id,
            outlet_id=existing_call.outlet_id,
            table_id=existing_call.table_id,
            table_label=table.label,
            call_type=existing_call.call_type,
            status=existing_call.status,
            created_at=existing_call.created_at,
        )

    service_call = ServiceCall(
        outlet_id=table.outlet_id,
        table_id=table_id,
        call_type=data.call_type,
        status="pending",
    )
    db.add(service_call)
    db.commit()
    db.refresh(service_call)

    # Broadcast buzzer event to Admin/Staff dashboard in real-time
    await manager.broadcast_service_call(
        outlet_id=table.outlet_id,
        data={
            "id": service_call.id,
            "table_id": table_id,
            "table_label": table.label,
            "call_type": service_call.call_type,
            "created_at": service_call.created_at.isoformat(),
        },
    )

    return ServiceCallOut(
        id=service_call.id,
        outlet_id=service_call.outlet_id,
        table_id=service_call.table_id,
        table_label=table.label,
        call_type=service_call.call_type,
        status=service_call.status,
        created_at=service_call.created_at,
    )


@router.get("/service-calls/active", response_model=List[ServiceCallOut])
def get_active_service_calls(
    current_user: User = Depends(require_staff_or_owner),
    db: Session = Depends(get_db),
):
    """Fetch pending service calls for staff notification bar."""
    calls = (
        db.query(ServiceCall)
        .options(joinedload(ServiceCall.table))
        .filter(ServiceCall.outlet_id == current_user.outlet_id, ServiceCall.status == "pending")
        .order_by(ServiceCall.created_at.desc())
        .all()
    )
    return [
        ServiceCallOut(
            id=c.id,
            outlet_id=c.outlet_id,
            table_id=c.table_id,
            table_label=c.table.label if c.table else f"T{c.table_id}",
            call_type=c.call_type,
            status=c.status,
            created_at=c.created_at,
        )
        for c in calls
    ]


@router.patch("/service-calls/{call_id}/attend", response_model=ServiceCallOut)
async def attend_service_call(
    call_id: int,
    current_user: User = Depends(require_staff_or_owner),
    db: Session = Depends(get_db),
):
    """Mark a service call as attended by staff."""
    call = (
        db.query(ServiceCall)
        .options(joinedload(ServiceCall.table))
        .filter(ServiceCall.id == call_id, ServiceCall.outlet_id == current_user.outlet_id)
        .first()
    )
    if not call:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Service call with ID {call_id} not found",
        )

    call.status = "attended"
    db.commit()
    db.refresh(call)

    try:
        await manager.broadcast_to_admin(
            outlet_id=call.outlet_id,
            event_type="service_call_attended",
            data={"id": call.id},
        )
    except Exception:
        pass

    return ServiceCallOut(
        id=call.id,
        outlet_id=call.outlet_id,
        table_id=call.table_id,
        table_label=call.table.label if call.table else f"T{call.table_id}",
        call_type=call.call_type,
        status=call.status,
        created_at=call.created_at,
    )


# ==========================================
# TABLE-SIDE ACTIVE ORDER & SETTLE / FREE
# ==========================================

@router.get("/{table_id}/active-order")
def get_table_active_order(
    table_id: int,
    db: Session = Depends(get_db),
):
    """Fetch active dining order on a table (items, financial totals, dynamic UPI URI)."""
    table = db.query(CafeTable).filter(CafeTable.id == table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail=f"Table #{table_id} not found")

    # If table is marked free and has no active order ID, return false immediately
    if table.status == "free" and not table.active_order_id:
        return {"has_active_order": False, "table": {"id": table.id, "label": table.label, "status": table.status}}

    order = None
    if table.active_order_id:
        order = (
            db.query(Order)
            .options(joinedload(Order.items), joinedload(Order.table))
            .filter(Order.id == table.active_order_id)
            .first()
        )

    if not order:
        order = (
            db.query(Order)
            .options(joinedload(Order.items), joinedload(Order.table))
            .filter(
                Order.table_id == table_id,
                Order.status.in_(["placed", "accepted", "preparing", "ready"]),
                Order.payment_status != "paid",
            )
            .order_by(Order.created_at.desc())
            .first()
        )

    if not order or order.payment_status == "paid":
        return {"has_active_order": False, "table": {"id": table.id, "label": table.label, "status": table.status}}

    outlet = db.query(Outlet).filter(Outlet.id == order.outlet_id).first()
    outlet_name = outlet.name if outlet else "Surya Family Restaurant"
    upi_vpa = (outlet.upi_vpa if outlet and outlet.upi_vpa else "9880358634@upi").strip()

    # Calculate balance
    paid_paise = sum(
        p.amount_paise for p in db.query(Payment).filter(
            Payment.order_id == order.id,
            Payment.status == "completed"
        ).all()
    )
    balance_paise = max(0, order.total_paise - paid_paise)
    amount_rs = round(balance_paise / 100.0, 2)

    encoded_name = urllib.parse.quote(outlet_name.replace("&", "and"))
    clean_note = f"Table {table.label} Bill {order.order_number}".replace("_", " ")
    encoded_note = urllib.parse.quote(clean_note)
    upi_uri = f"upi://pay?pa={upi_vpa}&pn={encoded_name}&am={amount_rs:.2f}&tn={encoded_note}&cu=INR"

    from app.routers.orders import format_order_response
    formatted_order = format_order_response(order)

    return {
        "has_active_order": True,
        "table": {"id": table.id, "label": table.label, "status": table.status},
        "order": formatted_order,
        "dynamic_upi": {
            "upi_uri": upi_uri,
            "amount_paise": balance_paise,
            "amount_rs": amount_rs,
            "upi_vpa": upi_vpa,
            "outlet_name": outlet_name,
        }
    }


@router.post("/{table_id}/settle-and-free")
async def settle_and_free_table(
    table_id: int,
    payment_data: Optional[RecordPaymentRequest] = None,
    current_user: User = Depends(require_staff_or_owner),
    db: Session = Depends(get_db),
):
    """Settle table bill and immediately free up table for next guests (turnaround)."""
    table = db.query(CafeTable).filter(CafeTable.id == table_id, CafeTable.outlet_id == current_user.outlet_id).first()
    if not table:
        raise HTTPException(status_code=404, detail=f"Table #{table_id} not found")

    order = (
        db.query(Order)
        .options(joinedload(Order.items), joinedload(Order.table))
        .filter(
            Order.table_id == table_id,
            Order.outlet_id == current_user.outlet_id,
            Order.status != "cancelled",
        )
        .order_by(Order.created_at.desc())
        .first()
    )

    settled_amount_paise = 0
    if order and order.payment_status != "paid":
        method = payment_data.method.lower() if payment_data else "cash"
        amount_paise = payment_data.amount_paise if payment_data else order.total_paise
        settled_amount_paise = amount_paise

        txn_id = (payment_data.txn_id if payment_data and payment_data.txn_id else f"SETTLE-{method.upper()}-{order.order_number}-{uuid.uuid4().hex[:6]}")
        notes = (payment_data.notes if payment_data and payment_data.notes else f"Table {table.label} settled at table by {current_user.name}")
        if payment_data and payment_data.tendered_paise and payment_data.change_returned_paise is not None:
            notes += f" (Tendered: ₹{payment_data.tendered_paise/100:.2f}, Change: ₹{payment_data.change_returned_paise/100:.2f})"

        payment = Payment(
            order_id=order.id,
            method=method,
            txn_id=txn_id,
            amount_paise=amount_paise,
            status="completed",
            paid_at=datetime.datetime.utcnow(),
            notes=notes,
        )
        db.add(payment)

        order.payment_status = "paid"
        order.payment_method = method
        if order.status in ("placed", "accepted", "preparing", "ready"):
            order.status = "served"

    # Free up table & clear active service calls
    table.status = "free"
    table.active_order_id = None

    pending_calls = db.query(ServiceCall).filter(ServiceCall.table_id == table_id, ServiceCall.status == "pending").all()
    for pc in pending_calls:
        pc.status = "attended"

    log_audit(
        db=db,
        outlet_id=current_user.outlet_id,
        user_id=current_user.id,
        action="table_settled_and_freed",
        entity_type="table",
        entity_id=table.id,
        details={
            "table_label": table.label,
            "order_number": order.order_number if order else None,
            "amount_paise": settled_amount_paise,
            "amount_formatted": f"₹{settled_amount_paise/100:.2f}",
            "settled_by": current_user.name,
        },
    )

    db.commit()
    db.refresh(table)
    if order:
        db.refresh(order)

    # Real-time WebSocket Broadcasts
    try:
        await manager.broadcast_to_admin(
            outlet_id=current_user.outlet_id,
            event_type="table_updated",
            data={"id": table.id, "label": table.label, "status": "free", "active_order_id": None},
        )
        if order:
            from app.routers.orders import format_order_response
            formatted = format_order_response(order)
            await manager.broadcast_to_order(
                order_id=order.id,
                event_type="order_status_updated",
                data=formatted.model_dump(mode="json"),
                outlet_id=order.outlet_id,
            )
            await manager.broadcast_to_admin(
                outlet_id=order.outlet_id,
                event_type="order_status_updated",
                data=formatted.model_dump(mode="json"),
            )
    except Exception:
        pass

    return {
        "success": True,
        "message": f"Table {table.label} settled and freed successfully",
        "table_id": table.id,
        "table_label": table.label,
        "table_status": "free",
        "order_number": order.order_number if order else None,
        "payment_status": "paid" if order else None,
    }
