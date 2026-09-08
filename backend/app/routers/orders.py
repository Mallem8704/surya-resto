import datetime
import json
import random
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Order, OrderItem, MenuItem, MenuItemVariant, MenuItemAddon, CafeTable, Outlet, StockLog, User, Coupon
from app.schemas import OrderCreate, OrderStatusUpdate, OrderAppendItems, OrderTransferTable, OrderOut, OrderItemOut
from app.routers.auth import require_staff_or_owner, get_current_user_optional
from app.routers.ws import manager
from app.audit_utils import log_audit
from app.routers.outlets import get_effective_outlet_id
from app.rate_limiter import order_creation_limiter

router = APIRouter(prefix="", tags=["Orders"])

VALID_STATUSES = ["placed", "accepted", "preparing", "ready", "out_for_delivery", "delivered", "served", "cancelled"]


def generate_order_number():
    """Generate a unique order number with retry on collision."""
    import uuid
    date_part = datetime.date.today().strftime("%y%m%d")
    unique_part = uuid.uuid4().hex[:6].upper()
    return f"AR-{date_part}-{unique_part}"


def format_order_response(order: Order) -> OrderOut:
    """Helper to format Order model to OrderOut schema with table_label, variants, and delivery details."""
    table_label = None
    if order.table:
        table_label = order.table.label
    elif order.table_id:
        table_label = f"T{order.table_id}"
    elif order.order_type == "delivery":
        table_label = "🛵 Delivery"

    return OrderOut(
        id=order.id,
        outlet_id=order.outlet_id,
        table_id=order.table_id,
        table_label=table_label,
        idempotency_key=order.idempotency_key,
        order_type=order.order_type or "dine_in",
        customer_name=order.customer_name,
        customer_phone=order.customer_phone,
        delivery_address=order.delivery_address,
        delivery_status=order.delivery_status or "pending",
        delivery_fee_paise=order.delivery_fee_paise or 0,
        order_number=order.order_number,
        status=order.status,
        subtotal_paise=order.subtotal_paise,
        tax_paise=order.tax_paise,
        discount_paise=order.discount_paise or 0,
        coupon_code=order.coupon_code,
        total_paise=order.total_paise,
        payment_status=order.payment_status,
        payment_method=order.payment_method,
        customer_notes=order.customer_notes,
        created_at=order.created_at,
        updated_at=order.updated_at,
        items=[
            OrderItemOut(
                id=item.id,
                order_id=item.order_id,
                item_id=item.item_id,
                variant_id=item.variant_id,
                variant_name=item.variant_name,
                selected_addons_json=item.selected_addons_json,
                item_name=item.item_name,
                qty=item.qty,
                unit_price_paise=item.unit_price_paise,
                total_price_paise=item.total_price_paise,
                notes=item.notes,
            )
            for item in order.items
        ],
    )


# ==========================================
# CUSTOMER / CASHIER ORDER PLACEMENT
# ==========================================

