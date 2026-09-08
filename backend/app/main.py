import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import Base, engine
from app.routers import (
    auth,
    categories,
    menu,
    tables,
    orders,
    stock,
    payments,
    service_calls,
    analytics,
    ws,
    audit,
    outlets,
    customers,
    coupons,
    reservations,
    shifts,
)

# Initialize database schema tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Surya Family Restaurant API",
    description="Backend API for Surya Family Restaurant Kadiri QR Ordering & Operations SaaS",
    version="1.0.0",
)

@app.on_event("startup")
def on_startup():
    """Ensure database schema tables exist, run column migrations, and seed initial store data if database is empty."""
    Base.metadata.create_all(bind=engine)

    # Run auto-migrations for SQLite & PostgreSQL tables
    from sqlalchemy import text
    with engine.begin() as conn:
        if engine.dialect.name == "sqlite":
            for table_name, col_name, col_type in [
                ("menu_items", "has_variants", "BOOLEAN DEFAULT 0"),
                ("orders", "order_type", "VARCHAR(50) DEFAULT 'dine_in'"),
                ("orders", "customer_name", "VARCHAR(150)"),
                ("orders", "customer_phone", "VARCHAR(50)"),
                ("orders", "delivery_address", "TEXT"),
                ("orders", "delivery_status", "VARCHAR(50)"),
                ("orders", "delivery_fee_paise", "INTEGER DEFAULT 0"),
                ("orders", "idempotency_key", "VARCHAR(100)"),
                ("orders", "discount_paise", "INTEGER DEFAULT 0"),
                ("orders", "coupon_code", "VARCHAR(50)"),
                ("orders", "coupon_id", "INTEGER"),
                ("outlets", "opening_hours", "VARCHAR(100)"),
                ("outlets", "tagline", "VARCHAR(255)"),
                ("outlets", "logo_url", "VARCHAR(500)"),
                ("order_items", "variant_id", "INTEGER"),
                ("order_items", "variant_name", "VARCHAR(100)"),
                ("order_items", "selected_addons_json", "TEXT"),
            ]:
                try:
                    columns = [row[1] for row in conn.exec_driver_sql(f"PRAGMA table_info({table_name})").fetchall()]
                    if col_name not in columns:
                        conn.exec_driver_sql(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type};")
                except Exception as e:
                    pass
        else:
            migrations = [
                "ALTER TABLE orders ALTER COLUMN table_id DROP NOT NULL;",
                "ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type VARCHAR(50) DEFAULT 'dine_in';",
                "ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(150);",
                "ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);",
                "ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;",
                "ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50);",
                "ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee_paise INTEGER DEFAULT 0;",
                "ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100);",
                "CREATE UNIQUE INDEX IF NOT EXISTS ix_orders_idempotency_key ON orders(idempotency_key) WHERE idempotency_key IS NOT NULL;",
                "ALTER TABLE outlets ADD COLUMN IF NOT EXISTS opening_hours VARCHAR(100);",
                "ALTER TABLE outlets ADD COLUMN IF NOT EXISTS tagline VARCHAR(255);",
                "ALTER TABLE outlets ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);",
                "ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS has_variants BOOLEAN DEFAULT FALSE;",
                "ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_id INTEGER;",
                "ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_name VARCHAR(100);",
                "ALTER TABLE order_items ADD COLUMN IF NOT EXISTS selected_addons_json TEXT;",
                """CREATE TABLE IF NOT EXISTS menu_item_variants (
                    id SERIAL PRIMARY KEY,
                    item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
                    name VARCHAR(100) NOT NULL,
                    name_te VARCHAR(100),
                    price_paise INTEGER NOT NULL,
                    is_default BOOLEAN DEFAULT FALSE,
                    is_available BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );""",
                """CREATE TABLE IF NOT EXISTS menu_item_addons (
                    id SERIAL PRIMARY KEY,
                    item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
                    name VARCHAR(100) NOT NULL,
                    name_te VARCHAR(100),
                    price_paise INTEGER NOT NULL,
                    is_available BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );""",
                "CREATE INDEX IF NOT EXISTS ix_menu_item_variants_item_id ON menu_item_variants(item_id);",
                "CREATE INDEX IF NOT EXISTS ix_menu_item_addons_item_id ON menu_item_addons(item_id);",
                """CREATE TABLE IF NOT EXISTS customers (
                    id SERIAL PRIMARY KEY,
                    phone VARCHAR(20) UNIQUE NOT NULL,
                    name VARCHAR(100),
                    email VARCHAR(120),
                    default_address TEXT,
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    last_order_at TIMESTAMP WITHOUT TIME ZONE
                );""",
                "CREATE INDEX IF NOT EXISTS ix_customers_phone ON customers(phone);",
                """CREATE TABLE IF NOT EXISTS customer_addresses (
                    id SERIAL PRIMARY KEY,
                    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
                    label VARCHAR(50) DEFAULT 'Home',
                    address_line TEXT NOT NULL,
                    landmark VARCHAR(150),
                    is_default BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );""",
                "CREATE INDEX IF NOT EXISTS ix_customer_addresses_customer_id ON customer_addresses(customer_id);",
                """CREATE TABLE IF NOT EXISTS customer_otps (
                    id SERIAL PRIMARY KEY,
                    phone VARCHAR(20) NOT NULL,
                    otp_code VARCHAR(10) NOT NULL,
                    expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
                    is_used BOOLEAN DEFAULT FALSE,
                    attempts INTEGER DEFAULT 0,
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );""",
                "CREATE INDEX IF NOT EXISTS ix_customer_otps_phone ON customer_otps(phone);",
                "ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_paise INTEGER DEFAULT 0;",
                "ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50);",
                "ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id INTEGER;",
                "ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_notes TEXT;",
                """CREATE TABLE IF NOT EXISTS table_reservations (
                    id SERIAL PRIMARY KEY,
                    outlet_id INTEGER NOT NULL REFERENCES outlets(id),
                    reservation_number VARCHAR(50) UNIQUE NOT NULL,
                    customer_name VARCHAR(150) NOT NULL,
                    customer_phone VARCHAR(50) NOT NULL,
                    customer_email VARCHAR(150),
                    party_size INTEGER NOT NULL DEFAULT 2,
                    reservation_date VARCHAR(50) NOT NULL,
                    reservation_time VARCHAR(50) NOT NULL,
                    seating_preference VARCHAR(50) DEFAULT 'standard',
                    occasion VARCHAR(100) DEFAULT 'casual',
                    special_requests TEXT,
                    table_id INTEGER REFERENCES tables(id) ON DELETE SET NULL,
                    status VARCHAR(50) DEFAULT 'confirmed',
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );""",
                "CREATE INDEX IF NOT EXISTS ix_table_reservations_outlet_id ON table_reservations(outlet_id);",
                "CREATE INDEX IF NOT EXISTS ix_table_reservations_reservation_number ON table_reservations(reservation_number);",
            ]
            for mig in migrations:
                try:
                    conn.execute(text(mig))
                except Exception:
                    pass

    # Seed Default Coupons
    try:
        from app.database import SessionLocal
        from app.models import Coupon, Outlet, User
        db = SessionLocal()
        default_coupons = [
            {"code": "WELCOME50", "description": "Flat ₹50 OFF on Kadiri Deliveries above ₹250", "discount_type": "flat", "discount_value": 5000, "min_order_paise": 25000},
            {"code": "BIRYANI10", "description": "10% OFF on Special Biryani & Pulao Orders (Up to ₹100)", "discount_type": "percent", "discount_value": 10, "min_order_paise": 30000, "max_discount_paise": 10000},
            {"code": "SURYA100", "description": "Flat ₹100 OFF on Surya Family Feasts above ₹600", "discount_type": "flat", "discount_value": 10000, "min_order_paise": 60000},
            {"code": "NAAN20", "description": "Flat ₹20 OFF on Curries & Butter Naan Combos", "discount_type": "flat", "discount_value": 2000, "min_order_paise": 10000},
        ]
        for c_data in default_coupons:
            if not db.query(Coupon).filter(Coupon.code == c_data["code"]).first():
                db.add(Coupon(**c_data))
        db.commit()

        # Sync accurate branch phone numbers
        outlets = db.query(Outlet).order_by(Outlet.id.asc()).all()
        if len(outlets) >= 1:
            outlets[0].phone = "+91 98803 58634"
        db.commit()

        # Purge legacy duplicate dummy credentials
        db.query(User).filter(User.email.in_(["owner@teatime.com", "staff@teatime.com", "owner@arabieq.com", "staff1@arabieq.com"])).delete(synchronize_session=False)
        db.commit()
        db.close()
    except Exception as c_err:
        print(f"[COUPON-OUTLET-SEED] Note: {c_err}")

    try:
        from app.seed import auto_seed_if_empty
        auto_seed_if_empty()
    except Exception as e:
        print(f"[STARTUP] Auto-seed warning: {e}")


