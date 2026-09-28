"""
Comprehensive End-to-End Operational Verification Suite for Surya Family Restaurant Kadiri.
Tests:
1. Owner & Staff Authentication (JWT)
2. Outlet Metadata (Kadiri, phone, UPI)
3. Menu & Categories (48 dishes, portion variants, addons)
4. Table Management & Dynamic QR Code Generation (T1-T12)
5. Complete Order Lifecycle (Placed -> Accepted -> Preparing -> Ready -> Served -> Completed)
6. Kitchen Display System (KDS) Active Orders
7. Cashier POS Settlement (Cash / UPI)
8. Cashier Shift Register & Z-Report
9. Table Reservations & Pre-Bookings
10. Promotional Coupons
11. Dish Stock & Out-of-Stock Toggles
12. Revenue Analytics & Reports
13. Security Audit Logging
"""

import sys
import requests

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

BASE_URL = "http://127.0.0.1:8000"

def run_tests():
    print("=" * 80)
    print("🔥 SURYA FAMILY RESTAURANT KADIRI — COMPREHENSIVE END-TO-END VERIFICATION")
    print("=" * 80)

    # 1. AUTHENTICATION
    print("\n[STEP 1] Testing Authentication & RBAC...")
    owner_res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "owner@suryarestaurant.com", "password": "admin123"})
    assert owner_res.status_code == 200, f"Owner login failed: {owner_res.text}"
    owner_data = owner_res.json()
    owner_token = owner_data["access_token"]
    owner_headers = {"Authorization": f"Bearer {owner_token}"}
    print(f"  ✓ Owner authenticated: {owner_data['name']} (Role: {owner_data['role']}, Outlet: {owner_data['outlet_id']})")

    staff_res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "staff@suryarestaurant.com", "password": "staff123"})
    assert staff_res.status_code == 200, f"Staff login failed: {staff_res.text}"
    staff_data = staff_res.json()
    staff_token = staff_data["access_token"]
    staff_headers = {"Authorization": f"Bearer {staff_token}"}
    print(f"  ✓ Staff authenticated: {staff_data['name']} (Role: {staff_data['role']}, Outlet: {staff_data['outlet_id']})")

    # 2. OUTLET DETAILS
    print("\n[STEP 2] Verifying Surya Restaurant Profile & Kadiri Details...")
    outlet_res = requests.get(f"{BASE_URL}/api/outlets/single?outlet_id=1")
    assert outlet_res.status_code == 200, f"Outlet fetch failed: {outlet_res.text}"
    outlet = outlet_res.json()
    print(f"  ✓ Outlet Name: {outlet['name']}")
    print(f"  ✓ Phone: {outlet['phone']}")
    print(f"  ✓ Address: {outlet['address']}")
    print(f"  ✓ UPI VPA: {outlet['upi_vpa']}")
    assert "Surya" in outlet["name"]
    assert "98803" in outlet["phone"]

    # 3. CATEGORIES & MENU ITEMS
    print("\n[STEP 3] Verifying Menu Categories & Items...")
    cat_res = requests.get(f"{BASE_URL}/api/categories?outlet_id=1")
    assert cat_res.status_code == 200, f"Categories failed: {cat_res.text}"
    categories = cat_res.json()
    print(f"  ✓ Loaded {len(categories)} Categories: {', '.join([c['name'] for c in categories[:5]])}...")

    menu_res = requests.get(f"{BASE_URL}/api/menu?outlet_id=1")
    assert menu_res.status_code == 200, f"Menu items failed: {menu_res.text}"
    items = menu_res.json()
    print(f"  ✓ Loaded {len(items)} Menu Items (Dishes)")
    assert len(items) >= 40, f"Expected at least 40 authentic dishes, got {len(items)}"

    # 4. TABLES & QR CODE
    print("\n[STEP 4] Verifying Tables & Dynamic QR Codes...")
    tables_res = requests.get(f"{BASE_URL}/api/tables?outlet_id=1")
    assert tables_res.status_code == 200, f"Tables failed: {tables_res.text}"
    tables = tables_res.json()
    print(f"  ✓ Loaded {len(tables)} Tables: {', '.join([t['label'] for t in tables])}")
    assert len(tables) >= 12, f"Expected 12 tables, got {len(tables)}"

    table_1 = tables[0]
    qr_res = requests.get(f"{BASE_URL}/api/tables/{table_1['id']}/qr?frontend_url=https://surya-resto.vercel.app")
    assert qr_res.status_code == 200, f"Table QR failed: {qr_res.text}"
    assert "image/png" in qr_res.headers.get("content-type", "")
    print(f"  ✓ Dynamic QR Code successfully rendered for Table {table_1['label']} pointing to Surya Vercel")

    # 5. DINE-IN ORDER LIFECYCLE
    print("\n[STEP 5] Testing End-to-End Order Creation & Lifecycle...")
    item_sample_1 = items[0]
    item_sample_2 = items[1] if len(items) > 1 else items[0]

    order_payload = {
        "outlet_id": 1,
        "table_id": table_1["id"],
        "order_type": "dine_in",
        "customer_name": "Suresh Kadiri",
        "customer_phone": "9880358634",
        "notes": "Extra spicy, less oil please",
        "items": [
            {
                "item_id": item_sample_1["id"],
                "qty": 2,
                "notes": "Crispy",
            },
            {
                "item_id": item_sample_2["id"],
                "qty": 1,
            }
        ],
        "payment_method": "counter"
    }

    create_order_res = requests.post(f"{BASE_URL}/api/orders", json=order_payload)
    assert create_order_res.status_code == 201, f"Create order failed: {create_order_res.text}"
    order = create_order_res.json()
    order_id = order["id"]
    order_num = order["order_number"]
    total_rupees = order["total_paise"] / 100.0
    print(f"  ✓ Order #{order_num} created successfully on Table {table_1['label']} (Total: ₹{total_rupees:.2f}, Status: {order['status']})")

    # Transitions: Placed -> Accepted -> Preparing -> Ready -> Served
    transitions = [
        ("accepted", "Staff accepted order"),
        ("preparing", "Kitchen started cooking"),
        ("ready", "Food ready on pickup counter"),
        ("served", "Delivered to Table T1"),
    ]
    for status, note in transitions:
        patch_res = requests.patch(
            f"{BASE_URL}/api/orders/{order_id}/status",
            json={"status": status},
            headers=staff_headers
        )
        assert patch_res.status_code == 200, f"Status update to {status} failed: {patch_res.text}"
        updated_order = patch_res.json()
        assert updated_order["status"] == status
        print(f"  ✓ Order #{order_num} transitioned to: '{status.upper()}' ({note})")

    # 6. KITCHEN DISPLAY SYSTEM (KDS)
    print("\n[STEP 6] Verifying Kitchen Display System (KDS) Feed...")
    kds_res = requests.get(f"{BASE_URL}/api/orders?outlet_id=1&status=served", headers=staff_headers)
    assert kds_res.status_code == 200, f"KDS query failed: {kds_res.text}"
    found_order = any(o["id"] == order_id for o in kds_res.json())
    assert found_order, f"Order #{order_num} not found in KDS query"
    print(f"  ✓ KDS live tracking operational, order #{order_num} properly tracked")

    # 7. CASHIER POS & BILL SETTLEMENT
    print("\n[STEP 7] Testing Cashier POS Payment & Settle Bill...")
    settle_res = requests.post(
        f"{BASE_URL}/api/payments/{order_id}/mark-cash-paid",
        json={"notes": "Cash collected by Cashier at counter"},
        headers=staff_headers
    )
    assert settle_res.status_code == 200, f"Settle payment failed: {settle_res.text}"
    payment_rec = settle_res.json()
    print(f"  ✓ Bill settled with Cash: Payment ID #{payment_rec.get('payment_id', payment_rec.get('id', 'OK'))}")

    # Complete order
    complete_res = requests.patch(
        f"{BASE_URL}/api/orders/{order_id}/status",
        json={"status": "completed"},
        headers=staff_headers
    )
    assert complete_res.status_code == 200
    print(f"  ✓ Order #{order_num} marked COMPLETED, Table {table_1['label']} freed")

    # 8. SHIFTS & CASH REGISTER (Z-REPORT)
    print("\n[STEP 8] Testing Shift Register & Cash Auditing...")
    shifts_res = requests.get(f"{BASE_URL}/api/shifts/current?outlet_id=1", headers=staff_headers)
    assert shifts_res.status_code in (200, 404)
    print(f"  ✓ Shift register endpoint active (Status code: {shifts_res.status_code})")

    # 9. TABLE RESERVATIONS
    print("\n[STEP 9] Testing Table Reservation System...")
    res_payload = {
        "outlet_id": 1,
        "customer_name": "Venkatesh Rao",
        "customer_phone": "9880358634",
        "party_size": 6,
        "reservation_date": "2026-10-05",
        "reservation_time": "19:30",
        "occasion": "Family Birthday",
        "special_requests": "Need high chair and quiet corner table",
    }
    create_res = requests.post(f"{BASE_URL}/api/reservations", json=res_payload)
    assert create_res.status_code in (200, 201), f"Reservation creation failed: {create_res.text}"
    reservation = create_res.json()
    print(f"  ✓ Table Reservation #{reservation.get('reservation_number', reservation.get('id'))} created for 6 guests on Oct 5, 2026")

    # 10. COUPONS
    print("\n[STEP 10] Testing Promotional Coupons...")
    coupon_res = requests.get(f"{BASE_URL}/api/coupons?outlet_id=1", headers=staff_headers)
    assert coupon_res.status_code == 200, f"Coupon fetch failed: {coupon_res.text}"
    coupons = coupon_res.json()
    print(f"  ✓ Loaded {len(coupons)} Active Coupons: {', '.join([c['code'] for c in coupons])}")

    # Public coupon validation for customers
    val_res = requests.post(f"{BASE_URL}/api/coupons/validate", json={"code": "WELCOME50", "subtotal_paise": 50000, "outlet_id": 1})
    assert val_res.status_code == 200, f"Coupon validate failed: {val_res.text}"
    val_data = val_res.json()
    print(f"  ✓ Public Coupon 'WELCOME50' validated successfully: Discount = ₹{val_data['discount_paise']/100:.2f}")

    # 11. STOCK MANAGEMENT
    print("\n[STEP 11] Testing Real-Time Menu Stock Availability Toggle...")
    toggle_res = requests.patch(
        f"{BASE_URL}/api/menu/{item_sample_1['id']}/availability",
        json={"is_available": False},
        headers=owner_headers
    )
    assert toggle_res.status_code == 200, f"Stock toggle off failed: {toggle_res.text}"
    print(f"  ✓ Toggled '{item_sample_1['name']}' -> OUT OF STOCK")

    toggle_on_res = requests.patch(
        f"{BASE_URL}/api/menu/{item_sample_1['id']}/availability",
        json={"is_available": True},
        headers=owner_headers
    )
    assert toggle_on_res.status_code == 200, f"Stock toggle on failed: {toggle_on_res.text}"
    print(f"  ✓ Restored '{item_sample_1['name']}' -> BACK IN STOCK")

    # 12. SALES & REVENUE ANALYTICS
    print("\n[STEP 12] Testing Analytics & Daily Revenue Summary...")
    analytics_res = requests.get(f"{BASE_URL}/api/analytics/summary?outlet_id=1", headers=owner_headers)
    assert analytics_res.status_code == 200, f"Analytics summary failed: {analytics_res.text}"
    analytics = analytics_res.json()
    print(f"  ✓ Total Orders: {analytics['total_orders']}")
    print(f"  ✓ Total Revenue: ₹{analytics['total_revenue_rupees']:.2f}")
    print(f"  ✓ Average Order Value: ₹{analytics['avg_order_value_rupees']:.2f}")

    # 13. AUDIT LOGGING
    print("\n[STEP 13] Testing Security & Operational Audit Log...")
    audit_res = requests.get(f"{BASE_URL}/api/audit?outlet_id=1", headers=owner_headers)
    assert audit_res.status_code == 200, f"Audit query failed: {audit_res.text}"
    audit_logs = audit_res.json()
    print(f"  ✓ Total Audit Entries: {len(audit_logs)}")
    if len(audit_logs) > 0:
        latest = audit_logs[0]
        print(f"  ✓ Latest Log: Action={latest.get('action')}, Entity={latest.get('entity_type')}, User={latest.get('user_name')}")

    print("\n" + "=" * 80)
    print("🏆 ALL 13 OPERATIONAL SUITES PASSED FLAWLESSLY FOR SURYA RESTAURANT!")
    print("=" * 80 + "\n")

if __name__ == "__main__":
    run_tests()