@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
async def create_order(
    data: OrderCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    """Place a new customer order (Dine-in Table or Swiggy/Zomato-style Free Delivery).

    Features Idempotency Key validation, Rate Limiting, Portion Variants & Addons pricing,
    auto-inventory deduction, and real-time WebSocket broadcasting.
    """
    # 1. Rate Limiting Check
    order_creation_limiter.check(request)

    # 2. Idempotency Check: Return existing order on duplicate submit / network retry
    if data.idempotency_key and data.idempotency_key.strip():
        clean_key = data.idempotency_key.strip()
        existing_order = (
            db.query(Order)
            .options(joinedload(Order.items), joinedload(Order.table))
            .filter(Order.idempotency_key == clean_key)
            .first()
        )
        if existing_order:
            return format_order_response(existing_order)

    if not data.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order must contain at least one item",
        )

    order_type = (data.order_type or "dine_in").lower()
    table = None
    outlet_id = None

    if order_type == "delivery":
        # Delivery order validations
        if not data.customer_phone or not data.customer_phone.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Customer phone number is required for home delivery",
            )
        if not data.delivery_address or not data.delivery_address.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Delivery address is required for home delivery",
            )

        outlet_id = get_effective_outlet_id(data.outlet_id, db)
    else:
        # Dine-in Table order validations
        if not data.table_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Table ID is required for dine-in table ordering",
            )
        table = db.query(CafeTable).filter(CafeTable.id == data.table_id).first()
        if not table:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Table with ID {data.table_id} does not exist",
            )
        outlet_id = table.outlet_id

    # Fetch Outlet for tax calculation
    outlet = db.query(Outlet).filter(Outlet.id == outlet_id).first()
    tax_rate = outlet.tax_rate_percent if outlet else 5

    order_number = generate_order_number()
    subtotal_paise = 0
    order_items_to_create = []
    stock_logs_to_create = []

    # Validate each item, resolve variants/addons, and calculate totals
    for item_req in data.items:
        if item_req.qty <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Item quantity must be greater than 0",
            )

        menu_item = (
            db.query(MenuItem)
            .filter(MenuItem.id == item_req.item_id, MenuItem.outlet_id == outlet_id)
            .with_for_update()
            .first()
        )
        if not menu_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Menu item with ID {item_req.item_id} not found in this branch",
            )

        if not menu_item.is_available:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Item '{menu_item.name}' is currently unavailable/out of stock",
            )

        # Portion Variant resolution
        variant = None
        variant_name = None
        base_unit_price = menu_item.price_paise
        if item_req.variant_id:
            variant = (
                db.query(MenuItemVariant)
                .filter(MenuItemVariant.id == item_req.variant_id, MenuItemVariant.item_id == menu_item.id)
                .first()
            )
            if variant:
                base_unit_price = variant.price_paise
                variant_name = variant.name

        # Add-ons resolution
        selected_addons_list = []
        addons_total_paise = 0
        if item_req.addon_ids:
            addons = (
                db.query(MenuItemAddon)
                .filter(MenuItemAddon.id.in_(item_req.addon_ids), MenuItemAddon.item_id == menu_item.id)
                .all()
            )
            for addon in addons:
                addons_total_paise += addon.price_paise
                selected_addons_list.append({"name": addon.name, "price_paise": addon.price_paise})

        # Inventory check & deduction
        if menu_item.track_stock:
            if menu_item.stock_qty < item_req.qty:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient stock for '{menu_item.name}'. Available: {menu_item.stock_qty}, Requested: {item_req.qty}",
                )

            # Auto-deduct stock
            menu_item.stock_qty -= item_req.qty

            # Prepare stock deduction log
            location_tag = table.label if table else "Delivery"
            stock_log = StockLog(
                outlet_id=outlet_id,
                item_id=menu_item.id,
                change_qty=-item_req.qty,
                reason="sale",
                notes=f"Order {order_number} ({location_tag})",
            )
            stock_logs_to_create.append(stock_log)

        unit_price = base_unit_price + addons_total_paise
        item_total = unit_price * item_req.qty
        subtotal_paise += item_total

        order_items_to_create.append({
            "item_id": menu_item.id,
            "variant_id": variant.id if variant else None,
            "variant_name": variant_name,
            "selected_addons_json": json.dumps(selected_addons_list) if selected_addons_list else None,
            "item_name": menu_item.name,
            "qty": item_req.qty,
            "unit_price_paise": unit_price,
            "total_price_paise": item_total,
            "notes": item_req.notes.strip() if item_req.notes else None,
        })

    # Coupon Discount Calculation
    discount_paise = 0
    applied_coupon = None
    if data.coupon_code:
        code_clean = data.coupon_code.strip().upper()
        coupon = db.query(Coupon).filter(Coupon.code == code_clean, Coupon.is_active == True).first()
        if coupon and subtotal_paise >= coupon.min_order_paise:
            if not coupon.usage_limit or coupon.times_used < coupon.usage_limit:
                if coupon.discount_type == "percent":
                    computed_discount = int(round((subtotal_paise * coupon.discount_value) / 100))
                    if coupon.max_discount_paise and computed_discount > coupon.max_discount_paise:
                        computed_discount = coupon.max_discount_paise
                else:
                    computed_discount = min(coupon.discount_value, subtotal_paise)
                discount_paise = computed_discount
                applied_coupon = coupon
                coupon.times_used += 1

    # Financial Calculations in Paise (Free Delivery = 0 delivery fee)
    discounted_subtotal = max(0, subtotal_paise - discount_paise)
    tax_paise = int(round(discounted_subtotal * (tax_rate / 100.0)))
    total_paise = discounted_subtotal + tax_paise

    # Create Order record with Idempotency Key
    new_order = Order(
        outlet_id=outlet_id,
        table_id=table.id if table else None,
        idempotency_key=data.idempotency_key.strip() if data.idempotency_key else None,
        order_type=order_type,
        customer_name=data.customer_name.strip() if data.customer_name else None,
        customer_phone=data.customer_phone.strip() if data.customer_phone else None,
        delivery_address=data.delivery_address.strip() if data.delivery_address else None,
        delivery_status="pending" if order_type == "delivery" else None,
        delivery_fee_paise=0,
        order_number=order_number,
        status="placed",
        subtotal_paise=subtotal_paise,
        tax_paise=tax_paise,
        discount_paise=discount_paise,
        coupon_code=applied_coupon.code if applied_coupon else None,
        coupon_id=applied_coupon.id if applied_coupon else None,
        total_paise=total_paise,
        payment_status="pending",
        payment_method=data.payment_method or ("cod" if order_type == "delivery" else "counter"),
        customer_notes=data.customer_notes.strip() if data.customer_notes else None,
    )
    db.add(new_order)
    db.flush()

    # Create Order Items with variant & addon metadata
    for oi_data in order_items_to_create:
        order_item = OrderItem(
            order_id=new_order.id,
            item_id=oi_data["item_id"],
            variant_id=oi_data["variant_id"],
            variant_name=oi_data["variant_name"],
            selected_addons_json=oi_data["selected_addons_json"],
            item_name=oi_data["item_name"],
            qty=oi_data["qty"],
            unit_price_paise=oi_data["unit_price_paise"],
            total_price_paise=oi_data["total_price_paise"],
            notes=oi_data["notes"],
        )
        db.add(order_item)

    # Add stock logs
    for s_log in stock_logs_to_create:
        db.add(s_log)

    # Update table status if dine-in
    if table:
        table.status = "occupied"
        table.active_order_id = new_order.id

    log_audit(
        db=db,
        outlet_id=outlet_id,
        user_id=None,  # Customer initiated
        action="place_order",
        entity_type="order",
        entity_id=new_order.id,
        details={
            "order_number": new_order.order_number,
            "order_type": order_type,
            "table": table.label if table else "DELIVERY",
            "items_count": len(order_items_to_create),
            "total_formatted": f"₹{total_paise / 100:.2f}",
        },
    )

    db.commit()
    db.refresh(new_order)

    formatted_response = format_order_response(new_order)

    # Broadcast real-time event to Admin Dashboards
    await manager.broadcast_to_admin(
        outlet_id=outlet_id,
        event_type="new_order",
        data=formatted_response.model_dump(mode="json"),
    )

    return formatted_response