@app.get("/api/migrate-db")
def trigger_db_migration():
    """Endpoint to trigger schema column migrations on demand."""
    from sqlalchemy import text
    results = []
    with engine.begin() as conn:
        migrations = [
            "ALTER TABLE orders ALTER COLUMN table_id DROP NOT NULL;",
            "ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type VARCHAR(50) DEFAULT 'dine_in';",
            "ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(150);",
            "ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);",
            "ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;",
            "ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50);",
            "ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee_paise INTEGER DEFAULT 0;",
            "ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100);",
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_orders_idempotency_key ON orders(idempotency_key) WHERE idempotency_key IS NOT NULL;",
            "ALTER TABLE outlets ADD COLUMN IF NOT EXISTS opening_hours VARCHAR(100);",
            "ALTER TABLE outlets ADD COLUMN IF NOT EXISTS tagline VARCHAR(255);",
            "ALTER TABLE outlets ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);",
            "ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS has_variants BOOLEAN DEFAULT FALSE;",
            "ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_id INTEGER;",
            "ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_name VARCHAR(100);",
            "ALTER TABLE order_items ADD COLUMN IF NOT EXISTS selected_addons_json TEXT;",
            """CREATE TABLE IF NOT EXISTS menu_item_variants (
                id SERIAL PRIMARY KEY,
                item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                name_te VARCHAR(100),
                price_paise INTEGER NOT NULL,
                is_default BOOLEAN DEFAULT FALSE,
                is_available BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );""",
            """CREATE TABLE IF NOT EXISTS menu_item_addons (
                id SERIAL PRIMARY KEY,
                item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                name_te VARCHAR(100),
                price_paise INTEGER NOT NULL,
                is_available BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );""",
            "CREATE INDEX IF NOT EXISTS ix_menu_item_variants_item_id ON menu_item_variants(item_id);",
            "CREATE INDEX IF NOT EXISTS ix_menu_item_addons_item_id ON menu_item_addons(item_id);",
            "ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_paise INTEGER DEFAULT 0;",
            "ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50);",
            "ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id INTEGER;",
            """CREATE TABLE IF NOT EXISTS coupons (
                id SERIAL PRIMARY KEY,
                outlet_id INTEGER REFERENCES outlets(id) ON DELETE SET NULL,
                code VARCHAR(50) UNIQUE NOT NULL,
                description VARCHAR(255),
                discount_type VARCHAR(20) DEFAULT 'flat',
                discount_value INTEGER NOT NULL,
                min_order_paise INTEGER DEFAULT 0,
                max_discount_paise INTEGER,
                usage_limit INTEGER,
                times_used INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );""",
            "CREATE INDEX IF NOT EXISTS ix_coupons_code ON coupons(code);",
        ]
        for sql in migrations:
            try:
                conn.execute(text(sql))
                results.append({"query": sql.strip()[:60] + "...", "status": "success"})
            except Exception as err:
                results.append({"query": sql.strip()[:60] + "...", "status": f"skipped/error: {err}"})
    return {"status": "ok", "migrations": results}


