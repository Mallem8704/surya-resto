from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AuditLog, User
from app.schemas import AuditLogOut
from app.routers.auth import require_staff_or_owner

router = APIRouter(prefix="", tags=["Audit Logs"])


@router.get("", response_model=List[AuditLogOut])
def list_audit_logs(
    outlet_id: Optional[int] = Query(None, description="Filter by outlet ID"),
    limit: int = Query(50, ge=1, le=200),
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    current_user: User = Depends(require_staff_or_owner),
    db: Session = Depends(get_db),
):
    """List audit log ledger entries for staff and owner mutations."""
    from app.routers.outlets import get_effective_outlet_id
    if current_user.role == "owner" and outlet_id is not None:
        target_outlet_id = get_effective_outlet_id(outlet_id, db)
    else:
        target_outlet_id = get_effective_outlet_id(current_user.outlet_id, db)

    query = db.query(AuditLog).filter(AuditLog.outlet_id == target_outlet_id)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    return query.order_by(AuditLog.created_at.desc()).limit(limit).all()
