from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import ServiceCall, CafeTable, User
from app.schemas import ServiceCallCreate, ServiceCallOut
from app.routers.auth import require_staff_or_owner
from app.routers.ws import manager

router = APIRouter(prefix="", tags=["Service Calls & Waiter Requests"])


@router.post("", response_model=ServiceCallOut, status_code=status.HTTP_201_CREATED)
async def create_service_call(
    data: ServiceCallCreate,
    db: Session = Depends(get_db),
):
    """Customer endpoint to request assistance (waiter, bill, water, clean)."""
    if not data.table_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="table_id is required",
        )

    table = db.query(CafeTable).filter(CafeTable.id == data.table_id).first()
    if not table:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Table with ID {data.table_id} not found",
        )

    service_call = ServiceCall(
        outlet_id=table.outlet_id,
        table_id=table.id,
        call_type=data.call_type.strip().lower(),
        status="pending",
    )
    db.add(service_call)
    db.commit()
    db.refresh(service_call)

    # Broadcast live alert to admin dashboards
    await manager.broadcast_service_call(
        outlet_id=table.outlet_id,
        data={
            "id": service_call.id,
            "table_id": table.id,
            "table_label": table.label,
            "call_type": service_call.call_type,
            "status": service_call.status,
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


@router.get("", response_model=List[ServiceCallOut])
def list_service_calls(
    outlet_id: Optional[int] = Query(None, description="Filter by outlet ID"),
    status: Optional[str] = Query(None, description="Filter by status: pending, attended"),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_staff_or_owner),
    db: Session = Depends(get_db),
):
    """Admin endpoint to list all service buzzer requests."""
    from app.routers.outlets import get_effective_outlet_id
    if current_user.role == "owner" and outlet_id is not None:
        target_outlet_id = get_effective_outlet_id(outlet_id, db)
    else:
        target_outlet_id = get_effective_outlet_id(current_user.outlet_id, db)

    query = (
        db.query(ServiceCall)
        .options(joinedload(ServiceCall.table))
        .filter(ServiceCall.outlet_id == target_outlet_id)
    )

    if status:
        query = query.filter(ServiceCall.status == status.strip().lower())

    calls = query.order_by(ServiceCall.created_at.desc()).limit(limit).all()

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


@router.patch("/{call_id}/attend", response_model=ServiceCallOut)
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

    # Broadcast to admin sockets to clear alert banner across screens
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