@app.get("/api/seed-variants")
def seed_portion_variants():
    """Populate authentic portion variants and add-ons for Mandis, Biryanis, Starters, and Drinks."""
    from app.database import SessionLocal
    from app.models import MenuItem, MenuItemVariant, MenuItemAddon, Category

    db = SessionLocal()
    try:
        items = db.query(MenuItem).all()
        variants_added = 0
        addons_added = 0

        for item in items:
            cat = db.query(Category).filter(Category.id == item.category_id).first()
            cat_name = (cat.name if cat else "").lower()
            name_lower = item.name.lower()

            base_paise = item.price_paise

            # 1. Mandi Dishes
            if "mandi" in cat_name or "mandi" in name_lower or "faham" in cat_name:
                item.has_variants = True
                # Check if variants already exist
                if db.query(MenuItemVariant).filter(MenuItemVariant.item_id == item.id).count() == 0:
                    db.add_all([
                        MenuItemVariant(item_id=item.id, name="Single (1 Pax)", name_te="సింగిల్ (1)", price_paise=int(base_paise * 0.65), is_default=False),
                        MenuItemVariant(item_id=item.id, name="Half (1-2 Pax)", name_te="హాఫ్ (1-2)", price_paise=base_paise, is_default=True),
                        MenuItemVariant(item_id=item.id, name="Full (3-4 Pax)", name_te="ఫుల్ (3-4)", price_paise=int(base_paise * 1.85), is_default=False),
                        MenuItemVariant(item_id=item.id, name="Jumbo / Family (5-6 Pax)", name_te="జంబో / ఫ్యామిలీ (5-6)", price_paise=int(base_paise * 3.4), is_default=False),
                    ])
                    variants_added += 4

                if db.query(MenuItemAddon).filter(MenuItemAddon.item_id == item.id).count() == 0:
                    db.add_all([
                        MenuItemAddon(item_id=item.id, name="Extra Arabian Mayonnaise (50ml)", name_te="ఎక్స్ట్రా మయోన్నైస్", price_paise=2500),
                        MenuItemAddon(item_id=item.id, name="Extra Spicy Garlic Raita (100ml)", name_te="ఎక్స్ట్రా రైతా", price_paise=2000),
                        MenuItemAddon(item_id=item.id, name="Boiled Egg (1 pc)", name_te="ఉడికించిన గుడ్డు", price_paise=1500),
                        MenuItemAddon(item_id=item.id, name="Extra Mandi / Salan Gravy", name_te="ఎక్స్ట్రా గ్రేవీ", price_paise=2500),
                        MenuItemAddon(item_id=item.id, name="Fried Onions & Cashews", name_te="ఫ్రైడ్ ఆనియన్స్ & జీడిపప్పు", price_paise=3500),
                    ])
                    addons_added += 5

            # 2. Biryani Dishes
            elif "biryani" in cat_name or "pulav" in cat_name or "biryani" in name_lower:
                item.has_variants = True
                if db.query(MenuItemVariant).filter(MenuItemVariant.item_id == item.id).count() == 0:
                    db.add_all([
                        MenuItemVariant(item_id=item.id, name="Single", name_te="సింగిల్", price_paise=int(base_paise * 0.65), is_default=False),
                        MenuItemVariant(item_id=item.id, name="Full / Regular", name_te="ఫుల్", price_paise=base_paise, is_default=True),
                        MenuItemVariant(item_id=item.id, name="Family Pack (3-4 Pax)", name_te="ఫ్యామిలీ ప్యాక్", price_paise=int(base_paise * 2.2), is_default=False),
                        MenuItemVariant(item_id=item.id, name="Jumbo Pack (5-6 Pax)", name_te="జంబో ప్యాక్", price_paise=int(base_paise * 3.4), is_default=False),
                    ])
                    variants_added += 4

                if db.query(MenuItemAddon).filter(MenuItemAddon.item_id == item.id).count() == 0:
                    db.add_all([
                        MenuItemAddon(item_id=item.id, name="Extra Arabian Mayonnaise (50ml)", name_te="ఎక్స్ట్రా మయోన్నైస్", price_paise=2500),
                        MenuItemAddon(item_id=item.id, name="Extra Spicy Garlic Raita (100ml)", name_te="ఎక్స్ట్రా రైతా", price_paise=2000),
                        MenuItemAddon(item_id=item.id, name="Boiled Egg (1 pc)", name_te="ఉడికించిన గుడ్డు", price_paise=1500),
                        MenuItemAddon(item_id=item.id, name="Extra Mirchi Ka Salan Gravy", name_te="ఎక్స్ట్రా సాలన్ గ్రేవీ", price_paise=2500),
                        MenuItemAddon(item_id=item.id, name="Fried Onions & Cashews", name_te="ఫ్రైడ్ ఆనియన్స్ & జీడిపప్పు", price_paise=3500),
                    ])
                    addons_added += 5

            # 3. Starters
            elif "starter" in cat_name or "kebab" in name_lower or "tikka" in name_lower:
                if db.query(MenuItemAddon).filter(MenuItemAddon.item_id == item.id).count() == 0:
                    db.add_all([
                        MenuItemAddon(item_id=item.id, name="Extra Rumali Roti (1 Pc)", name_te="రుమాలీ రోటీ (1)", price_paise=2000),
                        MenuItemAddon(item_id=item.id, name="Garlic Mayo Dip", name_te="గార్లిక్ మయో డిప్", price_paise=2500),
                        MenuItemAddon(item_id=item.id, name="Mint Chutney", name_te="పుదీనా చట్నీ", price_paise=1500),
                    ])
                    addons_added += 3

            # 4. Beverages & Shakes
            elif "beverage" in cat_name or "shake" in cat_name or "juice" in cat_name or "tea" in cat_name:
                item.has_variants = True
                if db.query(MenuItemVariant).filter(MenuItemVariant.item_id == item.id).count() == 0:
                    db.add_all([
                        MenuItemVariant(item_id=item.id, name="Regular (250ml)", name_te="రెగ్యులర్", price_paise=base_paise, is_default=True),
                        MenuItemVariant(item_id=item.id, name="Large (400ml)", name_te="లార్జ్", price_paise=int(base_paise * 1.5), is_default=False),
                    ])
                    variants_added += 2

                if db.query(MenuItemAddon).filter(MenuItemAddon.item_id == item.id).count() == 0:
                    db.add_all([
                        MenuItemAddon(item_id=item.id, name="Vanilla Ice Cream Scoop", name_te="ఐస్ క్రీమ్ స్కూప్", price_paise=3000),
                        MenuItemAddon(item_id=item.id, name="Roasted Badam & Cashew Mix", name_te="బాదం & జీడిపప్పు", price_paise=2500),
                    ])
                    addons_added += 2

        db.commit()
        return {
            "status": "ok",
            "message": f"Successfully seeded {variants_added} variants and {addons_added} addons across menu items.",
            "variants_added": variants_added,
            "addons_added": addons_added,
        }
    except Exception as e:
        db.rollback()
        return {"status": "error", "detail": str(e)}
    finally:
        db.close()

