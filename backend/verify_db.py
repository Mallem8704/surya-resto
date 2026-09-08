import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

from app.database import SessionLocal
from app.models import Outlet, User, CafeTable, Category, MenuItem


def verify_seeded_data():
    db = SessionLocal()
    try:
        outlet = db.query(Outlet).first()
        users = db.query(User).all()
        tables = db.query(CafeTable).all()
        categories = db.query(Category).all()
        items = db.query(MenuItem).all()

        print("\n" + "=" * 80)
        print(f"[OUTLET] {outlet.name} | Address: {outlet.address}")
        print("=" * 80)

        print("\n[USERS & ROLES]")
        for u in users:
            print(f"  • ID: {u.id:2d} | Role: {u.role:<6s} | Name: {u.name:<30s} | Email: {u.email}")

        print(f"\n[TABLES] ({len(tables)} total):")
        table_labels = ", ".join([t.label for t in tables])
        print(f"  {table_labels}")

        print(f"\n[CATEGORIES] ({len(categories)} total):")
        for c in categories:
            print(f"  • [{c.id}] {c.name:<25s} | {c.name_te}")

        print("\n" + "=" * 80)
        print(f"[MENU ITEMS] ({len(items)} items total):")
        print("=" * 80)
        print(f"{'ID':<3s} {'Category':<22s} {'English Name':<30s} {'Telugu Name (తెలుగు)':<26s} {'Price':<8s} {'Stock':<6s} {'Type'}")
        print("-" * 115)

        for it in items:
            cat_name = it.category.name if it.category else "N/A"
            price_rupees = f"₹{it.price_paise / 100:.2f}"
            veg_tag = "[Veg]" if it.is_veg else "[Non-Veg]"
            special_tag = "[Special]" if it.is_special else ""
            print(f"{it.id:<3d} {cat_name:<22s} {it.name:<30s} {it.name_te or '':<26s} {price_rupees:<8s} {it.stock_qty:<6d} {veg_tag} {special_tag}")

        print("=" * 80 + "\n")

    finally:
        db.close()


if __name__ == "__main__":
    verify_seeded_data()
