from __future__ import annotations
import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, EmailStr, ConfigDict, Field


# ==========================================
# AUTH SCHEMAS
# ==========================================

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, description="Minimum 8 characters")


class SwitchBranchRequest(BaseModel):
    target_outlet_id: int
    admin_password: str
    admin_email: Optional[EmailStr] = None



class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    name: str
    email: str
    outlet_id: int
    user: Optional[UserOut] = None


class TokenData(BaseModel):
    user_id: Optional[int] = None
    email: Optional[str] = None
    role: Optional[str] = None
    outlet_id: Optional[int] = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    outlet_id: int
    name: str
    email: str
    role: str
    created_at: datetime.datetime


# ==========================================
# OUTLET & TABLE SCHEMAS
# ==========================================

class OutletOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    currency: str
    tax_rate_percent: int
    opening_hours: Optional[str] = None
    tagline: Optional[str] = None
    logo_url: Optional[str] = None
    gstin: Optional[str] = None
    fssai_license_number: Optional[str] = None
    upi_vpa: Optional[str] = None


class OutletUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    currency: Optional[str] = None
    tax_rate_percent: Optional[int] = Field(None, ge=0, le=100)
    opening_hours: Optional[str] = None
    tagline: Optional[str] = None
    logo_url: Optional[str] = None
    gstin: Optional[str] = None
    fssai_license_number: Optional[str] = None
    upi_vpa: Optional[str] = None


class TableBase(BaseModel):
    label: str
    qr_code_url: Optional[str] = None
    status: str = "free"


class TableCreate(TableBase):
    pass


class TableUpdate(BaseModel):
    label: Optional[str] = None
    status: Optional[str] = None
    qr_code_url: Optional[str] = None


class TableStatusUpdate(BaseModel):
    status: str  # 'free', 'occupied', 'reserved'