# CORS configuration
frontend_env_raw = os.getenv("FRONTEND_URL", "http://localhost:3000")
frontend_origins = [u.strip() for u in frontend_env_raw.split(",") if u.strip()]

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "https://arabeiqrestaurant.com",
    "https://www.arabeiqrestaurant.com",
    "http://arabeiqrestaurant.com",
    "http://www.arabeiqrestaurant.com",
    "https://arabieqrestaurant.com",
    "https://www.arabieqrestaurant.com",
    "https://arabic-restaurant-dineos.vercel.app",
    "https://tea-time-application.vercel.app",
    *frontend_origins,
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https?://.*(arabeiq|arabieq|arabic-restaurant|tea-time|vercel\.app).*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure uploads directory exists and mount static files
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")
    dishes_dir = os.path.join(static_dir, "dishes")
    if os.path.exists(dishes_dir):
        app.mount("/dishes", StaticFiles(directory=dishes_dir), name="dishes")

# Include Routers with standard /api prefix and root aliases
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(auth.router, prefix="/auth", tags=["Authentication (Alias)"])

app.include_router(categories.router, prefix="/api/categories", tags=["Categories"])
app.include_router(categories.router, prefix="/categories", tags=["Categories (Alias)"])

app.include_router(menu.router, prefix="/api/menu", tags=["Menu Items"])
app.include_router(menu.router, prefix="/menu", tags=["Menu Items (Alias)"])

