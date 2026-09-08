"""
Surya Family Restaurant Kadiri — Database Seed Script
Populates the restaurant details, staff users, tables with QR codes, categories, dishes, variants, and addons.
Address: Dhandubatu Street, Bypass road, opposite to RTC Bus Stand, Police Quarters, Kadiri, Andhra Pradesh 515591
Phone: +91 98803 58634
"""

import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

from app.database import Base, engine, SessionLocal
from app.models import (
    Outlet, User, CafeTable, Category, MenuItem, MenuItemVariant, MenuItemAddon,
    StockLog, AuditLog, Order, OrderItem, Payment, ServiceCall
)
from app.auth_utils import get_password_hash
from app.surya_data import CATEGORIES, ITEMS


def seed_database(clear_existing: bool = True):
    print("=" * 70)
    print("[SEED] SEEDING SURYA FAMILY RESTAURANT KADIRI")
    print("=" * 70)

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        if clear_existing:
            print("[INFO] Clearing existing tables and orders...")
            db.query(AuditLog).delete()
            db.query(ServiceCall).delete()
            db.query(Payment).delete()
            db.query(OrderItem).delete()
            db.query(Order).delete()
            db.query(StockLog).delete()
            db.query(MenuItemVariant).delete()
            db.query(MenuItemAddon).delete()
            db.query(MenuItem).delete()
            db.query(Category).delete()
            db.query(CafeTable).delete()
            db.query(User).delete()
            db.query(Outlet).delete()
            db.commit()

        # OUTLET 1: Surya Family Restaurant Kadiri
        outlet = Outlet(
            name="Surya Family Restaurant",
            address="Dhandubatu Street, Bypass road, opposite to RTC Bus Stand, Police Quarters, Kadiri, Andhra Pradesh 515591",
            phone="+91 98803 58634",
            currency="INR",
            tax_rate_percent=5,
            opening_hours="11:00 AM - 10:30 PM (Daily)",
            tagline="Kadiri's Favorite Family Dining & Biryani Destination",
            logo_url="/logo.png",
            gstin="37SURYA0000A1Z5",
            fssai_license_number="10124999000586",
            upi_vpa="9880358634@upi",
        )
        db.add(outlet)
        db.flush()
        print(f"[OK] Outlet created: {outlet.name} (ID: {outlet.id})")

        # USERS
        db.add_all([
            User(
                outlet_id=outlet.id,
                name="Surya Restaurant Manager",
                email="owner@suryarestaurant.com",
                password_hash=get_password_hash("admin123"),
                role="owner"
            ),
            User(
                outlet_id=outlet.id,
                name="Surya Floor Staff",
                email="staff@suryarestaurant.com",
                password_hash=get_password_hash("staff123"),
                role="staff"
            ),
        ])
        db.flush()
        print("[OK] Users created: owner@suryarestaurant.com & staff@suryarestaurant.com")

        # TABLES: T1 to T12
        for i in range(1, 13):
            lbl = f"T{i}"
            db.add(CafeTable(
                outlet_id=outlet.id,
                label=lbl,
                qr_code_url=f"http://localhost:3000/order?branch={outlet.id}&table={lbl}",
                status="free",
            ))
        db.flush()
        print("[OK] Tables created: T1-T12 with QR codes")

        # CATEGORIES
        cat_map = {}
        for c in CATEGORIES:
            cat = Category(
                outlet_id=outlet.id,
                name=c["name"],
                name_te=c.get("name_te"),
                sort_order=c["sort_order"],
                is_active=c.get("is_active", True)
            )
            db.add(cat)
            db.flush()
            cat_map[c["id"]] = cat.id
        print(f"[OK] Categories created: {len(cat_map)} categories")

        # MENU ITEMS
        total_items = 0
        total_variants = 0
        total_addons = 0

        for item_data in ITEMS:
            db_cat_id = cat_map.get(item_data["cat"])
            if not db_cat_id:
                continue

            variants_data = item_data.get("variants", [])
            addons_data = item_data.get("addons", [])
            has_vars = len(variants_data) > 0

            # Default base price in paise
            base_price_paise = int(item_data["price"] * 100)

            item = MenuItem(
                outlet_id=outlet.id,
                category_id=db_cat_id,
                name=item_data["name"],
                name_te=item_data.get("name_te"),
                description=item_data.get("desc"),
                price_paise=base_price_paise,
                is_veg=item_data["veg"],
                is_available=True,
                image_url=item_data.get("img"),
                is_special=item_data.get("is_best_seller", False),
                has_variants=has_vars,
            )
            db.add(item)
            db.flush()
            total_items += 1

            # Portion Variants
            if variants_data:
                for v in variants_data:
                    var = MenuItemVariant(
                        item_id=item.id,
                        name=v["name"],
                        name_te=v.get("name_te"),
                        price_paise=int(v["price"] * 100),
                        is_default=v.get("is_default", False),
                        is_available=True,
                    )
                    db.add(var)
                    total_variants += 1

            # Addons
            if addons_data:
                for a in addons_data:
                    addon = MenuItemAddon(
                        item_id=item.id,
                        name=a["name"],
                        name_te=a.get("name_te"),
                        price_paise=int(a["price"] * 100),
                        is_available=True,
                    )
                    db.add(addon)
                    total_addons += 1

        db.commit()
        print(f"[OK] Menu Items seeded: {total_items} dishes, {total_variants} portion variants, {total_addons} addons")

        print("=" * 70)
        print("[SUCCESS] SURYA FAMILY RESTAURANT KADIRI SEEDING COMPLETE!")
        print(f"  Outlet ID: {outlet.id} | Name: {outlet.name}")
        print("  Owner Login: owner@suryarestaurant.com / admin123")
        print("  Staff Login: staff@suryarestaurant.com / staff123")
        print("=" * 70)

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seed failed: {e}")
        raise e
    finally:
        db.close()


def auto_seed_if_empty():
    db = SessionLocal()
    try:
        if db.query(Outlet).count() == 0:
            print("[INFO] Database empty. Running seed_database()...")
            seed_database(clear_existing=False)
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