class TableOut(TableBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    outlet_id: int
    active_order_id: Optional[int] = None
    created_at: datetime.datetime


# ==========================================
# CATEGORY SCHEMAS
# ==========================================

class CategoryBase(BaseModel):
    name: str
    name_te: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    name_te: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class CategoryOut(CategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    outlet_id: int
    created_at: datetime.datetime


# ==========================================
# MENU ITEM VARIANT & ADDON SCHEMAS
# ==========================================

class MenuItemVariantBase(BaseModel):
    name: str
    name_te: Optional[str] = None
    price_paise: int = Field(..., gt=0, description="Variant price in paise")
    is_default: bool = False
    is_available: bool = True


class MenuItemVariantCreate(MenuItemVariantBase):
    pass



class MenuItemVariantUpdate(BaseModel):
    name: Optional[str] = None
    name_te: Optional[str] = None
    price_paise: Optional[int] = Field(None, gt=0)
    is_default: Optional[bool] = None
    is_available: Optional[bool] = None


class MenuItemAddonUpdate(BaseModel):
    name: Optional[str] = None
    name_te: Optional[str] = None
    price_paise: Optional[int] = Field(None, ge=0)
    is_available: Optional[bool] = None

class MenuItemVariantOut(MenuItemVariantBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    item_id: int
    created_at: datetime.datetime


class MenuItemAddonBase(BaseModel):
    name: str
    name_te: Optional[str] = None
    price_paise: int = Field(..., ge=0, description="Addon price in paise")
    is_available: bool = True


class MenuItemAddonCreate(MenuItemAddonBase):
    pass


class MenuItemAddonOut(MenuItemAddonBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    item_id: int
    created_at: datetime.datetime


# ==========================================
# MENU ITEM SCHEMAS
# ==========================================

class MenuItemBase(BaseModel):
    category_id: int
    name: str
    name_te: Optional[str] = None
    description: Optional[str] = None
    description_te: Optional[str] = None
    price_paise: int = Field(..., gt=0, description="Base price in paise must be positive")
    image_url: Optional[str] = None
    is_veg: bool = True
    is_available: bool = True
    has_variants: bool = False
    track_stock: bool = False
    stock_qty: int = Field(default=100, ge=0)
    low_stock_threshold: int = Field(default=10, ge=0)
    is_special: bool = False


class MenuItemCreate(MenuItemBase):
    pass


class MenuItemUpdate(BaseModel):
    category_id: Optional[int] = None
    name: Optional[str] = None
    name_te: Optional[str] = None
    description: Optional[str] = None
    description_te: Optional[str] = None
    price_paise: Optional[int] = None
    image_url: Optional[str] = None
    is_veg: Optional[bool] = None
    is_available: Optional[bool] = None
    has_variants: Optional[bool] = None
    track_stock: Optional[bool] = None
    stock_qty: Optional[int] = None
    low_stock_threshold: Optional[int] = None
    is_special: Optional[bool] = None


class MenuItemAvailabilityUpdate(BaseModel):
    is_available: bool


class MenuItemPriceUpdate(BaseModel):
    price_paise: int = Field(..., gt=0, description="Price in paise must be positive")


class MenuItemStockUpdate(BaseModel):
    change_qty: int
    reason: str = "adjustment"  # 'restock', 'wastage', 'adjustment'
    notes: Optional[str] = None


class MenuItemOut(MenuItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    outlet_id: int
    created_at: datetime.datetime
    category: Optional[CategoryOut] = None
    variants: List[MenuItemVariantOut] = []
    addons: List[MenuItemAddonOut] = []


# ==========================================
# ORDER SCHEMAS
# ==========================================

class OrderItemCreate(BaseModel):
    item_id: int
    variant_id: Optional[int] = None
    addon_ids: Optional[List[int]] = None
    qty: int = Field(default=1, ge=1, le=100)
    notes: Optional[str] = Field(None, max_length=255)


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_id: int
    item_id: Optional[int] = None
    variant_id: Optional[int] = None
    variant_name: Optional[str] = None
    selected_addons_json: Optional[str] = None
    item_name: str
    qty: int
    unit_price_paise: int
    total_price_paise: int
    notes: Optional[str] = None


class OrderCreate(BaseModel):
    table_id: Optional[int] = None
    outlet_id: Optional[int] = None
    idempotency_key: Optional[str] = Field(None, max_length=100)
    order_type: str = "dine_in"  # 'dine_in', 'delivery', 'takeaway'
    customer_name: Optional[str] = Field(None, max_length=100)
    customer_phone: Optional[str] = Field(None, max_length=20)
    delivery_address: Optional[str] = Field(None, max_length=1000)
    delivery_status: Optional[str] = "pending"
    coupon_code: Optional[str] = Field(None, max_length=50)
    items: List[OrderItemCreate] = Field(..., min_length=1)
    customer_notes: Optional[str] = Field(None, max_length=500)
    payment_method: str = "counter"  # 'upi', 'card', 'cash', 'counter', 'cod'


class OrderStatusUpdate(BaseModel):
    status: str  # 'placed', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'served', 'cancelled'


class OrderAppendItems(BaseModel):
    items: List[OrderItemCreate] = Field(..., min_length=1)
    notes: Optional[str] = Field(None, max_length=255)


class OrderTransferTable(BaseModel):
    target_table_id: int


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    outlet_id: int
    table_id: Optional[int] = None
    table_label: Optional[str] = None
    idempotency_key: Optional[str] = None
    order_type: str = "dine_in"
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    delivery_address: Optional[str] = None
    delivery_status: Optional[str] = None
    delivery_fee_paise: int = 0
    order_number: str
    status: str
    subtotal_paise: int
    tax_paise: int
    discount_paise: int = 0
    coupon_code: Optional[str] = None
    total_paise: int
    payment_status: str
    payment_method: str
    customer_notes: Optional[str] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    items: List[OrderItemOut] = []


# ==========================================
# STOCK SCHEMAS
# ==========================================

class StockAdjustmentCreate(BaseModel):
    item_id: int
    change_qty: int  # positive for restock, negative for wastage/deduction
    reason: str = "restock"  # 'restock', 'wastage', 'adjustment'
    notes: Optional[str] = None


class StockLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    outlet_id: int
    item_id: int
    item_name: Optional[str] = None
    change_qty: int
    reason: str
    staff_id: Optional[int] = None
    staff_name: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime.datetime


class StockItemOverview(BaseModel):
    id: int
    name: str
    name_te: Optional[str] = None
    category_name: Optional[str] = None
    price_paise: int
    stock_qty: int
    track_stock: bool
    low_stock_threshold: int
    is_available: bool
    status: str  # 'in_stock', 'low_stock', 'out_of_stock'


# ==========================================
# PAYMENT SCHEMAS
# ==========================================

class RazorpayOrderRequest(BaseModel):
    order_id: int


class RazorpayOrderResponse(BaseModel):
    razorpay_order_id: str
    amount_paise: int
    currency: str = "INR"
    key_id: str
    order_number: str


class RazorpayVerifyRequest(BaseModel):
    order_id: int
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class MarkCashPaidRequest(BaseModel):
    notes: Optional[str] = "Paid in cash at counter"


class RecordPaymentRequest(BaseModel):
    method: str = "cash"  # 'cash', 'upi', 'card'
    amount_paise: int
    tendered_paise: Optional[int] = None  # for cash change calculation
    change_returned_paise: Optional[int] = None
    txn_id: Optional[str] = None
    notes: Optional[str] = None


class SplitPaymentRequest(BaseModel):
    payments: List[RecordPaymentRequest]
    notes: Optional[str] = None


class DynamicUpiQrResponse(BaseModel):
    upi_uri: str
    amount_paise: int
    amount_rs: float
    order_number: str
    outlet_name: str
    upi_vpa: str


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_id: int
    method: str
    txn_id: Optional[str] = None
    amount_paise: int
    status: str
    paid_at: datetime.datetime
    notes: Optional[str] = None
    created_at: datetime.datetime


# ==========================================
# SERVICE CALL SCHEMAS
# ==========================================

class ServiceCallCreate(BaseModel):
    table_id: Optional[int] = None
    call_type: str = "waiter"  # 'waiter', 'bill', 'water', 'clean'
    notes: Optional[str] = None


class ServiceCallOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    outlet_id: int
    table_id: int
    table_label: Optional[str] = None
    call_type: str
    status: str
    created_at: datetime.datetime


# ==========================================
# AUDIT LOG SCHEMAS
# ==========================================

class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    outlet_id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[int] = None
    details_json: Optional[str] = None
    created_at: datetime.datetime


# ==========================================
# CUSTOMER & OTP SCHEMAS
# ==========================================

class CustomerQuickLoginReq(BaseModel):
    phone: str = Field(..., description="10-digit mobile number")
    name: Optional[str] = None


class CustomerSendOTPReq(BaseModel):
    phone: str = Field(..., description="10-digit mobile number")


class CustomerVerifyOTPReq(BaseModel):
    phone: str
    otp_code: str
    name: Optional[str] = None


class CustomerAddressCreate(BaseModel):
    label: str = "Home"  # 'Home', 'Work', 'Hostel', 'Other'
    address_line: str
    landmark: Optional[str] = None
    is_default: bool = False


class CustomerAddressOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    label: str
    address_line: str
    landmark: Optional[str] = None
    is_default: bool
    created_at: datetime.datetime


class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    phone: str
    name: Optional[str] = None
    email: Optional[str] = None
    default_address: Optional[str] = None
    created_at: datetime.datetime
    last_order_at: Optional[datetime.datetime] = None
    addresses: List[CustomerAddressOut] = []


class CustomerAuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    customer: CustomerOut


# ==========================================
# COUPON / PROMO CODE SCHEMAS
# ==========================================

class CouponCreate(BaseModel):
    outlet_id: Optional[int] = None
    code: str = Field(..., min_length=2, max_length=50, description="Coupon Code e.g. WELCOME50")
    description: Optional[str] = None
    discount_type: str = "flat"  # 'flat' (paise) or 'percent'
    discount_value: int = Field(..., gt=0, description="Discount in paise (e.g. 5000 = ₹50) or percent (e.g. 10 = 10%)")
    min_order_paise: int = Field(default=0, ge=0)
    max_discount_paise: Optional[int] = None
    usage_limit: Optional[int] = None
    is_active: bool = True


class CouponOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    outlet_id: Optional[int] = None
    code: str
    description: Optional[str] = None
    discount_type: str
    discount_value: int
    min_order_paise: int
    max_discount_paise: Optional[int] = None
    usage_limit: Optional[int] = None
    times_used: int
    is_active: bool
    created_at: datetime.datetime


class CouponValidateReq(BaseModel):
    code: str
    subtotal_paise: int
    outlet_id: Optional[int] = None


class CouponValidateResponse(BaseModel):
    valid: bool
    code: str
    discount_type: str
    discount_value: int
    discount_paise: int
    message: str




# ==========================================
# TABLE RESERVATION / PRE-BOOKING SCHEMAS
# ==========================================

class TableReservationCreate(BaseModel):
    outlet_id: int = 1
    customer_name: str = Field(..., min_length=2, max_length=100)
    customer_phone: str = Field(..., min_length=10, max_length=20)
    customer_email: Optional[str] = None
    party_size: int = Field(..., ge=1, le=50)
    reservation_date: str = Field(..., description="Date formatted as YYYY-MM-DD")
    reservation_time: str = Field(..., description="Time formatted as HH:MM e.g. 19:30")
    seating_preference: str = "standard"  # 'majlis', 'family_ac', 'terrace', 'standard'
    occasion: Optional[str] = "casual"
    special_requests: Optional[str] = None


class TableReservationStatusUpdate(BaseModel):
    status: str = Field(..., description="'confirmed', 'seated', 'cancelled', 'completed'")
    table_id: Optional[int] = None


class TableReservationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    outlet_id: int
    reservation_number: str
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    party_size: int
    reservation_date: str
    reservation_time: str
    seating_preference: str
    occasion: Optional[str] = None
    special_requests: Optional[str] = None
    table_id: Optional[int] = None
    table_label: Optional[str] = None
    status: str
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None
