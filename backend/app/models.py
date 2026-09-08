import datetime
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.database import Base


class Outlet(Base):
    __tablename__ = "outlets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    address = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    currency = Column(String(10), default="INR")
    tax_rate_percent = Column(Integer, default=5)  # e.g., 5% GST
    opening_hours = Column(String(100), nullable=True)  # e.g., "6:00 AM – 11:00 PM"
    tagline = Column(String(255), nullable=True)  # e.g., "Authentic Arabian Cuisine & Mandi"
    logo_url = Column(String(500), nullable=True)  # e.g., "/uploads/logo.png"
    gstin = Column(String(30), nullable=True)  # GST Identification Number
    fssai_license_number = Column(String(30), nullable=True)  # FSSAI License Number
    upi_vpa = Column(String(100), nullable=True)  # e.g. "arabieq@upi"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    users = relationship("User", back_populates="outlet")
    tables = relationship("CafeTable", back_populates="outlet")
    categories = relationship("Category", back_populates="outlet")
    menu_items = relationship("MenuItem", back_populates="outlet")
    orders = relationship("Order", back_populates="outlet")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    outlet_id = Column(Integer, ForeignKey("outlets.id"), index=True, nullable=False)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="staff")  # 'owner' or 'staff'
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    outlet = relationship("Outlet", back_populates="users")
    audit_logs = relationship("AuditLog", back_populates="user")


class CafeTable(Base):
    __tablename__ = "tables"
    __table_args__ = (
        UniqueConstraint("outlet_id", "label", name="uq_table_outlet_label"),
    )

    id = Column(Integer, primary_key=True, index=True)
    outlet_id = Column(Integer, ForeignKey("outlets.id"), index=True, nullable=False)
    label = Column(String(50), nullable=False)  # e.g. "T1", "T2"
    qr_code_url = Column(String(255), nullable=True)
    status = Column(String(20), default="free")  # 'free', 'occupied', 'reserved'
    active_order_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    outlet = relationship("Outlet", back_populates="tables")
    orders = relationship("Order", back_populates="table")
    service_calls = relationship("ServiceCall", back_populates="table", cascade="all, delete-orphan")


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (
        UniqueConstraint("outlet_id", "name", name="uq_category_outlet_name"),
    )

    id = Column(Integer, primary_key=True, index=True)
    outlet_id = Column(Integer, ForeignKey("outlets.id"), index=True, nullable=False)
    name = Column(String(100), nullable=False)
    name_te = Column(String(100), nullable=True)  # Telugu category name
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    outlet = relationship("Outlet", back_populates="categories")
    items = relationship("MenuItem", back_populates="category", cascade="all, delete-orphan")


class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(Integer, primary_key=True, index=True)
    outlet_id = Column(Integer, ForeignKey("outlets.id"), index=True, nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), index=True, nullable=False)
    name = Column(String(120), nullable=False)
    name_te = Column(String(120), nullable=True)  # Telugu name
    description = Column(Text, nullable=True)
    description_te = Column(Text, nullable=True)  # Telugu description
    price_paise = Column(Integer, nullable=False)  # Base price (e.g. 2000 for ₹20.00)
    image_url = Column(String(255), nullable=True)
    is_veg = Column(Boolean, default=True)
    is_available = Column(Boolean, default=True)
    has_variants = Column(Boolean, default=False)
    track_stock = Column(Boolean, default=False)
    stock_qty = Column(Integer, default=100)
    low_stock_threshold = Column(Integer, default=10)
    is_special = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    outlet = relationship("Outlet", back_populates="menu_items")
    category = relationship("Category", back_populates="items")
    variants = relationship("MenuItemVariant", back_populates="item", cascade="all, delete-orphan", order_by="MenuItemVariant.price_paise.asc()")
    addons = relationship("MenuItemAddon", back_populates="item", cascade="all, delete-orphan", order_by="MenuItemAddon.price_paise.asc()")
    stock_logs = relationship("StockLog", back_populates="item", cascade="all, delete-orphan")


class MenuItemVariant(Base):
    __tablename__ = "menu_item_variants"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("menu_items.id", ondelete="CASCADE"), index=True, nullable=False)
    name = Column(String(100), nullable=False)  # e.g. "Single", "Half (1-2 Pax)", "Full (3-4 Pax)", "Jumbo"
    name_te = Column(String(100), nullable=True)
    price_paise = Column(Integer, nullable=False)
    is_default = Column(Boolean, default=False)
    is_available = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    item = relationship("MenuItem", back_populates="variants")