# ==========================================
# ORDER STATUS PROGRESSION (ADMIN/STAFF)
# ==========================================

@router.patch("/{order_id}/status", response_model=OrderOut)
async def update_order_status(
    order_id: int,
    data: OrderStatusUpdate,
    current_user: User = Depends(require_staff_or_owner),
    db: Session = Depends(get_db),
):
    """Progress order status: placed -> accepted -> preparing -> ready -> served (or cancelled).

    Broadcasts real-time event to customer tracking page and admin boards.
    """
    new_status = data.status.strip().lower()
    if new_status not in VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status '{new_status}'. Allowed statuses: {', '.join(VALID_STATUSES)}",
        )

    order = (
        db.query(Order)
        .options(joinedload(Order.items), joinedload(Order.table))
        .filter(Order.id == order_id, Order.outlet_id == current_user.outlet_id)
        .first()
    )
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with ID {order_id} not found",
        )

    old_status = order.status
    order.status = new_status

    # If cancelling, restore deducted stock
    if new_status == "cancelled" and old_status != "cancelled":
        for oi in order.items:
            if oi.item_id:
                m_item = db.query(MenuItem).filter(MenuItem.id == oi.item_id).first()
                if m_item and m_item.track_stock:
                    m_item.stock_qty += oi.qty
                    restock_log = StockLog(
                        outlet_id=order.outlet_id,
                        item_id=m_item.id,
                        change_qty=oi.qty,
                        reason="adjustment",
                        staff_id=current_user.id,
                        notes=f"Order {order.order_number} cancelled by {current_user.name}",
                    )
                    db.add(restock_log)

    log_audit(
        db=db,
        outlet_id=current_user.outlet_id,
        user_id=current_user.id,
        action="order_status_change",
        entity_type="order",
        entity_id=order.id,
        details={
            "order_number": order.order_number,
            "old_status": old_status,
            "new_status": new_status,
            "updated_by": current_user.name,
        },
    )

    db.commit()
    db.refresh(order)

    formatted_response = format_order_response(order)

    # Broadcast real-time status update to customer tracking socket and admin board
    await manager.broadcast_to_order(
        order_id=order.id,
        event_type="order_status_updated",
        data=formatted_response.model_dump(mode="json"),
        outlet_id=order.outlet_id,
    )

    return formatted_response