app.include_router(tables.router, prefix="/api/tables", tags=["Tables & QR"])
app.include_router(tables.router, prefix="/tables", tags=["Tables & QR (Alias)"])

app.include_router(orders.router, prefix="/api/orders", tags=["Orders"])
app.include_router(orders.router, prefix="/orders", tags=["Orders (Alias)"])

app.include_router(stock.router, prefix="/api/stock", tags=["Inventory & Stock"])
app.include_router(stock.router, prefix="/stock", tags=["Inventory & Stock (Alias)"])

app.include_router(payments.router, prefix="/api/payments", tags=["Payments & Cashier"])
app.include_router(payments.router, prefix="/payments", tags=["Payments & Cashier (Alias)"])

app.include_router(service_calls.router, prefix="/api/service-calls", tags=["Service Calls"])
app.include_router(service_calls.router, prefix="/service-calls", tags=["Service Calls (Alias)"])

app.include_router(analytics.router, prefix="/api/analytics", tags=["Sales & Analytics"])
app.include_router(analytics.router, prefix="/analytics", tags=["Sales & Analytics (Alias)"])

app.include_router(ws.router, tags=["WebSockets"])

app.include_router(audit.router, prefix="/api/audit", tags=["Audit Logs"])
app.include_router(audit.router, prefix="/audit", tags=["Audit Logs (Alias)"])