class MenuItemAddon(Base):
    __tablename__ = "menu_item_addons"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("menu_items.id", ondelete="CASCADE"), index=True, nullable=False)
    name = Column(String(100), nullable=False)  # e.g. "Extra Mayonnaise", "Extra Raita", "Boiled Egg (1 pc)"
    name_te = Column(String(100), nullable=True)
    price_paise = Column(Integer, nullable=False)
    is_available = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    item = relationship("MenuItem", back_populates="addons")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    outlet_id = Column(Integer, ForeignKey("outlets.id"), index=True, nullable=False)
    table_id = Column(Integer, ForeignKey("tables.id", ondelete="SET NULL"), index=True, nullable=True)
    idempotency_key = Column(String(100), unique=True, index=True, nullable=True)  # Prevents duplicate checkout retries
    order_type = Column(String(20), default="dine_in", index=True)  # 'dine_in', 'delivery', 'takeaway'
    customer_name = Column(String(100), nullable=True)
    customer_phone = Column(String(20), index=True, nullable=True)
    delivery_address = Column(Text, nullable=True)
    delivery_status = Column(String(30), default="pending")  # 'pending', 'out_for_delivery', 'delivered'
    delivery_fee_paise = Column(Integer, default=0)  # Free delivery = 0
    order_number = Column(String(30), unique=True, index=True, nullable=False)
    status = Column(String(30), default="placed", index=True)  # 'placed', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'served', 'cancelled'
    subtotal_paise = Column(Integer, default=0)
    tax_paise = Column(Integer, default=0)
    discount_paise = Column(Integer, default=0)  # Coupon discount
    coupon_code = Column(String(50), nullable=True)
    coupon_id = Column(Integer, ForeignKey("coupons.id", ondelete="SET NULL"), nullable=True)
    total_paise = Column(Integer, default=0)
    payment_status = Column(String(20), default="pending")  # 'pending', 'paid', 'failed'
    payment_method = Column(String(20), default="counter")  # 'upi', 'card', 'cash', 'counter', 'cod'
    customer_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    outlet = relationship("Outlet", back_populates="orders")
    table = relationship("CafeTable", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="order", cascade="all, delete-orphan")
    coupon = relationship("Coupon", back_populates="orders")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), index=True, nullable=False)
    item_id = Column(Integer, ForeignKey("menu_items.id", ondelete="SET NULL"), index=True, nullable=True)
    variant_id = Column(Integer, nullable=True)
    variant_name = Column(String(100), nullable=True)  # e.g. "Full (3-4 Pax)"
    selected_addons_json = Column(Text, nullable=True)  # JSON list of chosen addons
    item_name = Column(String(120), nullable=False)
    qty = Column(Integer, default=1)
    unit_price_paise = Column(Integer, nullable=False)
    total_price_paise = Column(Integer, nullable=False)
    notes = Column(String(255), nullable=True)

    order = relationship("Order", back_populates="items")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), index=True, nullable=False)
    method = Column(String(30), default="counter")  # 'upi', 'card', 'cash'
    txn_id = Column(String(100), nullable=True)
    amount_paise = Column(Integer, nullable=False)
    status = Column(String(20), default="completed")  # 'pending', 'completed', 'failed', 'refunded'
    paid_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    order = relationship("Order", back_populates="payments")


class StockLog(Base):
    __tablename__ = "stock_logs"

    id = Column(Integer, primary_key=True, index=True)
    outlet_id = Column(Integer, ForeignKey("outlets.id"), index=True, nullable=False)
    item_id = Column(Integer, ForeignKey("menu_items.id", ondelete="CASCADE"), index=True, nullable=False)
    change_qty = Column(Integer, nullable=False)  # positive for restock, negative for sale/waste
    reason = Column(String(50), nullable=False)  # 'sale', 'restock', 'wastage', 'adjustment'
    staff_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    item = relationship("MenuItem", back_populates="stock_logs")