# ==========================================
# ORDER QUERY ENDPOINTS
# ==========================================

@router.get("", response_model=List[OrderOut])
def list_orders(
    outlet_id: Optional[int] = Query(None, description="Filter by outlet ID (Owners can switch branches)"),
    status: Optional[str] = Query(None, description="Filter by status (e.g. 'placed,preparing')"),
    table_id: Optional[int] = Query(None, description="Filter by table ID"),
    order_type: Optional[str] = Query(None, description="Filter by order type ('dine_in' or 'delivery')"),
    payment_status: Optional[str] = Query(None, description="Filter by payment status"),
    date: Optional[str] = Query(None, description="Filter by date YYYY-MM-DD"),
    limit: int = Query(100, ge=1, le=500),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Admin endpoint to list and filter cafe orders."""
    if current_user and current_user.role == "owner" and outlet_id is not None:
        target_outlet_id = get_effective_outlet_id(outlet_id, db)
    elif current_user and current_user.role != "owner":
        target_outlet_id = get_effective_outlet_id(current_user.outlet_id, db)
    elif outlet_id is not None:
        target_outlet_id = get_effective_outlet_id(outlet_id, db)
    elif current_user is not None:
        target_outlet_id = get_effective_outlet_id(current_user.outlet_id, db)
    else:
        target_outlet_id = get_effective_outlet_id(None, db)

    query = (
        db.query(Order)
        .options(joinedload(Order.items), joinedload(Order.table))
        .filter(Order.outlet_id == target_outlet_id)
    )

    if order_type:
        query = query.filter(Order.order_type == order_type.strip().lower())

    if status:
        status_list = [s.strip().lower() for s in status.split(",") if s.strip()]
        if status_list:
            query = query.filter(Order.status.in_(status_list))

    if table_id is not None:
        query = query.filter(Order.table_id == table_id)

    if payment_status:
        query = query.filter(Order.payment_status == payment_status.strip().lower())

    if date:
        try:
            target_date = datetime.datetime.strptime(date, "%Y-%m-%d").date()
            next_date = target_date + datetime.timedelta(days=1)
            query = query.filter(
                Order.created_at >= target_date,
                Order.created_at < next_date,
            )
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Use YYYY-MM-DD",
            )

    orders = query.order_by(Order.created_at.desc()).limit(limit).all()
    return [format_order_response(o) for o in orders]


@router.get("/{order_id}", response_model=OrderOut)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
):
    """Customer and Admin order detail lookup (no login required for customer tracking)."""
    order = (
        db.query(Order)
        .options(joinedload(Order.items), joinedload(Order.table))
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with ID {order_id} not found",
        )

    return format_order_response(order)


@router.post("/{order_id}/append-items", response_model=OrderOut)
async def append_order_items(
    order_id: int,
    data: OrderAppendItems,
    current_user: User = Depends(require_staff_or_owner),
    db: Session = Depends(get_db),
):
    """Captain Waiter & Cashier endpoint: Append running items to an active table order."""
    order = (
        db.query(Order)
        .options(joinedload(Order.items), joinedload(Order.table))
        .filter(Order.id == order_id, Order.outlet_id == current_user.outlet_id)
        .first()
    )
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with ID {order_id} not found",
        )

    if order.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot append items to a cancelled order",
        )

    outlet = db.query(Outlet).filter(Outlet.id == order.outlet_id).first()
    tax_rate = (outlet.tax_rate_percent / 100.0) if outlet else 0.05

    try:
        appended_order_items = []
        added_subtotal = 0

        for it_req in data.items:
            menu_item = db.query(MenuItem).filter(MenuItem.id == it_req.item_id).first()
            if not menu_item:
                raise HTTPException(status_code=404, detail=f"Menu item {it_req.item_id} not found")

            unit_price = menu_item.price_paise
            variant_name = None
            if it_req.variant_id:
                variant = db.query(MenuItemVariant).filter(
                    MenuItemVariant.id == it_req.variant_id,
                    MenuItemVariant.item_id == it_req.item_id
                ).first()
                if variant:
                    unit_price = variant.price_paise
                    variant_name = variant.name

            addons_json = None
            if it_req.addon_ids and len(it_req.addon_ids) > 0:
                chosen_addons = db.query(MenuItemAddon).filter(
                    MenuItemAddon.id.in_(it_req.addon_ids),
                    MenuItemAddon.item_id == it_req.item_id
                ).all()
                if chosen_addons:
                    addons_sum = sum(a.price_paise for a in chosen_addons)
                    unit_price += addons_sum
                    addons_json = json.dumps([{"id": a.id, "name": a.name, "price_paise": a.price_paise} for a in chosen_addons])

            line_total = unit_price * it_req.qty
            added_subtotal += line_total

            order_item = OrderItem(
                order_id=order.id,
                item_id=menu_item.id,
                variant_id=it_req.variant_id,
                variant_name=variant_name,
                selected_addons_json=addons_json,
                item_name=menu_item.name,
                qty=it_req.qty,
                unit_price_paise=unit_price,
                total_price_paise=line_total,
                notes=it_req.notes,
            )
            db.add(order_item)
            appended_order_items.append(order_item)

            # Stock deduction
            if menu_item.track_stock:
                menu_item.stock_qty = max(0, menu_item.stock_qty - it_req.qty)
                stock_log = StockLog(
                    outlet_id=order.outlet_id,
                    item_id=menu_item.id,
                    change_qty=-it_req.qty,
                    reason="sale",
                    notes=f"Captain Running KOT append Order #{order.order_number}",
                    staff_id=current_user.id,
                )
                db.add(stock_log)

        order.subtotal_paise += added_subtotal
        discount = order.discount_paise or 0
        discounted_sub = max(0, order.subtotal_paise - discount)
        order.tax_paise = int(round(discounted_sub * tax_rate))
        order.total_paise = discounted_sub + order.tax_paise + (order.delivery_fee_paise or 0)
        order.updated_at = datetime.datetime.utcnow()

        # If order was served, move back to preparing so kitchen knows new items are requested
        if order.status == "served":
            order.status = "preparing"

        db.commit()
        db.refresh(order)

        # Broadcast WebSocket update
        resp = format_order_response(order)
        try:
            await manager.broadcast_to_admin(
                outlet_id=order.outlet_id,
                event_type="running_kot_added",
                data=resp.model_dump(mode="json"),
            )
        except Exception as ws_err:
            pass

        log_audit(
            db=db,
            outlet_id=order.outlet_id,
            user_id=current_user.id,
            action="append_running_kot",
            entity_type="order",
            entity_id=order.id,
            details={"appended_items": len(appended_order_items), "added_paise": added_subtotal},
        )
        db.commit()

        return resp
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        raise HTTPException(status_code=500, detail=f"Append Error: {str(e)} -> {tb}")


@router.post("/{order_id}/transfer-table", response_model=OrderOut)
async def transfer_order_table(
    order_id: int,
    data: OrderTransferTable,
    current_user: User = Depends(require_staff_or_owner),
    db: Session = Depends(get_db),
):
    """Captain Waiter endpoint: Transfer active dining order to another table."""
    order = (
        db.query(Order)
        .options(joinedload(Order.items), joinedload(Order.table))
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with ID {order_id} not found",
        )

    target_table = db.query(CafeTable).filter(CafeTable.id == data.target_table_id).first()
    if not target_table:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Target table ID {data.target_table_id} not found",
        )

    prev_table_id = order.table_id
    order.table_id = target_table.id
    target_table.status = "occupied"

    # Check if previous table has remaining active orders
    if prev_table_id:
        remaining = db.query(Order).filter(
            Order.table_id == prev_table_id,
            Order.id != order.id,
            Order.status.in_(["placed", "accepted", "preparing", "ready", "served"])
        ).count()
        if remaining == 0:
            prev_table = db.query(CafeTable).filter(CafeTable.id == prev_table_id).first()
            if prev_table:
                prev_table.status = "available"

    order.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(order)

    resp = format_order_response(order)
    await manager.broadcast_to_admin(
        outlet_id=order.outlet_id,
        event_type="table_transferred",
        data=resp.model_dump(mode="json"),
    )

    log_audit(
        db=db,
        outlet_id=order.outlet_id,
        user_id=current_user.id,
        action="transfer_table",
        entity_type="order",
        entity_id=order.id,
        details={"from_table": prev_table_id, "to_table": target_table.id},
    )

    return resp


class OrderPaymentMethodUpdate(BaseModel):
    payment_method: str  # 'cash', 'upi', 'card', 'cod'
    notes: Optional[str] = None


class OrderVoidRequest(BaseModel):
    reason: str
    staff_notes: Optional[str] = None


@router.patch("/{order_id}/change-payment-method", response_model=OrderOut)
async def change_order_payment_method(
    order_id: int,
    data: OrderPaymentMethodUpdate,
    current_user: User = Depends(require_staff_or_owner),
    db: Session = Depends(get_db),
):
    """Cashier POS endpoint: Change payment tender method on a settled/completed bill."""
    order = (
        db.query(Order)
        .options(joinedload(Order.items), joinedload(Order.table), joinedload(Order.payments))
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    prev_method = order.payment_method
    order.payment_method = data.payment_method.lower()
    order.updated_at = datetime.datetime.utcnow()

    # Update existing payment record if any
    for p in order.payments:
        p.method = data.payment_method.lower()
        if data.notes:
            p.notes = (p.notes or "") + " | " + data.notes

    log_audit(
        db=db,
        outlet_id=order.outlet_id,
        user_id=current_user.id,
        action="change_payment_method",
        entity_type="order",
        entity_id=order.id,
        details={"from": prev_method, "to": data.payment_method, "order_number": order.order_number},
    )
    db.commit()
    db.refresh(order)

    resp = format_order_response(order)
    await manager.broadcast_to_admin(
        outlet_id=order.outlet_id,
        event_type="payment_updated",
        data=resp.model_dump(mode="json"),
    )
    return resp


@router.patch("/{order_id}/void", response_model=OrderOut)
async def void_order(
    order_id: int,
    data: OrderVoidRequest,
    current_user: User = Depends(require_staff_or_owner),
    db: Session = Depends(get_db),
):
    """Cashier & Manager endpoint: Void/cancel an order with mandatory audit reason."""
    order = (
        db.query(Order)
        .options(joinedload(Order.items), joinedload(Order.table))
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = "cancelled"
    order.customer_notes = (order.customer_notes or "") + f" [VOIDED: {data.reason}]"
    order.updated_at = datetime.datetime.utcnow()

    # Release table if dine-in
    if order.table_id:
        t = db.query(CafeTable).filter(CafeTable.id == order.table_id).first()
        if t:
            t.status = "available"

    log_audit(
        db=db,
        outlet_id=order.outlet_id,
        user_id=current_user.id,
        action="void_order",
        entity_type="order",
        entity_id=order.id,
        details={"reason": data.reason, "order_number": order.order_number, "loss_paise": order.total_paise},
    )
    db.commit()
    db.refresh(order)

    resp = format_order_response(order)
    await manager.broadcast_to_admin(
        outlet_id=order.outlet_id,
        event_type="order_voided",
        data=resp.model_dump(mode="json"),
    )
    return resp
