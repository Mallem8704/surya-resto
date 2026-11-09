# 🏛️ Hospitality & Restaurant Management Platform: System Extraction & Next.js Unification Blueprint

> **System Target**: Surya Family Restaurant Kadiri & Multi-Tenant Hospitality Engine  
> **Source Architecture**: Distributed (FastAPI on Render + Next.js on Vercel + Local SQLite + Supabase PostgreSQL)  
> **Target Architecture**: Single Unified Standalone Next.js 16 (App Router + Server Actions + Supabase/Prisma)

---

# 📑 Table of Contents
1. [Module 1: Database Schema & Entity Relational Extraction (Prompt 1)](#module-1-database-schema--entity-relational-extraction)
2. [Module 2: Backend API, Controllers & Business Logic Extraction (Prompt 2)](#module-2-backend-api-controllers--business-logic-extraction)
3. [Module 3: Frontend Page Hierarchy, State & API Client Mapping (Prompt 3)](#module-3-frontend-page-hierarchy-state--api-client-mapping)
4. [Module 4: Auth, Third-Party Integrations & Environment Matrix (Prompt 4)](#module-4-auth-third-party-integrations--environment-matrix)
5. [Module 5: Critical User Flows & Concurrency Synthesis (Prompt 5)](#module-5-critical-user-flows--concurrency-synthesis)
6. [Module 6: Master Unification & Next.js Target Blueprint (Prompt 6)](#module-6-master-unification--nextjs-target-blueprint)

---

# Module 1: Database Schema & Entity Relational Extraction

## 1.1 Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    OUTLETS ||--o{ USERS : "employs"
    OUTLETS ||--o{ TABLES : "houses"
    OUTLETS ||--o{ CATEGORIES : "organizes"
    OUTLETS ||--o{ MENU_ITEMS : "offers"
    OUTLETS ||--o{ ORDERS : "fulfills"
    OUTLETS ||--o{ TABLE_RESERVATIONS : "books"
    OUTLETS ||--o{ CASHIER_SHIFTS : "tracks"
    OUTLETS ||--o{ AUDIT_LOGS : "logs"

    CATEGORIES ||--o{ MENU_ITEMS : "contains"
    
    MENU_ITEMS ||--o{ MENU_ITEM_VARIANTS : "has portion"
    MENU_ITEMS ||--o{ MENU_ITEM_ADDONS : "has extras"
    MENU_ITEMS ||--o{ STOCK_LOGS : "tracks inventory"
    MENU_ITEMS ||--o{ ORDER_ITEMS : "ordered as"

    TABLES ||--o{ ORDERS : "seats"
    TABLES ||--o{ SERVICE_CALLS : "rings buzzer"
    TABLES ||--o{ TABLE_RESERVATIONS : "reserved for"

    CUSTOMERS ||--o{ CUSTOMER_ADDRESSES : "delivers to"
    CUSTOMERS ||--o{ ORDERS : "places"
    
    COUPONS ||--o{ ORDERS : "discounts"

    ORDERS ||--o{ ORDER_ITEMS : "comprises"
    ORDERS ||--o{ PAYMENTS : "settled by"
    
    USERS ||--o{ AUDIT_LOGS : "performs"
    USERS ||--o{ CASHIER_SHIFTS : "operates"
```

---

## 1.2 Comprehensive Data Dictionary

| Entity | Field | Type | Nullable | Default | Relations / Constraints | Business Description |
|---|---|---|---|---|---|---|
| **outlets** | `id` | INTEGER | No | PK Auto | `PK` | Unique restaurant/property outlet identifier |
| | `name` | VARCHAR(100) | No | None | None | Property legal name (e.g., Surya Family Restaurant) |
| | `address` | VARCHAR(255) | Yes | None | None | Physical location address |
| | `phone` | VARCHAR(20) | Yes | None | None | Primary contact phone number |
| | `currency` | VARCHAR(10) | Yes | "INR" | None | Currency code for monetary transactions |
| | `tax_rate_percent` | INTEGER | Yes | 5 | None | Statutory GST/VAT percentage |
| | `opening_hours` | VARCHAR(100) | Yes | None | None | Operating hours display string |
| | `tagline` | VARCHAR(255) | Yes | None | None | Marketing slogan |
| | `logo_url` | VARCHAR(500) | Yes | None | None | Property branding logo asset URI |
| | `gstin` | VARCHAR(30) | Yes | None | None | Tax compliance GSTIN registration |
| | `fssai_license_number`| VARCHAR(30) | Yes | None | None | Food Safety and Standards Authority license |
| | `upi_vpa` | VARCHAR(100) | Yes | None | None | Merchant UPI Virtual Payment Address (e.g., `9880358634@upi`) |
| | `allow_table_booking` | BOOLEAN | Yes | FALSE | None | Flag enabling customer table reservations |
| | `allow_table_ordering`| BOOLEAN | Yes | FALSE | None | Flag enabling in-premise QR dining |
| | `allow_delivery` | BOOLEAN | Yes | TRUE | None | Flag enabling online delivery/takeaway orders |
| | `created_at` | TIMESTAMP | Yes | UTC Now | None | Record creation timestamp |
| **users** | `id` | INTEGER | No | PK Auto | `PK` | Staff / Admin user ID |
| | `outlet_id` | INTEGER | No | None | `FK -> outlets.id` | Scoped restaurant property branch |
| | `name` | VARCHAR(100) | No | None | None | User legal name |
| | `email` | VARCHAR(150) | No | None | `UNIQUE`, Indexed | Official login email |
| | `password_hash` | VARCHAR(255) | No | None | None | Bcrypt salted password hash |
| | `role` | VARCHAR(20) | Yes | "staff" | None | System role: `owner` or `staff` |
| | `created_at` | TIMESTAMP | Yes | UTC Now | None | User onboarding timestamp |
| **tables** | `id` | INTEGER | No | PK Auto | `PK` | Dining room table identifier |
| | `outlet_id` | INTEGER | No | None | `FK -> outlets.id` | Associated outlet branch |
| | `label` | VARCHAR(50) | No | None | `UQ(outlet_id, label)` | Display tag (e.g., "T1", "T2", "Majlis 1") |
| | `qr_code_url` | VARCHAR(255) | Yes | None | None | Pre-generated table QR direct link |
| | `status` | VARCHAR(20) | Yes | "free" | None | Physical state: `free`, `occupied`, `reserved` |
| | `active_order_id` | INTEGER | Yes | None | None | ID of active uncompleted dining bill |
| | `created_at` | TIMESTAMP | Yes | UTC Now | None | Timestamp |
| **categories** | `id` | INTEGER | No | PK Auto | `PK` | Menu category identifier |
| | `outlet_id` | INTEGER | No | None | `FK -> outlets.id` | Scoped outlet branch |
| | `name` | VARCHAR(100) | No | None | `UQ(outlet_id, name)` | Category title (English) |
| | `name_te` | VARCHAR(100) | Yes | None | None | Category title (Telugu translation) |
| | `sort_order` | INTEGER | Yes | 0 | None | UI display sequence index |
| | `is_active` | BOOLEAN | Yes | TRUE | None | Visibility toggle |
| | `created_at` | TIMESTAMP | Yes | UTC Now | None | Timestamp |
| **menu_items** | `id` | INTEGER | No | PK Auto | `PK` | Master dish / product SKU ID |
| | `outlet_id` | INTEGER | No | None | `FK -> outlets.id` | Scoped outlet branch |
| | `category_id` | INTEGER | No | None | `FK -> categories.id` | Category assignment |
| | `name` | VARCHAR(120) | No | None | None | Dish name (English) |
| | `name_te` | VARCHAR(120) | Yes | None | None | Dish name (Telugu) |
| | `description` | TEXT | Yes | None | None | Culinary description |
| | `description_te` | TEXT | Yes | None | None | Culinary description in Telugu |
| | `price_paise` | INTEGER | No | None | None | Base price in Indian Paise (`₹1 = 100 paise`) |
| | `image_url` | VARCHAR(255) | Yes | None | None | High-res food photograph URI |
| | `is_veg` | BOOLEAN | Yes | TRUE | None | Dietary flag (Veg vs Non-Veg) |
| | `is_available` | BOOLEAN | Yes | TRUE | None | Live 86/stock availability status |
| | `has_variants` | BOOLEAN | Yes | FALSE | None | Whether dish has portion sizes |
| | `track_stock` | BOOLEAN | Yes | FALSE | None | Enable strict inventory depletion |
| | `stock_qty` | INTEGER | Yes | 100 | None | Current unit inventory count |
| | `low_stock_threshold`| INTEGER | Yes | 10 | None | Alert threshold trigger |
| | `is_special` | BOOLEAN | Yes | FALSE | None | Chef recommendation badge |
| | `created_at` | TIMESTAMP | Yes | UTC Now | None | Timestamp |
| **menu_item_variants** | `id` | INTEGER | No | PK Auto | `PK` | Portion SKU ID |
| | `item_id` | INTEGER | No | None | `FK -> menu_items.id` | Parent dish foreign key (`ON DELETE CASCADE`) |
| | `name` | VARCHAR(100) | No | None | None | Variant name (Single, Full, Family Pack) |
| | `name_te` | VARCHAR(100) | Yes | None | None | Telugu variant name |
| | `price_paise` | INTEGER | No | None | None | Explicit variant price in paise |
| | `is_default` | BOOLEAN | Yes | FALSE | None | Default portion selection flag |
| | `is_available` | BOOLEAN | Yes | TRUE | None | Specific portion stock toggle |
| **menu_item_addons** | `id` | INTEGER | No | PK Auto | `PK` | Customization option ID |
| | `item_id` | INTEGER | No | None | `FK -> menu_items.id` | Parent dish foreign key (`ON DELETE CASCADE`) |
| | `name` | VARCHAR(100) | No | None | None | Extra add-on (e.g. Extra Egg, Extra Salan) |
| | `name_te` | VARCHAR(100) | Yes | None | None | Telugu addon name |
| | `price_paise` | INTEGER | No | 0 | None | Addon surcharge in paise |
| | `is_available` | BOOLEAN | Yes | TRUE | None | Availability toggle |
| **orders** | `id` | INTEGER | No | PK Auto | `PK` | Master order transaction ID |
| | `outlet_id` | INTEGER | No | None | `FK -> outlets.id` | Outlet branch identifier |
| | `table_id` | INTEGER | Yes | None | `FK -> tables.id` | Table ID for dine-in (`SET NULL`) |
| | `idempotency_key` | VARCHAR(100) | Yes | None | `UNIQUE`, Indexed | Client checkout deduplication token |
| | `order_type` | VARCHAR(20) | Yes | "dine_in" | Indexed | Channel: `dine_in`, `delivery`, `takeaway` |
| | `customer_name` | VARCHAR(100) | Yes | None | None | Customer billing name |
| | `customer_phone` | VARCHAR(20) | Yes | None | Indexed | 10-digit mobile contact |
| | `delivery_address` | TEXT | Yes | None | None | Drop-off physical location |
| | `delivery_status` | VARCHAR(30) | Yes | "pending" | None | Logistics: `pending`, `out_for_delivery`, `delivered` |
| | `delivery_fee_paise`| INTEGER | Yes | 0 | None | Delivery surcharge in paise |
| | `order_number` | VARCHAR(30) | No | None | `UNIQUE`, Indexed | Human-readable sequential token (e.g. `ORD-8742`) |
| | `status` | VARCHAR(30) | Yes | "placed" | Indexed | Lifecycle: `placed`, `accepted`, `preparing`, `ready`, `out_for_delivery`, `delivered`, `served`, `cancelled` |
| | `subtotal_paise` | INTEGER | Yes | 0 | None | Sum of line items before discount/tax |
| | `tax_paise` | INTEGER | Yes | 0 | None | Computed GST amount in paise |
| | `discount_paise` | INTEGER | Yes | 0 | None | Applied promotional deduction |
| | `coupon_code` | VARCHAR(50) | Yes | None | None | Applied voucher code |
| | `coupon_id` | INTEGER | Yes | None | `FK -> coupons.id` | Coupon reference |
| | `customer_id` | INTEGER | Yes | None | `FK -> customers.id` | Scoped loyalty customer reference |
| | `total_paise` | INTEGER | Yes | 0 | None | Net payable amount in paise |
| | `payment_status` | VARCHAR(20) | Yes | "pending" | None | `pending`, `paid`, `failed` |
| | `payment_method` | VARCHAR(20) | Yes | "counter" | None | `upi`, `card`, `cash`, `counter`, `cod` |
| | `customer_notes` | TEXT | Yes | None | None | Cooking & allergy instructions |
| | `synced_to_cloud` | BOOLEAN | Yes | FALSE | Indexed | Flag indicating sync to Supabase Postgres |
| | `created_at` | TIMESTAMP | Yes | UTC Now | Indexed | Order placement time |
| | `updated_at` | TIMESTAMP | Yes | UTC Now | None | Last state transition time |
| **order_items** | `id` | INTEGER | No | PK Auto | `PK` | Order line item ID |
| | `order_id` | INTEGER | No | None | `FK -> orders.id` | Parent order reference (`CASCADE`) |
| | `item_id` | INTEGER | Yes | None | `FK -> menu_items.id` | Dish SKU reference (`SET NULL`) |
| | `variant_id` | INTEGER | Yes | None | None | Chosen portion variant ID |
| | `variant_name` | VARCHAR(100) | Yes | None | None | Snapshot portion string (e.g., "Full") |
| | `selected_addons_json`| TEXT | Yes | None | None | Serialized JSON array of chosen addons |
| | `item_name` | VARCHAR(120) | No | None | None | Snapshot dish name at time of sale |
| | `qty` | INTEGER | Yes | 1 | None | Quantity ordered |
| | `unit_price_paise`| INTEGER | No | None | None | Snapshot unit rate |
| | `total_price_paise`| INTEGER | No | None | None | Line item total (`unit_price * qty + addons`) |
| | `notes` | VARCHAR(255) | Yes | None | None | Line item spice request |
| **payments** | `id` | INTEGER | No | PK Auto | `PK` | Payment settlement receipt ID |
| | `order_id` | INTEGER | No | None | `FK -> orders.id` | Associated bill reference |
| | `method` | VARCHAR(30) | Yes | "counter" | None | Channel: `upi`, `card`, `cash` |
| | `txn_id` | VARCHAR(100) | Yes | None | None | External 12-digit UPI UTR or Gateway Ref |
| | `amount_paise` | INTEGER | No | None | None | Transaction settlement amount |
| | `status` | VARCHAR(20) | Yes | "completed" | None | `pending`, `completed`, `failed`, `refunded` |
| | `paid_at` | TIMESTAMP | Yes | UTC Now | Indexed | Settlement timestamp |
| | `notes` | VARCHAR(255) | Yes | None | None | Cash tender or soundbox notes |
| | `synced_to_cloud` | BOOLEAN | Yes | FALSE | Indexed | Cloud sync status |
| **customers** | `id` | INTEGER | No | PK Auto | `PK` | CRM profile ID |
| | `phone` | VARCHAR(20) | No | None | `UNIQUE`, Indexed | 10-digit primary identity key |
| | `name` | VARCHAR(100) | Yes | None | None | Customer full name |
| | `email` | VARCHAR(120) | Yes | None | None | Email address |
| | `default_address` | TEXT | Yes | None | None | Primary saved delivery address |
| | `hashed_password`| VARCHAR(255) | Yes | None | None | Optional customer portal password hash |
| | `last_order_at` | TIMESTAMP | Yes | None | None | Recency tracking |
| **table_reservations** | `id` | INTEGER | No | PK Auto | `PK` | Booking reference ID |
| | `outlet_id` | INTEGER | No | None | `FK -> outlets.id` | Scoped outlet branch |
| | `reservation_number` | VARCHAR(50) | No | None | `UNIQUE`, Indexed | Public booking code (e.g. `RES-1892`) |
| | `customer_name` | VARCHAR(100) | No | None | None | Guest name |
| | `customer_phone` | VARCHAR(20) | No | None | Indexed | Contact mobile number |
| | `party_size` | INTEGER | No | 2 | None | Number of guests |
| | `reservation_date`| VARCHAR(20) | No | None | Indexed | Target date (`YYYY-MM-DD`) |
| | `reservation_time`| VARCHAR(20) | No | None | None | Target 24h slot (`HH:MM`) |
| | `seating_preference` | VARCHAR(50) | Yes | "standard" | None | `majlis`, `family_ac`, `terrace`, `standard` |
| | `table_id` | INTEGER | Yes | None | `FK -> tables.id` | Allocated table |
| | `status` | VARCHAR(20) | Yes | "confirmed" | None | `confirmed`, `seated`, `cancelled`, `completed` |
| **cashier_shifts** | `id` | INTEGER | No | PK Auto | `PK` | Cashier shift register session |
| | `outlet_id` | INTEGER | No | None | `FK -> outlets.id` | Branch reference |
| | `cashier_id` | INTEGER | No | None | `FK -> users.id` | Operating cashier user |
| | `cashier_name` | VARCHAR(100) | No | None | None | Cashier display name |
| | `status` | VARCHAR(20) | Yes | "open" | Indexed | Shift status: `open`, `closed` |
| | `opening_float_paise`| INTEGER | Yes | 0 | None | Cash drawer starting amount |
| | `cash_sales_paise`| INTEGER | Yes | 0 | None | Total cash collected |
| | `upi_sales_paise` | INTEGER | Yes | 0 | None | Total UPI collected |
| | `actual_cash_paise`| INTEGER | Yes | None | None | Physical count at shift close |
| | `difference_paise`| INTEGER | Yes | None | None | Cash drawer variance (`actual - expected`) |
| | `denominations_json` | TEXT | Yes | None | None | Breakdown of currency notes (500, 200, 100, etc.) |

---

## 1.3 Core Enumerations & Value Sets

- **OrderType**: `'dine_in'` | `'delivery'` | `'takeaway'`
- **OrderStatus**: `'placed'` ➔ `'accepted'` ➔ `'preparing'` ➔ `'ready'` ➔ (`'out_for_delivery'` ➔ `'delivered'`) | `'served'` | `'cancelled'`
- **PaymentStatus**: `'pending'` | `'paid'` | `'failed'`
- **PaymentMethod**: `'upi'` | `'card'` | `'cash'` | `'counter'` | `'cod'`
- **TableStatus**: `'free'` | `'occupied'` | `'reserved'`
- **ReservationStatus**: `'confirmed'` | `'seated'` | `'cancelled'` | `'completed'`
- **ServiceCallType**: `'waiter'` | `'bill'` | `'water'` | `'clean'`
- **UserRole**: `'owner'` | `'staff'`

---

## 1.4 Concurrency & Data Integrity Hazards

1. **Double-Checkout on Slow Networks**: If a mobile customer taps "Pay & Order" multiple times on a spotty 4G connection, duplicate orders could be created.  
   *Mitigation in Schema*: `orders.idempotency_key` with a `UNIQUE` index blocks duplicates at the database level.
2. **Table Allocation Race Condition**: Multiple customers scanning different tables or placing reservations for the same table at the same timestamp.  
   *Mitigation in Schema*: `tables.active_order_id` and `table_reservations.reservation_date + reservation_time` indexing.
3. **Inventory Race Condition (86ing a dish)**: Simultaneous orders placed for the last portion of Biryani.  
   *Mitigation in Schema*: Explicit atomic decrement in `menu_items.stock_qty` with `track_stock` checks.

---

# Module 2: Backend API, Controllers & Business Logic Extraction

## 2.1 API Catalog (84 Endpoint Master Matrix)

### Authentication & Tenant Scoping (`/api/auth`)
| Method | Endpoint | Auth Required | Request Payload | Response Schema | Service Action |
|---|---|---|---|---|---|
| `POST` | `/api/auth/login` | Public | `{email, password}` | `{access_token, token_type, user}` | Bcrypt validation & JWT issuance |
| `GET` | `/api/auth/me` | Authenticated | None | `UserOut` | Returns current staff profile |
| `POST` | `/api/auth/change-password` | Authenticated | `{current_password, new_password}` | `{message}` | Password rotation with audit log |
| `POST` | `/api/auth/refresh` | Authenticated | Bearer Refresh Token | `{access_token}` | JWT renewal |
| `GET` | `/api/auth/owner-check` | Owner | None | `{status: "ok"}` | RBAC gatekeeper |
| `POST` | `/api/auth/switch-branch` | Authenticated | `{target_outlet_id, admin_password}` | `{access_token, outlet}` | Multi-property branch switching |

### Menu & Portion Catalog (`/api/menu`)
| Method | Endpoint | Auth Required | Request Payload | Response Schema | Service Action |
|---|---|---|---|---|---|
| `GET` | `/api/menu` | Public | Query: `category_id`, `is_veg`, `search` | `List[MenuItemOut]` | Serves full 179-item bilingual catalog |
| `GET` | `/api/menu/{id}` | Public | None | `MenuItemOut` | Returns dish with variants & addons |
| `POST` | `/api/menu` | Owner | `MenuItemCreate` | `MenuItemOut` | Creates master dish SKU |
| `PUT` | `/api/menu/{id}` | Staff/Owner | `MenuItemUpdate` | `MenuItemOut` | Edits dish name, price, description |
| `PATCH` | `/api/menu/{id}/availability` | Staff/Owner | `{is_available: bool}` | `MenuItemOut` | 1-click 86 stock toggle + WS broadcast |
| `POST` | `/api/menu/{id}/variants` | Owner | `{name, name_te, price_paise}` | `VariantOut` | Creates portion size (Single/Full/Family) |
| `PUT` | `/api/menu/variants/{vid}`| Owner | `{name, price_paise}` | `VariantOut` | Updates portion rate |
| `DELETE` | `/api/menu/variants/{vid}`| Owner | None | `{message}` | Removes portion size |
| `POST` | `/api/menu/{id}/addons` | Owner | `{name, name_te, price_paise}` | `AddonOut` | Creates dish addon |
| `POST` | `/api/menu/upload-image` | Staff/Owner | `multipart/form-data` | `{image_url}` | Stores food photo to disk/bucket |

### Dining Tables & Floor Plan (`/api/tables`)
| Method | Endpoint | Auth Required | Request Payload | Response Schema | Service Action |
|---|---|---|---|---|---|
| `GET` | `/api/tables` | Public | None | `List[TableOut]` | Returns table floor map with status |
| `GET` | `/api/tables/{id}` | Public | None | `TableOut` | Table detail & active order reference |
| `POST` | `/api/tables` | Owner | `{label}` | `TableOut` | Generates new dining table & QR URL |
| `PATCH` | `/api/tables/{id}/status` | Staff/Owner | `{status: "free"|"occupied"}` | `TableOut` | Updates visual floor map status |
| `POST` | `/api/tables/{id}/call` | Public | `{call_type: "waiter"|"bill"}`| `ServiceCallOut`| Customer buzzer notification + WS push |
| `PATCH` | `/api/tables/service-calls/{id}/attend` | Staff/Owner | None | `ServiceCallOut` | Cashier dismisses table call buzzer |

### Order Processing Engine (`/api/orders`)
| Method | Endpoint | Auth Required | Request Payload | Response Schema | Service Action |
|---|---|---|---|---|---|
| `POST` | `/api/orders` | Public / Guest | `OrderCreate` (Items, Address, Notes, Idempotency) | `OrderOut` | Validates stock, calculates tax/discounts, creates order, dispatches WS alert |
| `GET` | `/api/orders` | Staff/Owner | Query: `status`, `channel`, `date` | `List[OrderOut]` | Cashier & KDS live order feed |
| `GET` | `/api/orders/{id}` | Public | None | `OrderOut` | Real-time order tracking & receipt view |
| `PATCH` | `/api/orders/{id}/status` | Staff/Owner | `{status: "preparing"|"ready"}`| `OrderOut` | KDS stage progression + WS push |
| `POST` | `/api/orders/{id}/cancel` | Staff/Owner | `{reason}` | `OrderOut` | Restores stock, cancels order |

### Cashier Payments & Soundbox Settlement (`/api/payments`)
| Method | Endpoint | Auth Required | Request Payload | Response Schema | Service Action |
|---|---|---|---|---|---|
| `POST` | `/api/payments/create-razorpay-order` | Public | `{order_id}` | `{razorpay_order_id, amount}` | Gateway order initiation |
| `POST` | `/api/payments/verify-razorpay-payment` | Public | `{razorpay_order_id, payment_id, signature}` | `{status: "paid"}` | HMAC-SHA256 signature verification |
| `POST` | `/api/payments/submit-upi-ref` | Public | `{order_id, utr_number}` | `{status: "verification_pending"}` | Customer submits 12-digit bank UTR |
| `POST` | `/api/payments/verify-upi` | Staff/Owner | `{order_id, is_approved}` | `PaymentOut` | Soundbox/cashier confirms receipt |
| `POST` | `/api/payments/cash-tender` | Staff/Owner | `{order_id, tendered_amount}`| `PaymentOut` | Calculates change & marks paid |

### Customer Portal & CRM (`/api/customer`)
| Method | Endpoint | Auth Required | Request Payload | Response Schema | Service Action |
|---|---|---|---|---|---|
| `POST` | `/api/customer/check-phone` | Public | `{phone}` | `{exists: bool, name}` | Zero-friction phone lookup |
| `POST` | `/api/customer/quick-login` | Public | `{phone, name}` | `{customer, token}` | Zero OTP 1-tap onboarding |
| `POST` | `/api/customer/login` | Public | `{phone, password}` | `{customer, token}` | Standard customer authentication |
| `GET` | `/api/customer/orders` | Public | Headers: `x-customer-phone` | `List[OrderOut]` | Customer repeat order history |
| `POST` | `/api/customer/address` | Public | `AddressCreate` | `AddressOut` | Saves delivery address |

### Table Reservations (`/api/reservations`)
| Method | Endpoint | Auth Required | Request Payload | Response Schema | Service Action |
|---|---|---|---|---|---|
| `POST` | `/api/reservations` | Public | `ReservationCreate` | `ReservationOut` | Confirms booking + WhatsApp summary |
| `GET` | `/api/reservations` | Staff/Owner | Query: `date`, `status` | `List[ReservationOut]` | Staff floor reservation ledger |
| `PATCH` | `/api/reservations/{id}/status` | Staff/Owner | `{status: "seated"|"cancelled"}`| `ReservationOut` | Updates booking lifecycle |

### Real-time WebSockets (`/ws`)
| Protocol | Endpoint | Auth | Purpose |
|---|---|---|---|
| `WS` | `/ws` | Optional Token | Broadcasts: `NEW_ORDER`, `ORDER_STATUS_CHANGED`, `SERVICE_CALL`, `STOCK_DEPLETED` |

---

## 2.2 Middleware Pipeline
1. **CORS Middleware**: Allows `suryafamilyrestaurant.com`, Vercel preview URLs, and localhost ports (3000, 3001, 3002, 3010).
2. **Audit Trail Middleware**: Automatically logs all mutating POST/PUT/DELETE operations on financial and menu entities into `audit_logs`.
3. **Global Error Boundary**: Catch-all handler intercepting unhandled Python exceptions, translating them to RFC 7807 problem details JSON with UTC timestamps.

---

# Module 3: Frontend Page Hierarchy, State & API Client Mapping

## 3.1 Frontend Route & Persona Matrix

| Route Path | View Name | Target Persona | Guard / Auth | Business Functionality |
|---|---|---|---|---|
| `/` | Landing Page | Public Diners | None | Brand showcase, menu preview, direction map, branch contact |
| `/order` | Table QR Ordering | Dine-in Diners | None (Table param optional) | Bilingual 3D menu catalog, portion customizer, cart, NPCI UPI checkout |
| `/delivery` | Online Delivery | Takeaway Diners | None | Delivery address selector, delivery fee calculator, order tracking |
| `/book-table` | Reservations | Event Guests | None | Date/time slot selector, party size, seating preference (Majlis/Family AC) |
| `/captain` | Waiter Mobile POS | Service Captains | Staff / Pin | Fast tap-to-punch table orders, table transfer, instant KOT firing |
| `/admin/login` | Admin Login | Staff & Owners | Public | Split credentials for Owner and Staff with branch selector |
| `/admin/pos` | Cashier POS Cockpit| Billing Cashiers | Staff / Owner | Soundbox UPI reconciler, split billing, 80mm/58mm silent thermal print |
| `/admin/kds` | Kitchen Display | Kitchen Chefs | Staff / Owner | High-contrast visual order tickets, cooking timers, acoustic alert chimes |
| `/admin/orders`| Order Manager | Floor Managers | Staff / Owner | Filter by channel (Dine-in, Takeaway, Delivery), print duplicates |
| `/admin/menu` | Menu Catalog | Owners | Owner Only | Price adjustment, Telugu name editing, image upload, portion variants |
| `/admin/tables`| Floor Plan & QR | Floor Managers | Staff / Owner | 12-table visual layout, occupancy monitor, printable table QR cards |
| `/admin/stock` | Stock Out (86ing) | Kitchen Staff | Staff / Owner | Instant 1-tap dish disablement during rush hours |
| `/admin/payments`| Payment Ledger | Cashiers / Owner | Staff / Owner | Cash register shift reconciliation, UTR confirmation |
| `/admin/customers`| Customer CRM | Marketing / Owner | Owner Only | Diner phone directory, lifetime spend rankings, favorite dishes |
| `/admin/analytics`| Sales Dashboard | Owner | Owner Only | Hourly sales heatmaps, dish leaderboard, payment breakdown |
| `/admin/audit` | Security Audit | Owner | Owner Only | Immutable audit trail of cashier cancellations and price edits |
| `/admin/settings`| Store Settings | Owner | Owner Only | UPI VPA (`9880358634@upi`), GSTIN, service toggles |

---

## 3.2 State Management Architecture

```mermaid
graph TD
    subgraph Global Context Providers
        AuthContext["AuthContext (JWT, Staff Role, Current Branch)"]
        CustomerContext["CustomerContext (Phone, Name, Delivery Addresses)"]
        LanguageContext["LanguageContext ('en' vs 'te' Telugu Toggle)"]
        OfflineContext["OfflineContext (Online/Offline Navigator & Sync Queue)"]
        ToastContext["ToastContext (Universal Notifications & Audio Alerts)"]
    end

    subgraph Real-Time WebSockets
        useSockets["useSockets Hook (Connects to /ws)"]
        useAdminLiveState["useAdminLiveState (Kitchen Tickets, Live Table Occupancy)"]
    end

    AuthContext --> useAdminLiveState
    useSockets --> useAdminLiveState
```

- **Static Fallback Dataset (`frontend/lib/suryaMenuData.ts`)**: In the event of backend network latency or cloud cold starts, the customer ordering screen, delivery view, and POS cockpit immediately render the complete **179-item offline catalog in 0ms**, guaranteeing zero blank screens.

---

# Module 4: Auth, Third-Party Integrations & Environment Matrix

## 4.1 Authentication Architecture
- **Staff / Owner Authentication**: Standard JWT Bearer tokens issued via `/api/auth/login`. Token contains `{sub: user_id, email, role: 'owner'|'staff', outlet_id}`. Stored in `localStorage` under `surya_token`.
- **Customer Identity (Zero OTP Protocol)**: Customers log in seamlessly using their 10-digit mobile number and name. Tokens are cached client-side in `localStorage` under `surya_customer_session`, eliminating SMS gateway costs.

---

## 4.2 Third-Party Integrations Directory

| Provider | Purpose | Integration Method | Webhook / Endpoint |
|---|---|---|---|
| **Direct NPCI UPI** | 0% Fee Payment Processing | Client-side dynamic UPI QR specification (`upi://pay?pa=9880358634@upi&am=...`) | Handled via manual 12-digit UTR submission (`/api/payments/submit-upi-ref`) |
| **WhatsApp Intent** | Free Customer Receipts | Client-side URI Scheme (`https://wa.me/919880358634?text=...`) | Zero Meta API cost; formats order items, total, and delivery address |
| **Razorpay** | Optional Online Card/NetBanking | Razorpay Standard Checkout SDK + Server Verification | `/api/payments/verify-razorpay-payment` |
| **Supabase Postgres** | Persistent Cloud Backup | Hybrid Sync Engine (`sync_engine.py`) over HTTPS | `/api/sync/trigger` |
| **Web Audio API** | Kitchen Chimes & Soundbox | HTML5 Audio Synthesizer in `sound.ts` | Triggers distinct acoustic tones for New Order, UPI Received, and Alert |

---

## 4.3 Unified Environment Variable Master Catalog

```ini
# ==============================================================================
# UNIFIED STANDALONE NEXT.JS ENVIRONMENT VARIABLES (.env.production)
# ==============================================================================

# Database Connection (Direct Connection & Supabase PgBouncer Pooler)
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.poexygwbosuxbezeastc.supabase.co:5432/postgres?sslmode=require"
DIRECT_URL="postgresql://postgres:YOUR_PASSWORD@db.poexygwbosuxbezeastc.supabase.co:5432/postgres?sslmode=require"

# Cryptographic Token Signing
NEXTAUTH_SECRET="77195425c31ee934beb41847fea72610c5c6f94ff173cc896ae81871e7115837"
JWT_ALGORITHM="HS256"
JWT_EXPIRE_MINUTES="1440"

# Canonical Domain Settings
NEXT_PUBLIC_SITE_URL="https://suryafamilyrestaurant.com"

# Merchant NPCI UPI Settings
NEXT_PUBLIC_UPI_VPA="9880358634@upi"
NEXT_PUBLIC_MERCHANT_NAME="Surya Family Restaurant"
MERCHANT_PHONE="+919880358634"

# Feature Flags
NEXT_PUBLIC_ENABLE_ONLINE_ORDERING="true"
NEXT_PUBLIC_ENABLE_TABLE_BOOKING="false"
NEXT_PUBLIC_ENABLE_TABLE_ORDERING="false"

# Optional Cloud Realtime (Supabase)
NEXT_PUBLIC_SUPABASE_URL="https://poexygwbosuxbezeastc.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_gmrvTKp0DnRvIbZ6JMTamg_EJjxcMjz"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SUPABASE_SERVICE_ROLE_KEY"
```

---

# Module 5: Critical User Flows & Concurrency Synthesis

## 5.1 End-to-End Guest Booking & Dining Flow

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Guest (Mobile Phone)
    participant UI as Next.js Dine-in UI (/order)
    participant API as Next.js Order API (/api/orders)
    participant DB as Database (Postgres/SQLite)
    participant KDS as Kitchen Display & Cashier POS
    actor Staff as Restaurant Staff

    Customer->>UI: Scans Table QR Stand (e.g. Table T1)
    UI->>UI: Loads Menu with 0ms First-Paint (suryaMenuData)
    Customer->>UI: Customizes Portions (Single / Full) & Adds to Cart
    Customer->>UI: Selects Payment: "NPCI Dynamic UPI"
    UI->>API: POST /api/orders (idempotency_key, items, table_id="T1")
    API->>DB: Check stock & create Order (status="placed", payment="pending")
    API-->>UI: Returns Order #ORD-8421 + UPI Intent String
    API-)KDS: Realtime Event: NEW_ORDER (Audio Chime)
    UI->>Customer: Displays Dynamic UPI QR Code (₹220 to 9880358634@upi)
    Customer->>Customer: Opens PhonePe/GPay & Completes Payment
    Customer->>UI: Submits 12-Digit Bank UTR (e.g., 429182749102)
    UI->>API: POST /api/payments/submit-upi-ref
    API-)KDS: Realtime Event: UPI_PAYMENT_PENDING
    Staff->>KDS: Checks Soundbox / SMS & Clicks "Verify UPI"
    KDS->>API: PATCH /api/orders/8421 (status="preparing", payment="paid")
    API->>DB: Commit payment & deduct item stock
    API-)UI: Realtime Event: ORDER_ACCEPTED
    UI->>Customer: Shows Live Kitchen Status ("Preparing in Kitchen 👨‍🍳")
```

---

## 5.2 Reservation & Table Allocation Flow

```mermaid
sequenceDiagram
    autonumber
    actor Guest as Event Guest
    participant Web as /book-table
    participant Server as /api/reservations
    participant DB as Database
    actor Manager as Restaurant Manager

    Guest->>Web: Selects Date (2026-11-15), Time (20:00), Party (6), Seating ("Family AC")
    Web->>Server: POST /api/reservations
    Server->>DB: Check overlapping bookings for requested slot
    Server->>DB: INSERT into table_reservations (status="confirmed")
    Server-->>Web: Confirmed! Voucher Code: RES-7419
    Web->>Guest: Prompts 1-tap "Save Voucher to WhatsApp"
    Guest->>Manager: Arrives at Restaurant on 2026-11-15 20:00
    Manager->>DB: Manager checks /admin/reservations -> clicks "Seat Party"
    DB->>DB: Links reservation to Table T7 (status="occupied")
```

---

## 5.3 Concurrency Vulnerabilities & Edge Case Matrix

| Edge Case | Failure Mode | Architectural Resolution in Next.js Standalone |
|---|---|---|
| **Simultaneous Last Item Purchase** | Two diners checkout the last biryani at the exact same millisecond. | Execute order creation inside a database transaction (`SERIALIZABLE` or `SELECT FOR UPDATE` on `menu_items WHERE id = :id`). |
| **Payment Drop-off** | Customer sends UPI money but browser tab closes before submitting UTR. | All orders record an `order_number` in the UPI reference payload. Cashier can search the reference code in POS and mark the order paid manually. |
| **Soundbox Network Delay** | Cashier hears soundbox after 30-second cellular delay. | Live order remains in `placed` with visual flashing amber badge until cashier verifies. Kitchen can begin prep while payment is verified. |

---

# Module 6: Master Unification & Next.js Target Blueprint

## 6.1 Architectural Goal: Eliminating Render Backend Container

Currently, the system deploys Python/FastAPI on Render and Next.js on Vercel.  
**Consolidation Strategy**: Port all Python FastAPI routers into **Next.js App Router Route Handlers (`app/api/...`)** and **React Server Actions**, backed by Prisma ORM or Drizzle ORM connecting to Supabase PostgreSQL with PgBouncer connection pooling.

```
┌────────────────────────────────────────────────────────────────────────┐
│               UNIFIED NEXT.JS STANDALONE APPLICATION                   │
│                        (Vercel or Node.js Docker)                      │
├────────────────────────────────────────────────────────────────────────┤
│  Frontend Layer (App Router)                                           │
│  - /order, /delivery, /book-table, /captain                            │
│  - /admin/pos, /admin/kds, /admin/analytics, /admin/menu               │
├────────────────────────────────────────────────────────────────────────┤
│  Full-Stack Business Logic & API Layer (Zero Python Dependency)        │
│  - app/api/auth/[...nextauth]/route.ts (Staff & Owner RBAC)            │
│  - app/api/orders/route.ts (Order placement & validation)              │
│  - app/api/payments/route.ts (NPCI UPI QR generation & UTR check)      │
│  - app/api/menu/route.ts (Bilingual catalog & stock toggles)           │
│  - Server Actions: placeOrder(), updateStock(), openCashierShift()     │
├────────────────────────────────────────────────────────────────────────┤
│  Real-Time Broadcasting Engine                                         │
│  - Supabase Realtime Channels OR Server-Sent Events (SSE)              │
├────────────────────────────────────────────────────────────────────────┤
│  Data Layer                                                            │
│  - Prisma ORM / Drizzle ORM with connection pooling                    │
│  - Supabase Cloud PostgreSQL (Production)                              │
│  - Embedded SQLite via better-sqlite3 (Local Offline Fallback)         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 6.2 Target Unified Directory Structure

```
surya-restaurant-unified/
├── prisma/
│   ├── schema.prisma                  # Unified schema containing all 19 entities
│   └── seed.ts                        # Seed file with all 179 items & exact prices
├── app/
│   ├── layout.tsx                     # Root HTML, fonts, and theme providers
│   ├── page.tsx                       # High-converting landing page
│   ├── order/page.tsx                 # Dine-in QR ordering page
│   ├── delivery/page.tsx              # Takeaway & delivery page
│   ├── book-table/page.tsx            # Reservation portal
│   ├── captain/page.tsx               # Waiter mobile POS
│   ├── admin/
│   │   ├── login/page.tsx             # Staff/Owner authentication
│   │   ├── pos/page.tsx               # Cashier POS Cockpit
│   │   ├── kds/page.tsx               # Kitchen Display System
│   │   ├── orders/page.tsx            # Live Order Management
│   │   ├── menu/page.tsx              # Menu Catalog & Price Control
│   │   ├── tables/page.tsx            # Floor Plan & QR Generator
│   │   ├── stock/page.tsx             # 86 Stock Toggle
│   │   ├── payments/page.tsx          # Shift Register & Cash Drawer
│   │   ├── customers/page.tsx         # Diner CRM
│   │   ├── reservations/page.tsx      # Table Booking Ledger
│   │   ├── analytics/page.tsx         # Sales BI Dashboard
│   │   ├── audit/page.tsx             # Security Audit Trail
│   │   └── settings/page.tsx          # Store & UPI Config
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts         # Staff JWT login
│       │   └── me/route.ts            # Current session profile
│       ├── menu/
│       │   ├── route.ts               # GET items, POST new dish
│       │   └── [id]/route.ts          # PUT price, PATCH availability
│       ├── orders/
│       │   ├── route.ts               # POST create order, GET order list
│       │   └── [id]/route.ts          # PATCH status, GET tracking
│       ├── payments/
│       │   ├── upi-qr/route.ts        # Dynamic NPCI QR generator
│       │   └── submit-utr/route.ts    # UTR verification handler
│       ├── tables/route.ts            # Floor plan & buzzer receiver
│       ├── reservations/route.ts      # Table bookings
│       ├── shifts/route.ts            # Cashier shift opening/closing
│       ├── analytics/route.ts         # Revenue & BI metrics
│       └── realtime/route.ts          # Server-Sent Events (SSE) broadcaster
├── lib/
│   ├── db.ts                          # PrismaClient singleton with pooling
│   ├── auth.ts                        # Jose / JWT verification utilities
│   ├── suryaMenuData.ts               # 0ms initial state offline fallback
│   ├── dishImages.ts                  # Universal dish image resolver (301 keys)
│   ├── sound.ts                       # Web Audio API acoustic synthesizer
│   ├── thermalPrint.ts                # 80mm/58mm silent ESC/POS printer engine
│   └── whatsapp.ts                    # Zero-cost WhatsApp intent generator
├── context/
│   ├── AuthContext.tsx
│   ├── CustomerContext.tsx
│   ├── LanguageContext.tsx
│   └── OfflineContext.tsx
└── public/
    └── dishes/                        # 279 high-resolution food assets
```

---

## 6.3 Backend-to-Next.js Component Mapping

| Legacy Render (FastAPI Python) | Target Next.js Pattern | Implementation Strategy |
|---|---|---|
| `app/routers/auth.py` | `app/api/auth/login/route.ts` | Next.js API Route + `jose` JWT + `bcryptjs` |
| `app/routers/menu.py` | `app/api/menu/route.ts` & Server Actions | Prisma query with `include: { variants: true }` |
| `app/routers/orders.py` | `app/api/orders/route.ts` | Atomic Prisma `$transaction` with stock update |
| `app/routers/payments.py` | `app/api/payments/route.ts` | Pure TypeScript NPCI UPI String Builder |
| `app/routers/ws.py` | Supabase Realtime Channels OR SSE | Server-Sent Events (`ReadableStream` in Route Handler) |
| `app/routers/analytics.py` | `app/api/analytics/route.ts` | SQL Aggregate queries via Prisma `$queryRaw` |
| `app/routers/shifts.py` | `app/api/shifts/route.ts` | Session cash variance calculation in TypeScript |
| Python Virtual Environment | Standard Node.js `node_modules` | Zero Python runtime footprint on hosting provider |

---

## 6.4 Database & Connection Pooling Strategy

Serverless environments (Vercel) instantiate multiple function instances concurrently, which can exhaust standard PostgreSQL connection limits (e.g., 20–50 connections).
- **Prisma with Supabase Session & Transaction Poolers**:
  ```typescript
  // lib/db.ts
  import { PrismaClient } from '@prisma/client';

  const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

  export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL, // Uses Transaction Mode on port 6543
        },
      },
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
  ```

---

## 6.5 Five-Phase Zero-Downtime Migration Execution Plan

```mermaid
flowchart LR
    P1["Phase 1: Prisma Schema & DB Direct Link"] --> P2["Phase 2: Next.js API Route Handlers"]
    P2 --> P3["Phase 3: Realtime SSE Migration"]
    P3 --> P4["Phase 4: Client API Re-pointing"]
    P4 --> P5["Phase 5: Render Decommissioning"]
```

### Phase 1: Unified Schema & Database Bridge
1. Initialize Prisma inside the Next.js project: `npx prisma init`.
2. Map the 19 database models into `prisma/schema.prisma` targeting the existing Supabase PostgreSQL instance.
3. Validate connection and read data using `npx prisma db pull` and `npx prisma generate`.

### Phase 2: Route Handler Parity
1. Implement Next.js App Router API routes under `app/api/` matching all 84 FastAPI routes.
2. Port authentication utilities using `bcryptjs` and `jose` for HS256 JWT tokens.
3. Keep the same JSON request and response contracts so frontend components experience zero breaking changes.

### Phase 3: Realtime SSE Engine
1. Replace Python WebSocket endpoint (`/ws`) with a native Next.js Server-Sent Events (SSE) route (`app/api/realtime/route.ts`) or Supabase Realtime broadcast channels.
2. Update `frontend/hooks/useSockets.ts` to connect to `/api/realtime` with automatic reconnection.

### Phase 4: Client Re-pointing & Local Testing
1. In `frontend/lib/api.ts`, change `API_BASE_URL` to point to `/` (same-origin Next.js routes).
2. Run end-to-end tests: Place dine-in order ➔ KDS audio chime ➔ Cashier UPI verification ➔ Receipt print.

### Phase 5: Production Cutover & Render Decommissioning
1. Push unified Next.js repository to Vercel (or custom domain host).
2. Verify all 25 routes compile successfully with zero errors.
3. Suspend and decommission the Render Python web service container, reducing monthly hosting overhead to **$0 (Zero Cost)** on free-tier serverless infrastructure.