class ServiceCall(Base):
    __tablename__ = "service_calls"

    id = Column(Integer, primary_key=True, index=True)
    outlet_id = Column(Integer, ForeignKey("outlets.id"), index=True, nullable=False)
    table_id = Column(Integer, ForeignKey("tables.id"), index=True, nullable=False)
    call_type = Column(String(50), default="waiter")  # 'waiter', 'bill', 'water', 'clean'
    status = Column(String(20), default="pending", index=True)  # 'pending', 'attended'
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    table = relationship("CafeTable", back_populates="service_calls")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    outlet_id = Column(Integer, ForeignKey("outlets.id"), index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)  # e.g., 'price_change', 'stock_adjustment', 'cancel_order'
    entity_type = Column(String(50), index=True, nullable=False)  # e.g., 'menu_item', 'order', 'table'
    entity_id = Column(Integer, nullable=True)
    details_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    user = relationship("User", back_populates="audit_logs")


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String(20), unique=True, index=True, nullable=False)  # 10-digit Indian phone
    name = Column(String(100), nullable=True)
    email = Column(String(120), nullable=True)
    default_address = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_order_at = Column(DateTime, nullable=True)

    addresses = relationship("CustomerAddress", back_populates="customer", cascade="all, delete-orphan")


class CustomerAddress(Base):
    __tablename__ = "customer_addresses"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), index=True, nullable=False)
    label = Column(String(50), default="Home")  # e.g., 'Home', 'Work', 'Hostel', 'Kadiri Town'
    address_line = Column(Text, nullable=False)
    landmark = Column(String(150), nullable=True)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    customer = relationship("Customer", back_populates="addresses")


class CustomerOTP(Base):
    __tablename__ = "customer_otps"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String(20), index=True, nullable=False)
    otp_code = Column(String(10), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False)
    attempts = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(Integer, primary_key=True, index=True)
    outlet_id = Column(Integer, ForeignKey("outlets.id"), index=True, nullable=True)  # Null = valid for all outlets
    code = Column(String(50), unique=True, index=True, nullable=False)  # e.g., "WELCOME50", "MANDI10"
    description = Column(String(255), nullable=True)  # e.g., "Flat ₹50 OFF on Kadiri Deliveries"
    discount_type = Column(String(20), default="flat")  # 'flat' (paise) or 'percent'
    discount_value = Column(Integer, nullable=False)  # e.g. 5000 (₹50) or 10 (10%)
    min_order_paise = Column(Integer, default=0)  # e.g. 30000 (₹300)
    max_discount_paise = Column(Integer, nullable=True)  # cap for percent discounts
    usage_limit = Column(Integer, nullable=True)
    times_used = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    orders = relationship("Order", back_populates="coupon")




class TableReservation(Base):
    __tablename__ = "table_reservations"

    id = Column(Integer, primary_key=True, index=True)
    outlet_id = Column(Integer, ForeignKey("outlets.id"), index=True, nullable=False)
    reservation_number = Column(String(50), unique=True, index=True, nullable=False)
    customer_name = Column(String(100), nullable=False)
    customer_phone = Column(String(20), index=True, nullable=False)
    customer_email = Column(String(100), nullable=True)
    party_size = Column(Integer, nullable=False, default=2)
    reservation_date = Column(String(20), index=True, nullable=False)  # YYYY-MM-DD
    reservation_time = Column(String(20), nullable=False)  # HH:MM e.g. "19:30"
    seating_preference = Column(String(50), default="standard")  # 'majlis', 'family_ac', 'terrace', 'standard'
    occasion = Column(String(50), nullable=True)  # 'birthday', 'anniversary', 'family', 'business', 'casual'
    special_requests = Column(Text, nullable=True)
    table_id = Column(Integer, ForeignKey("tables.id"), nullable=True)
    status = Column(String(20), default="confirmed")  # 'confirmed', 'seated', 'cancelled', 'completed'
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    outlet = relationship("Outlet")
    table = relationship("CafeTable")


class CashierShift(Base):
    __tablename__ = "cashier_shifts"

    id = Column(Integer, primary_key=True, index=True)
    outlet_id = Column(Integer, ForeignKey("outlets.id"), index=True, nullable=False)
    cashier_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    cashier_name = Column(String(100), nullable=False)
    shift_name = Column(String(50), default="Counter Shift")
    status = Column(String(20), default="open", index=True)  # 'open', 'closed'
    opened_at = Column(DateTime, default=datetime.datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)
    opening_float_paise = Column(Integer, default=0)
    cash_sales_paise = Column(Integer, default=0)
    upi_sales_paise = Column(Integer, default=0)
    card_sales_paise = Column(Integer, default=0)
    petty_cash_in_paise = Column(Integer, default=0)
    petty_cash_out_paise = Column(Integer, default=0)
    expected_cash_paise = Column(Integer, default=0)
    actual_cash_paise = Column(Integer, nullable=True)
    difference_paise = Column(Integer, nullable=True)
    denominations_json = Column(Text, nullable=True)
    closing_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    outlet = relationship("Outlet")
    cashier = relationship("User")
