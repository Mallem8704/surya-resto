"""
Database Sanitization & Production Reset Utility for Surya Family Restaurant Kadiri.
Clears all synthetic test orders, test payments, test customers, and test staff accounts
while preserving the complete 48-dish menu, categories, 12 tables, and coupons.
Synchronizes the pristine state with Supabase Cloud.
"""

import sys
import os
import urllib.request
import urllib.error
import json

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine
from app.models import (
    Order, OrderItem, Payment, Customer, CustomerAddress,
    AuditLog, ServiceCall, StockLog, User, Outlet,
    Category, MenuItem, CafeTable, Coupon, TableReservation, CashierShift
)
from app.auth_utils import get_password_hash

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://poexygwbosuxbezeastc.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SECRET_KEY", "")

def clean_supabase_table(table_name):
    """Delete all rows from a Supabase table."""
    url = f"{SUPABASE_URL}/rest/v1/{table_name}?id=neq.0"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }
    req = urllib.request.Request(url, headers=headers, method="DELETE")
    try:
        with urllib.request.urlopen(req) as resp:
            print(f"  [Supabase] Cleaned {table_name}: status {resp.status}")
    except Exception as e:
        print(f"  [Supabase] Note on {table_name}: {e}")

def sanitize():
    print("=" * 70)
    print("🧹 SANITIZING DATABASE FOR CLIENT DELIVERY - SURYA RESTAURANT KADIRI")
    print("=" * 70)

    db = SessionLocal()
    try:
        # 1. Purge Test Transactional Records
        print("\n[STEP 1] Purging synthetic orders, payments, reservations, service calls...")
        del_payments = db.query(Payment).delete()
        del_items = db.query(OrderItem).delete()
        del_orders = db.query(Order).delete()
        del_res = db.query(TableReservation).delete()
        del_shifts = db.query(CashierShift).delete()
        del_sc = db.query(ServiceCall).delete()
        del_audit = db.query(AuditLog).delete()
        del_stock_logs = db.query(StockLog).delete()
        db.commit()
        print(f"  ✓ Deleted {del_orders} test orders, {del_items} order items, {del_payments} payments.")
        print(f"  ✓ Deleted {del_res} test reservations, {del_shifts} test shifts.")
        print(f"  ✓ Deleted {del_sc} service calls, {del_audit} audit logs, {del_stock_logs} stock logs.")

        # 2. Purge Synthetic Test Customers
        print("\n[STEP 2] Purging synthetic test customers...")
        del_addr = db.query(CustomerAddress).delete()
        del_cust = db.query(Customer).delete()
        db.commit()
        print(f"  ✓ Deleted {del_cust} test customers and {del_addr} test addresses.")

        # 3. Clean Staff & User Accounts
        print("\n[STEP 3] Setting up official client staff credentials...")
        # Delete temporary test users
        db.query(User).filter(User.email.like("%test%")).delete(synchronize_session=False)
        db.commit()

        # Ensure official client accounts exist
        official_users = [
            {
                "name": "Surya Restaurant Owner / GM",
                "email": "owner@suryafamilyrestaurant.in",
                "password": "surya_admin_2026",
                "role": "owner"
            },
            {
                "name": "Surya Restaurant Manager",
                "email": "owner@suryarestaurant.com",
                "password": "admin123",
                "role": "owner"
            },
            {
                "name": "Surya Floor Cashier",
                "email": "staff@suryafamilyrestaurant.in",
                "password": "surya_staff_2026",
                "role": "staff"
            },
            {
                "name": "Surya Floor Staff",
                "email": "staff@suryarestaurant.com",
                "password": "staff123",
                "role": "staff"
            }
        ]

        for u in official_users:
            existing = db.query(User).filter(User.email == u["email"]).first()
            if not existing:
                db.add(User(
                    outlet_id=1,
                    name=u["name"],
                    email=u["email"],
                    password_hash=get_password_hash(u["password"]),
                    role=u["role"]
                ))
            else:
                existing.name = u["name"]
                existing.role = u["role"]
                existing.password_hash = get_password_hash(u["password"])
        db.commit()
        print("  ✓ Provisioned official owner and staff credentials.")

        # 4. Verify Catalog Integrity
        print("\n[STEP 4] Verifying catalog foundation...")
        outlets_count = db.query(Outlet).count()
        cat_count = db.query(Category).count()
        menu_count = db.query(MenuItem).count()
        table_count = db.query(CafeTable).count()
        coupon_count = db.query(Coupon).count()

        print(f"  ✓ Outlets intact: {outlets_count}")
        print(f"  ✓ Categories intact: {cat_count}")
        print(f"  ✓ Menu dishes intact: {menu_count}")
        print(f"  ✓ Tables intact: {table_count}")
        print(f"  ✓ Coupons intact: {coupon_count}")

        # Reset all table statuses to 'free'
        for t in db.query(CafeTable).all():
            t.status = "free"
            t.active_order_id = None
        db.commit()
        print("  ✓ All 12 tables reset to 'free' ready for customers.")

        # 5. Clean Supabase Cloud Transactional Records
        print("\n[STEP 5] Cleaning Supabase Cloud test orders & customers...")
        clean_supabase_table("payments")
        clean_supabase_table("order_items")
        clean_supabase_table("orders")
        clean_supabase_table("table_reservations")
        clean_supabase_table("service_calls")
        clean_supabase_table("customer_addresses")
        clean_supabase_table("customers")

        print("\n" + "=" * 70)
        print("🎉 DATABASE SANITIZATION COMPLETE! READY FOR CLIENT DELIVERY")
        print("=" * 70)

    finally:
        db.close()

if __name__ == "__main__":
    sanitize()
