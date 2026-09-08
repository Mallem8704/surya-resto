import json
from typing import Optional, Any, Dict
from sqlalchemy.orm import Session
from app.models import AuditLog


def log_audit(
    db: Session,
    outlet_id: int,
    user_id: Optional[int],
    action: str,
    entity_type: str,
    entity_id: Optional[int] = None,
    details: Optional[Dict[str, Any]] = None,
) -> AuditLog:
    """Create an audit log entry for staff and owner mutations."""
    details_str = json.dumps(details, default=str) if details else None
    audit_entry = AuditLog(
        outlet_id=outlet_id,
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details_json=details_str,
    )
    db.add(audit_entry)
    db.flush()
    return audit_entry
