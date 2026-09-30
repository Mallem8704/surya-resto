"""
Hybrid Sync API Endpoints for Surya Family Restaurant Kadiri.
Provides zero-cost synchronization monitoring and manual sync triggers.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.sync_engine import get_sync_status, sync_local_to_cloud
from app.routers.auth import require_staff_or_owner
from app.models import User

router = APIRouter(prefix="", tags=["Hybrid Cloud Sync"])


@router.get("/status")
def get_hybrid_sync_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_owner),
):
    """
    Get live synchronization status between on-premise local database
    and free cloud backup (Supabase / PostgreSQL Free Tier).
    """
    return get_sync_status(db)


@router.post("/trigger")
def trigger_manual_sync(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_owner),
):
    """
    Manually trigger an immediate zero-cost cloud synchronization.
    Pushes pending local orders, payments, and customers to cloud.
    """
    res = sync_local_to_cloud(db)
    if not res.get("success"):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=res.get("error", "Sync to cloud failed. Local orders remain safely buffered on disk.")
        )
    return res
