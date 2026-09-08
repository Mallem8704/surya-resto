import sys
import json
import requests

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

BASE_URL = "http://127.0.0.1:8000"


def run_tests():
    print("\n" + "=" * 75)
    print("🧪 TESTING ORDERS ROUTER (FINANCIAL CALCULATIONS, STOCK & KANBAN)")
    print("=" * 75)

    # 1. Login as Staff
    print("\n[STEP 1] Logging in as Staff...")
    staff_res = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "staff@teatime.com", "password": "staff123"},
    )
    assert staff_res.status_code == 200
    staff_token = staff_res.json()["access_token"]
    staff_headers = {"Authorization": f"Bearer {staff_token}"}
    print("✓ Staff authenticated")

    # 2. Get initial stock of items 1 (Irani Chai) and 6 (Bun Maska)
    print("\n[STEP 2] Fetching initial stock for Irani Chai (Item 1) and Bun Maska (Item 6)...")
    item1_res = requests.get(f"{BASE_URL}/api/menu/1")
    assert item1_res.status_code == 200
    item1 = item1_res.json()
    initial_stock_1 = item1["stock_qty"]
    price_1 = item1["price_paise"]

    item6_res = requests.get(f"{BASE_URL}/api/menu/6")
    assert item6_res.status_code == 200
    item6 = item6_res.json()
    initial_stock_6 = item6["stock_qty"]
    price_6 = item6["price_paise"]

    print(f"✓ Item 1 ({item1['name']}): Stock = {initial_stock_1}, Price = ₹{price_1/100:.2f} ({price_1} paise)")
    print(f"✓ Item 6 ({item6['name']}): Stock = {initial_stock_6}, Price = ₹{price_6/100:.2f} ({price_6} paise)")

    # 3. Customer places Order for Table 1 (2x Irani Chai + 1x Bun Maska)
    print("\n[STEP 3] Placing customer order for Table 1 (2x Irani Chai + 1x Bun Maska)...")
    order_payload = {
        "table_id": 1,
        "customer_notes": "Extra hot chai, please!",
        "payment_method": "counter",
        "items": [
            {"item_id": 1, "qty": 2, "notes": "Strong and extra hot"},
            {"item_id": 6, "qty": 1, "notes": "Toasted crisp"},
        ],
    }

    order_res = requests.post(f"{BASE_URL}/api/orders", json=order_payload)
    assert order_res.status_code == 201, f"Create order failed: {order_res.text}"
    order = order_res.json()
    order_id = order["id"]

    expected_subtotal = (2 * price_1) + (1 * price_6)
    expected_tax = int(round(expected_subtotal * 0.05))
    expected_total = expected_subtotal + expected_tax

    print(f"✓ Order Created: #{order['order_number']} (ID: {order_id})")
    print(f"  • Table: {order['table_label']} | Status: {order['status']}")
    print(f"  • Subtotal: ₹{order['subtotal_paise']/100:.2f} (Expected: ₹{expected_subtotal/100:.2f})")
    print(f"  • Tax (5% GST): ₹{order['tax_paise']/100:.2f} (Expected: ₹{expected_tax/100:.2f})")
    print(f"  • Total: ₹{order['total_paise']/100:.2f} (Expected: ₹{expected_total/100:.2f})")

    assert order["subtotal_paise"] == expected_subtotal, "Subtotal calculation mismatch"
    assert order["tax_paise"] == expected_tax, "Tax calculation mismatch"
    assert order["total_paise"] == expected_total, "Total calculation mismatch"
    print("✓ Financial calculations in paise are 100% exact!")

    # 4. Verify Stock Deduction
    print("\n[STEP 4] Verifying inventory was deducted for tracked items...")
    item1_after = requests.get(f"{BASE_URL}/api/menu/1").json()
    item6_after = requests.get(f"{BASE_URL}/api/menu/6").json()

    assert item1_after["stock_qty"] == initial_stock_1 - 2, f"Expected {initial_stock_1 - 2}, got {item1_after['stock_qty']}"
    assert item6_after["stock_qty"] == initial_stock_6 - 1, f"Expected {initial_stock_6 - 1}, got {item6_after['stock_qty']}"
    print(f"✓ Item 1 Stock: {initial_stock_1} -> {item1_after['stock_qty']} (-2)")
    print(f"✓ Item 6 Stock: {initial_stock_6} -> {item6_after['stock_qty']} (-1)")

    # 5. Test Stock Shortage Rejection
    print("\n[STEP 5] Testing stock shortage rejection (ordering 9999 Bun Maska)...")
    huge_order = {
        "table_id": 1,
        "items": [{"item_id": 6, "qty": 9999}],
    }
    shortage_res = requests.post(f"{BASE_URL}/api/orders", json=huge_order)
    assert shortage_res.status_code == 400, f"Expected 400, got {shortage_res.status_code}"
    print(f"✓ Correctly rejected with 400: {shortage_res.json()['detail']}")

    # 6. Customer lookup without authentication
    print(f"\n[STEP 6] Customer tracking lookup GET /api/orders/{order_id} (No Auth Header)...")
    customer_view_res = requests.get(f"{BASE_URL}/api/orders/{order_id}")
    assert customer_view_res.status_code == 200
    cv = customer_view_res.json()
    assert cv["order_number"] == order["order_number"]
    assert len(cv["items"]) == 2
    print(f"✓ Customer tracking view loaded: Table {cv['table_label']} | Order #{cv['order_number']} | Status: {cv['status']}")

    # 7. Walk order through Kanban statuses: placed -> accepted -> preparing -> ready -> served
    print(f"\n[STEP 7] Progressing order #{order['order_number']} through Kanban workflow...")
    statuses = ["accepted", "preparing", "ready", "served"]
    for next_status in statuses:
        status_res = requests.patch(
            f"{BASE_URL}/api/orders/{order_id}/status",
            json={"status": next_status},
            headers=staff_headers,
        )
        assert status_res.status_code == 200, f"Failed to set status {next_status}: {status_res.text}"
        updated_status = status_res.json()["status"]
        assert updated_status == next_status
        print(f"  ➔ Status updated to: '{updated_status.upper()}'")

    # 8. Test Cancellation & Stock Restoration
    print("\n[STEP 8] Testing Order Cancellation and Stock Auto-Restoration...")
    curr_stock_6 = requests.get(f"{BASE_URL}/api/menu/6").json()["stock_qty"]
    order2_res = requests.post(
        f"{BASE_URL}/api/orders",
        json={"table_id": 2, "items": [{"item_id": 6, "qty": 5}]},
    )
    assert order2_res.status_code == 201
    order2 = order2_res.json()
    after_order2_stock = requests.get(f"{BASE_URL}/api/menu/6").json()["stock_qty"]
    assert after_order2_stock == curr_stock_6 - 5
    print(f"✓ Created order 2 (-5 stock). Current Bun Maska stock = {after_order2_stock}")

    # Now cancel order 2
    cancel_res = requests.patch(
        f"{BASE_URL}/api/orders/{order2['id']}/status",
        json={"status": "cancelled"},
        headers=staff_headers,
    )
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "cancelled"

    restored_stock_6 = requests.get(f"{BASE_URL}/api/menu/6").json()["stock_qty"]
    assert restored_stock_6 == curr_stock_6, f"Expected stock restored to {curr_stock_6}, got {restored_stock_6}"
    print(f"✓ Cancelled order 2: Stock restored from {after_order2_stock} back to {restored_stock_6} (+5)")

    # 9. Admin List & Filter Orders
    print("\n[STEP 9] Admin listing and filtering orders...")
    admin_list_res = requests.get(f"{BASE_URL}/api/orders?status=served,cancelled", headers=staff_headers)
    assert admin_list_res.status_code == 200
    filtered_orders = admin_list_res.json()
    print(f"✓ Found {len(filtered_orders)} orders matching status filter (served, cancelled)")

    print("\n" + "=" * 75)
    print("🎉 ALL ORDERS, INVENTORY & KANBAN STATUS TESTS PASSED SUCCESSFULLY!")
    print("=" * 75 + "\n")


if __name__ == "__main__":
    run_tests()
