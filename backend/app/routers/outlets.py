from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import json

from app.database import get_db
from app.models import Outlet, AuditLog, User
from app.schemas import OutletOut, OutletUpdate
from app.routers.auth import get_current_user, require_owner

router = APIRouter()


def get_effective_outlet_id(outlet_id: Optional[int], db: Session) -> int:
    """Resolve logical or physical outlet_id (1 -> branch 1, 2 -> branch 2, or direct database ID)."""
    all_outlets = db.query(Outlet).order_by(Outlet.id.asc()).all()
    if not all_outlets:
        return 1
    if outlet_id is not None:
        for o in all_outlets:
            if o.id == outlet_id:
                return o.id
        if outlet_id == 1:
            return all_outlets[0].id
        if outlet_id == 2 and len(all_outlets) > 1:
            return all_outlets[1].id
    return all_outlets[0].id


@router.get("/sync-phones")
def sync_outlet_phones(db: Session = Depends(get_db)):
    """Sync official branch phone numbers."""
    outlets = db.query(Outlet).order_by(Outlet.id.asc()).all()
    if len(outlets) >= 1:
        outlets[0].phone = "+91 99591 59515"
    if len(outlets) >= 2:
        outlets[1].phone = "+91 95150 51545"
    db.commit()
    return [{"id": o.id, "name": o.name, "phone": o.phone} for o in outlets]


@router.get("", response_model=List[OutletOut])
@router.get("/all", response_model=List[OutletOut])
@router.get("/list", response_model=List[OutletOut])
def list_outlets(db: Session = Depends(get_db)):
    """List all active restaurant branches / outlets."""
    outlets = db.query(Outlet).order_by(Outlet.id.asc()).all()
    return outlets


@router.get("/single", response_model=OutletOut)
def get_single_outlet(outlet_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    """Get single outlet by ID or branch index (with fallback)."""
    target_id = get_effective_outlet_id(outlet_id, db)
    outlet = db.query(Outlet).filter(Outlet.id == target_id).first()
    if not outlet:
        outlet = db.query(Outlet).first()
    if not outlet:
        raise HTTPException(status_code=404, detail="No outlets found")
    return outlet


@router.get("/{outlet_id}", response_model=OutletOut)
def get_outlet_by_id(outlet_id: int, db: Session = Depends(get_db)):
    """Get outlet by ID or branch index."""
    target_id = get_effective_outlet_id(outlet_id, db)
    outlet = db.query(Outlet).filter(Outlet.id == target_id).first()
    if not outlet:
        outlet = db.query(Outlet).first()
    if not outlet:
        raise HTTPException(status_code=404, detail="Outlet not found")
    return outlet


@router.put("", response_model=OutletOut)
@router.put("/{outlet_id}", response_model=OutletOut)
def update_outlet_settings(
    update_data: OutletUpdate,
    outlet_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    target_id = outlet_id or current_user.outlet_id or 1
    outlet = db.query(Outlet).filter(Outlet.id == target_id).first()
    if not outlet:
        outlet = db.query(Outlet).first()
    if not outlet:
        raise HTTPException(status_code=404, detail="Outlet not found")

    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(outlet, key, value)

    # Create audit log
    audit_log = AuditLog(
        outlet_id=outlet.id,
        user_id=current_user.id,
        action="update_settings",
        entity_type="outlet",
        entity_id=outlet.id,
        details_json=json.dumps(update_dict),
    )
    db.add(audit_log)

    db.commit()
    db.refresh(outlet)
    return outlet