app.include_router(outlets.router, prefix="/api/outlets", tags=["Outlet Settings"])
app.include_router(outlets.router, prefix="/outlets", tags=["Outlet Settings (Alias)"])

app.include_router(customers.router, prefix="/api/customer", tags=["Customer Auth & Orders"])
app.include_router(customers.router, prefix="/customer", tags=["Customer Auth & Orders (Alias)"])

app.include_router(coupons.router, prefix="/api/coupons", tags=["Promo Codes & Coupons"])
app.include_router(coupons.router, prefix="/coupons", tags=["Promo Codes & Coupons (Alias)"])

app.include_router(reservations.router, prefix="/api/reservations", tags=["Table Pre-Booking & Reservations"])
app.include_router(reservations.router, prefix="/reservations", tags=["Table Pre-Booking & Reservations (Alias)"])

app.include_router(shifts.router, prefix="/api/shifts", tags=["Cashier Shifts & Cash Register"])
app.include_router(shifts.router, prefix="/shifts", tags=["Cashier Shifts & Cash Register (Alias)"])


@app.get("/")
def root():
    return {
        "app": "Arabic Restaurant API",
        "status": "online",
        "version": "1.0.0",
        "docs_url": "/docs",
        "ws_url": "/ws",
        "endpoints": {
            "auth_login": "/api/auth/login",
            "categories": "/api/categories",
            "menu": "/api/menu",
            "tables": "/api/tables",
            "orders": "/api/orders",
            "stock": "/api/stock",
            "payments": "/api/payments",
            "service_calls": "/api/service-calls",
            "analytics": "/api/analytics",
            "audit": "/api/audit",
        },
    }


@app.get("/api/health")
def health_check():
    try:
        from app.seed import auto_seed_if_empty
        auto_seed_if_empty()
    except Exception as e:
        print(f"[HEALTH] Auto-seed warning: {e}")
    return {
        "status": "healthy",
        "service": "tea-time-backend",
        "timestamp": "ok",
    }


@app.get("/api/seed")
@app.post("/api/seed")
def trigger_seed(key: str = "admin123"):
    if key != "admin123":
        return {"error": "Invalid key"}
    try:
        from app.seed import seed_database
        seed_database(clear_existing=True)
        return {
            "status": "success",
            "message": "Seeded full 198-item Arabieq Restaurant menu with 11 categories and 10 tables",
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
