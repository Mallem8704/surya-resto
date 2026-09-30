"""
Export and upsert local SQLite records into Supabase using Supabase REST API and Service Key.
"""

import sys
import os
import json
import urllib.request
import urllib.error

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import Customer, Order, OrderItem

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://poexygwbosuxbezeastc.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SECRET_KEY", "")
if not SUPABASE_KEY:
    print("[WARN] SUPABASE_SECRET_KEY is not set. Exiting.")
    sys.exit(0)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
}

def post_supabase(table, data):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=HEADERS, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            return True, resp.status
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        return False, f"{e.code}: {err_msg}"
    except Exception as e:
        return False, str(e)

def sync():
    db = SessionLocal()
    try:
        # 1. Sync Customers
        customers = db.query(Customer).all()
        c_payload = []
        for c in customers:
            c_payload.append({
                "id": c.id,
                "phone": c.phone,
                "name": c.name or "Valued Diner",
                "email": c.email,
                "default_address": c.default_address,
                "synced_to_cloud": True
            })
        if c_payload:
            success, res = post_supabase("customers", c_payload)
            print(f"Customers sync: {'SUCCESS' if success else 'FAILED'} -> {res}")

        # 2. Sync Orders
        orders = db.query(Order).all()
        o_payload = []
        for o in orders:
            o_payload.append({
                "id": o.id,
                "outlet_id": o.outlet_id,
                "table_id": o.table_id,
                "idempotency_key": o.idempotency_key,
                "order_type": o.order_type or "dine_in",
                "customer_name": o.customer_name,
                "customer_phone": o.customer_phone,
                "delivery_address": o.delivery_address,
                "delivery_status": o.delivery_status,
                "delivery_fee_paise": o.delivery_fee_paise or 0,
                "order_number": o.order_number,
                "status": o.status,
                "subtotal_paise": o.subtotal_paise,
                "tax_paise": o.tax_paise,
                "discount_paise": o.discount_paise,
                "coupon_code": o.coupon_code,
                "total_paise": o.total_paise,
                "payment_status": o.payment_status,
                "payment_method": o.payment_method,
                "customer_notes": o.customer_notes,
                "synced_to_cloud": True
            })
        if o_payload:
            # Batch in chunks of 20
            for i in range(0, len(o_payload), 20):
                chunk = o_payload[i:i+20]
                success, res = post_supabase("orders", chunk)
                print(f"Orders batch {i//20 + 1}: {'SUCCESS' if success else 'FAILED'} -> {res}")

    finally:
        db.close()

if __name__ == "__main__":
    sync()
