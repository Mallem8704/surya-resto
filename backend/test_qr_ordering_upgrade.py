"""Acceptance Test Suite for Tea Time Cafe QR Ordering System Upgrade.
Validates all scenarios from the prompt:
1. Complete customer order lifecycle (Table T1 QR -> Cart -> Total calculation -> Order creation -> Status progression Placed -> Accepted -> Preparing -> Ready -> Served).
2. Availability toggles and rejection of unavailable items on checkout.
3. Owner price editing with RBAC protection, audit log generation, and historical order price snapshot preservation.
"""

import sys
import requests

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

BASE_URL = "http://127.0.0.1:8000/api"


def run_upgrade_acceptance_tests():
    print("\n" + "=" * 75)
    print("🧪 RUNNING TEA TIME CAFE QR ORDERING UPGRADE ACCEPTANCE TEST SUITE")
    print("=" * 75)

    # 1. Authenticate Owner and Staff
    print("\n[STEP 1] Authenticating Owner & Staff...")
    owner_login = requests.post(f"{BASE_URL}/auth/login", json={"email": "owner@teatime.com", "password": "admin123"})
    assert owner_login.status_code == 200, f"Owner login failed: {owner_login.text}"
    owner_token = owner_login.json()["access_token"]
    owner_headers = {"Authorization": f"Bearer {owner_token}"}
    print("✓ Owner authenticated")

    staff_login = requests.post(f"{BASE_URL}/auth/login", json={"email": "staff@teatime.com", "password": "staff123"})
    assert staff_login.status_code == 200, f"Staff login failed: {staff_login.text}"
    staff_token = staff_login.json()["access_token"]
    staff_headers = {"Authorization": f"Bearer {staff_token}"}
    print("✓ Staff authenticated")

    # 2. Verify all 58 items and 6 categories are seeded
    print("\n[STEP 2] Verifying Categories and Menu Seed Data...")
    cats_res = requests.get(f"{BASE_URL}/categories")
    assert cats_res.status_code == 200
    categories = cats_res.json()
    print(f"✓ Found {len(categories)} categories: {[c['name'] for c in categories]}")
    assert len(categories) == 6, f"Expected 6 categories, got {len(categories)}"

    menu_res = requests.get(f"{BASE_URL}/menu")
    assert menu_res.status_code == 200
    menu_items = menu_res.json()
    print(f"✓ Found {len(menu_items)} menu items seeded in database")
    assert len(menu_items) >= 58, f"Expected at least 58 items, got {len(menu_items)}"

    # Find Masala Tea, Chicken Puff, and Chocolate Shake
    masala_tea = next((i for i in menu_items if i["name"] == "Masala Tea"), None)
    chicken_puff = next((i for i in menu_items if i["name"] == "Chicken Puff"), None)
    chocolate_shake = next((i for i in menu_items if i["name"] == "Chocolate Shake"), None)

    assert masala_tea is not None, "Masala Tea missing from menu"
    assert chicken_puff is not None, "Chicken Puff missing from menu"
    assert chocolate_shake is not None, "Chocolate Shake missing from menu"

    # Ensure clean baseline prices and availability
    requests.patch(f"{BASE_URL}/menu/{masala_tea['id']}/price", json={"price_paise": 1500}, headers=owner_headers)
    requests.patch(f"{BASE_URL}/menu/{masala_tea['id']}/availability", json={"is_available": True}, headers=staff_headers)
    requests.patch(f"{BASE_URL}/menu/{chocolate_shake['id']}/availability", json={"is_available": True}, headers=staff_headers)
    
    masala_tea = requests.get(f"{BASE_URL}/menu/{masala_tea['id']}").json()
    chicken_puff = requests.get(f"{BASE_URL}/menu/{chicken_puff['id']}").json()
    chocolate_shake = requests.get(f"{BASE_URL}/menu/{chocolate_shake['id']}").json()

    print(f"  • Masala Tea: ₹{masala_tea['price_paise']/100:.2f} (Available: {masala_tea['is_available']})")
    print(f"  • Chicken Puff: ₹{chicken_puff['price_paise']/100:.2f} (Available: {chicken_puff['is_available']})")
    print(f"  • Chocolate Shake: ₹{chocolate_shake['price_paise']/100:.2f} (Available: {chocolate_shake['is_available']})")

    # 3. SCENARIO 1: Customer Order Lifecycle on Table T1
    print("\n" + "-" * 60)
    print("[SCENARIO 1] Customer Scans Table T1 QR and Places Order")
    print("-" * 60)

    tables_res = requests.get(f"{BASE_URL}/tables")
    assert tables_res.status_code == 200
    table_1 = next((t for t in tables_res.json() if t["label"] == "T1"), None)
    assert table_1 is not None, "Table T1 missing"

    # Customer adds 2 Masala Tea (₹15 each) + 1 Chicken Puff (₹30 each)
    order_payload = {
        "table_id": table_1["id"],
        "customer_notes": "Please prepare quickly",
        "payment_method": "counter",
        "items": [
            {
                "item_id": masala_tea["id"],
                "qty": 2,
                "notes": "Less sugar, extra hot",
            },
            {
                "item_id": chicken_puff["id"],
                "qty": 1,
                "notes": "Crispy warm",
            },
        ],
    }

    create_res = requests.post(f"{BASE_URL}/orders", json=order_payload)
    assert create_res.status_code == 201, f"Order creation failed: {create_res.text}"
    created_order = create_res.json()
    order_id = created_order["id"]
    order_number = created_order["order_number"]

    # Verify Financial Calculations
    # Subtotal = 2*1500 + 1*3000 = 6000 paise (₹60.00)
    # GST (5%) = 300 paise (₹3.00)
    # Total = 6300 paise (₹63.00)
    print(f"✓ Order #{order_number} created successfully on Table T1")
    print(f"  • Subtotal: ₹{created_order['subtotal_paise']/100:.2f} (Expected ₹60.00)")
    print(f"  • Tax (5% GST): ₹{created_order['tax_paise']/100:.2f} (Expected ₹3.00)")
    print(f"  • Total: ₹{created_order['total_paise']/100:.2f} (Expected ₹63.00)")
    print(f"  • Status: {created_order['status']}")
    print(f"  • Payment Status: {created_order['payment_status']} ({created_order['payment_method']})")

    assert created_order["subtotal_paise"] == 6000, f"Expected 6000, got {created_order['subtotal_paise']}"
    assert created_order["tax_paise"] == 300, f"Expected 300, got {created_order['tax_paise']}"
    assert created_order["total_paise"] == 6300, f"Expected 6300, got {created_order['total_paise']}"
    assert len(created_order["items"]) == 2

    # Verify Order Item Snapshots
    tea_item = next(i for i in created_order["items"] if i["item_name"] == "Masala Tea")
    assert tea_item["unit_price_paise"] == 1500
    assert tea_item["qty"] == 2
    assert tea_item["total_price_paise"] == 3000
    assert tea_item["notes"] == "Less sugar, extra hot"
    print("✓ Order item snapshots and notes verified")

    # Staff walks order through all statuses
    print("\n[STEP 3b] Advancing Order Status through Live Pipeline...")
    statuses = ["accepted", "preparing", "ready", "served"]
    for next_status in statuses:
        patch_res = requests.patch(
            f"{BASE_URL}/orders/{order_id}/status",
            json={"status": next_status},
            headers=staff_headers,
        )
        assert patch_res.status_code == 200, f"Status transition to {next_status} failed: {patch_res.text}"
        updated_ord = patch_res.json()
        print(f"  ➔ Status advanced to: {updated_ord['status'].upper()}")
        assert updated_ord["status"] == next_status

    print("✓ Completed full status flow: PLACED ➔ ACCEPTED ➔ PREPARING ➔ READY ➔ SERVED")

    # 4. SCENARIO 2: Availability Management & Checkout Validation
    print("\n" + "-" * 60)
    print("[SCENARIO 2] Availability Management & Checkout Race Condition Protection")
    print("-" * 60)

    # Staff marks Chocolate Shake as Unavailable
    print(f"[ACTION] Staff toggling Chocolate Shake ({chocolate_shake['id']}) to UNAVAILABLE...")
    avail_res = requests.patch(
        f"{BASE_URL}/menu/{chocolate_shake['id']}/availability",
        json={"is_available": False},
        headers=staff_headers,
    )
    assert avail_res.status_code == 200
    updated_shake = avail_res.json()
    assert updated_shake["is_available"] is False
    print("✓ Chocolate Shake marked UNAVAILABLE in database")

    # Verify customer menu reflects unavailable status
    menu_check = requests.get(f"{BASE_URL}/menu/{chocolate_shake['id']}").json()
    assert menu_check["is_available"] is False

    # Attempt to place order with unavailable item
    print("[TEST] Customer attempting to order unavailable Chocolate Shake...")
    bad_order_payload = {
        "table_id": table_1["id"],
        "payment_method": "counter",
        "items": [
            {
                "item_id": chocolate_shake["id"],
                "qty": 1,
            }
        ],
    }
    bad_order_res = requests.post(f"{BASE_URL}/orders", json=bad_order_payload)
    print(f"✓ Backend rejected unavailable item (HTTP {bad_order_res.status_code}): {bad_order_res.json()['detail']}")
    assert bad_order_res.status_code == 400
    assert "unavailable" in bad_order_res.json()["detail"].lower()

    # Re-enable availability
    requests.patch(
        f"{BASE_URL}/menu/{chocolate_shake['id']}/availability",
        json={"is_available": True},
        headers=staff_headers,
    )
    print("✓ Chocolate Shake re-enabled to AVAILABLE")

    # 5. SCENARIO 3: Price Editing & Historical Price Snapshotting
    print("\n" + "-" * 60)
    print("[SCENARIO 3] Owner Price Editing & Historical Order Snapshot Preservation")
    print("-" * 60)

    # 5a. Staff attempts to edit price (Should be 403 Forbidden)
    print("[TEST] Staff attempting to edit Masala Tea price (RBAC check)...")
    forbidden_res = requests.patch(
        f"{BASE_URL}/menu/{masala_tea['id']}/price",
        json={"price_paise": 2000},
        headers=staff_headers,
    )
    assert forbidden_res.status_code == 403, "Staff should NOT be allowed to edit price"
    print(f"✓ Staff correctly forbidden from price editing (HTTP 403): {forbidden_res.json()['detail']}")

    # 5b. Owner updates Masala Tea price from ₹15.00 (1500 paise) -> ₹20.00 (2000 paise)
    print("[ACTION] Owner editing Masala Tea price from ₹15.00 to ₹20.00...")
    price_res = requests.patch(
        f"{BASE_URL}/menu/{masala_tea['id']}/price",
        json={"price_paise": 2000},
        headers=owner_headers,
    )
    assert price_res.status_code == 200, f"Price change failed: {price_res.text}"
    updated_tea = price_res.json()
    assert updated_tea["price_paise"] == 2000
    print(f"✓ Masala Tea price successfully updated to ₹{updated_tea['price_paise']/100:.2f}")

    # 5c. New customer sees new price ₹20.00
    new_menu = requests.get(f"{BASE_URL}/menu/{masala_tea['id']}").json()
    assert new_menu["price_paise"] == 2000
    print(f"✓ New customer sees updated price: ₹{new_menu['price_paise']/100:.2f}")

    # 5d. Old completed order from Scenario 1 still retains original ₹15.00 price!
    print(f"[VERIFY] Checking historical Order #{order_number} to confirm price snapshot is preserved...")
    historical_order_res = requests.get(f"{BASE_URL}/orders/{order_id}")
    assert historical_order_res.status_code == 200
    historical_order = historical_order_res.json()
    hist_tea = next(i for i in historical_order["items"] if i["item_name"] == "Masala Tea")
    assert hist_tea["unit_price_paise"] == 1500, f"Historical price was corrupted! Expected 1500, got {hist_tea['unit_price_paise']}"
    assert historical_order["total_paise"] == 6300, f"Historical total corrupted! Expected 6300, got {historical_order['total_paise']}"
    print(f"✓ Historical order snapshot confirmed: Masala Tea unit price remains ₹{hist_tea['unit_price_paise']/100:.2f} (Total: ₹{historical_order['total_paise']/100:.2f})")

    # 6. Verify Audit Log
    print("\n[STEP 6] Verifying System Audit Logs...")
    audit_res = requests.get(f"{BASE_URL}/audit", headers=owner_headers)
    assert audit_res.status_code == 200
    audit_logs = audit_res.json()
    price_audit = next((l for l in audit_logs if l["action"] == "price_change" and l["entity_id"] == masala_tea["id"]), None)
    assert price_audit is not None, "Price change audit log not found"
    print(f"✓ Audit log verified: Action '{price_audit['action']}' by {price_audit['user_name']} -> {price_audit['details_json']}")

    print("\n" + "=" * 75)
    print("🎉 ALL ACCEPTANCE SCENARIOS PASSED WITH 100% SUCCESS!")
    print("=" * 75 + "\n")


if __name__ == "__main__":
    run_upgrade_acceptance_tests()
