from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Category, MenuItem, User, Outlet
from app.schemas import CategoryCreate, CategoryUpdate, CategoryOut
from app.routers.auth import get_current_user, get_current_user_optional, require_owner, require_staff_or_owner
from app.audit_utils import log_audit
from app.routers.outlets import get_effective_outlet_id

router = APIRouter(prefix="", tags=["Categories"])


@router.get("", response_model=List[CategoryOut])
def list_categories(
    active_only: bool = Query(True, description="Filter active categories"),
    outlet_id: Optional[int] = Query(None, description="Outlet ID"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """List all categories for customer and admin views."""
    if outlet_id is not None:
        target_id = get_effective_outlet_id(outlet_id, db)
    elif current_user is not None:
        target_id = current_user.outlet_id
    else:
        target_id = get_effective_outlet_id(None, db)

    query = db.query(Category).filter(Category.outlet_id == target_id)
    if active_only:
        query = query.filter(Category.is_active == True)
    return query.order_by(Category.sort_order.asc(), Category.id.asc()).all()


@router.get("/{category_id}", response_model=CategoryOut)
def get_category(
    category_id: int,
    db: Session = Depends(get_db),
):
    """Fetch single category details by ID."""
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category with ID {category_id} not found",
        )
    return cat


@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    data: CategoryCreate,
    current_user: User = Depends(require_staff_or_owner),
    db: Session = Depends(get_db),
):
    """Create a new menu category (Staff or Owner)."""
    new_cat = Category(
        outlet_id=current_user.outlet_id,
        name=data.name.strip(),
        name_te=data.name_te.strip() if data.name_te else None,
        sort_order=data.sort_order,
        is_active=data.is_active,
    )
    db.add(new_cat)
    db.flush()

    log_audit(
        db=db,
        outlet_id=current_user.outlet_id,
        user_id=current_user.id,
        action="create_category",
        entity_type="category",
        entity_id=new_cat.id,
        details={"name": new_cat.name, "name_te": new_cat.name_te},
    )
    db.commit()
    db.refresh(new_cat)
    return new_cat


@router.put("/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: int,
    data: CategoryUpdate,
    current_user: User = Depends(require_staff_or_owner),
    db: Session = Depends(get_db),
):
    """Update category details (Staff or Owner)."""
    cat = db.query(Category).filter(Category.id == category_id, Category.outlet_id == current_user.outlet_id).first()
    if not cat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category with ID {category_id} not found",
        )

    changes = {}
    if data.name is not None and data.name.strip() != cat.name:
        changes["old_name"] = cat.name
        changes["new_name"] = data.name.strip()
        cat.name = data.name.strip()

    if data.name_te is not None:
        cat.name_te = data.name_te.strip() if data.name_te else None

    if data.sort_order is not None:
        cat.sort_order = data.sort_order

    if data.is_active is not None:
        changes["is_active"] = data.is_active
        cat.is_active = data.is_active

    log_audit(
        db=db,
        outlet_id=current_user.outlet_id,
        user_id=current_user.id,
        action="update_category",
        entity_type="category",
        entity_id=cat.id,
        details=changes,
    )
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/{category_id}", status_code=status.HTTP_200_OK)
def delete_category(
    category_id: int,
    current_user: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    """Delete a category (Owner only). Blocked if menu items are linked."""
    cat = db.query(Category).filter(Category.id == category_id, Category.outlet_id == current_user.outlet_id).first()
    if not cat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category with ID {category_id} not found",
        )

    items_count = db.query(MenuItem).filter(MenuItem.category_id == category_id).count()
    if items_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete category with {items_count} associated menu items. Reassign or delete items first.",
        )

    cat_name = cat.name
    db.delete(cat)
    log_audit(
        db=db,
        outlet_id=current_user.outlet_id,
        user_id=current_user.id,
        action="delete_category",
        entity_type="category",
        entity_id=category_id,
        details={"name": cat_name},
    )
    db.commit()
    return {"message": f"Category '{cat_name}' successfully deleted"}
