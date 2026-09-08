from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import MenuItem, StockLog, User
from app.schemas import StockAdjustmentCreate, StockLogOut, StockItemOverview, MenuItemOut
from app.routers.auth import require_staff_or_owner
from app.audit_utils import log_audit

router = APIRouter(prefix="", tags=["Inventory & Stock"])


@router.get("", response_model=List[StockItemOverview])
def get_stock_overview(
    outlet_id: Optional[int] = Query(None, description="Filter by outlet ID"),
    current_user: User = Depends(require_staff_or_owner),
    db: Session = Depends(get_db),
):
    """Retrieve full inventory status overview across all menu items."""
    from app.routers.outlets import get_effective_outlet_id
    if current_user.role == "owner" and outlet_id is not None:
        target_outlet_id = get_effective_outlet_id(outlet_id, db)
    else:
        target_outlet_id = get_effective_outlet_id(current_user.outlet_id, db)

    items = (
        db.query(MenuItem)
        .options(joinedload(MenuItem.category))
        .filter(MenuItem.outlet_id == target_outlet_id)
        .order_by(MenuItem.category_id.asc(), MenuItem.id.asc())
        .all()
    )

    overview_list = []
    for it in items:
        if it.stock_qty <= 0:
            stock_status = "out_of_stock"
        elif it.track_stock and it.stock_qty <= it.low_stock_threshold:
            stock_status = "low_stock"
        else:
            stock_status = "in_stock"

        overview_list.append(
            StockItemOverview(
                id=it.id,
                name=it.name,
                name_te=it.name_te,
                category_name=it.category.name if it.category else "Uncategorized",
                price_paise=it.price_paise,
                stock_qty=it.stock_qty,
                track_stock=it.track_stock,
                low_stock_threshold=it.low_stock_threshold,
                is_available=it.is_available,
                status=stock_status,
            )
        )
    return overview_list


@router.get("/low", response_model=List[StockItemOverview])
def get_low_stock_items(
    outlet_id: Optional[int] = Query(None, description="Filter by outlet ID"),
    current_user: User = Depends(require_staff_or_owner),
    db: Session = Depends(get_db),
):
    """Retrieve list of items that have fallen below their low-stock threshold."""
    from app.routers.outlets import get_effective_outlet_id
    if current_user.role == "owner" and outlet_id is not None:
        target_outlet_id = get_effective_outlet_id(outlet_id, db)
    else:
        target_outlet_id = get_effective_outlet_id(current_user.outlet_id, db)

    items = (
        db.query(MenuItem)
        .options(joinedload(MenuItem.category))
        .filter(
            MenuItem.outlet_id == target_outlet_id,
            MenuItem.track_stock == True,
            MenuItem.stock_qty <= MenuItem.low_stock_threshold,
        )
        .order_by(MenuItem.stock_qty.asc())
        .all()
    )

    return [
        StockItemOverview(
            id=it.id,
            name=it.name,
            name_te=it.name_te,
            category_name=it.category.name if it.category else "Uncategorized",
            price_paise=it.price_paise,
            stock_qty=it.stock_qty,
            track_stock=it.track_stock,
            low_stock_threshold=it.low_stock_threshold,
            is_available=it.is_available,
            status="out_of_stock" if it.stock_qty <= 0 else "low_stock",
        )
        for it in items
    ]


@router.get("/logs", response_model=List[StockLogOut])
def get_stock_logs(
    item_id: Optional[int] = Query(None, description="Filter by menu item ID"),
    reason: Optional[str] = Query(None, description="Filter by reason: restock/sale/wastage/adjustment"),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(require_staff_or_owner),
    db: Session = Depends(get_db),
):
    """Retrieve transaction history of all stock movements (sales, restocks, wastage)."""
    query = (
        db.query(StockLog)
        .options(joinedload(StockLog.item))
        .filter(StockLog.outlet_id == current_user.outlet_id)
    )

    if item_id is not None:
        query = query.filter(StockLog.item_id == item_id)

    if reason:
        query = query.filter(StockLog.reason == reason.strip().lower())

    logs = query.order_by(StockLog.created_at.desc()).limit(limit).all()

    return [
        StockLogOut(
            id=log.id,
            outlet_id=log.outlet_id,
            item_id=log.item_id,
            item_name=log.item.name if log.item else f"Item #{log.item_id}",
            change_qty=log.change_qty,
            reason=log.reason,
            staff_id=log.staff_id,
            notes=log.notes,
            created_at=log.created_at,
        )
        for log in logs
    ]


@router.post("/adjust", response_model=MenuItemOut)
@router.post("/restock", response_model=MenuItemOut)
def adjust_stock_manual(
    data: StockAdjustmentCreate,
    current_user: User = Depends(require_staff_or_owner),
    db: Session = Depends(get_db),
):
    """Record manual restock, wastage, or adjustment for an item."""
    item = db.query(MenuItem).filter(MenuItem.id == data.item_id, MenuItem.outlet_id == current_user.outlet_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Menu item with ID {data.item_id} not found",
        )

    old_stock = item.stock_qty
    new_stock = max(0, old_stock + data.change_qty)
    item.stock_qty = new_stock
    item.track_stock = True

    # Record StockLog
    stock_log = StockLog(
        outlet_id=current_user.outlet_id,
        item_id=item.id,
        change_qty=data.change_qty,
        reason=data.reason.strip().lower(),
        staff_id=current_user.id,
        notes=data.notes,
    )
    db.add(stock_log)

    log_audit(
        db=db,
        outlet_id=current_user.outlet_id,
        user_id=current_user.id,
        action="manual_stock_adjustment",
        entity_type="menu_item",
        entity_id=item.id,
        details={
            "item_name": item.name,
            "change_qty": data.change_qty,
            "old_stock": old_stock,
            "new_stock": new_stock,
            "reason": data.reason,
            "notes": data.notes,
            "staff_name": current_user.name,
        },
    )

    db.commit()
    db.refresh(item)
    return item
