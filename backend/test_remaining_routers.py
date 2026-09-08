import sys
import json
import requests

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

BASE_URL = "http://127.0.0.1:8000"


def run_tests():
    print("\n" + "=" * 75)
    print("🧪 TESTING STOCK, PAYMENTS, SERVICE CALLS & ANALYTICS ROUTERS")
    print("=" * 75)

    # 1. Authenticate Staff & Owner
    print("\n[STEP 1] Authenticating Owner and Staff...")
    owner_res = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "owner@teatime.com", "password": "admin123"},
    )
    assert owner_res.status_code == 200
    owner_headers = {"Authorization": f"Bearer {owner_res.json()['access_token']}"}

    staff_res = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "staff@teatime.com", "password": "staff123"},
    )
    assert staff_res.status_code == 200
    staff_headers = {"Authorization": f"Bearer {staff_res.json()['access_token']}"}
    print("✓ Both Owner and Staff authenticated")

    # 2. Test Stock Management
    print("\n[STEP 2] Testing Inventory & Stock Management...")
    stock_overview_res = requests.get(f"{BASE_URL}/api/stock", headers=staff_headers)
    assert stock_overview_res.status_code == 200
    stock_items = stock_overview_res.json()
    print(f"✓ Stock overview loaded: {len(stock_items)} items tracked")

    item1_initial_stock = requests.get(f"{BASE_URL}/api/menu/1").json()["stock_qty"]
    print(f"  • Current stock for Item 1 (Irani Chai): {item1_initial_stock}")

    # Perform manual restock (+50)
    print("  • Recording manual restock of +50 units for Item 1...")
    adjust_res = requests.post(
        f"{BASE_URL}/api/stock/adjust",
        json={"item_id": 1, "change_qty": 50, "reason": "restock", "notes": "Morning fresh milk delivery"},
        headers=staff_headers,
    )
    assert adjust_res.status_code == 200
    updated_item1 = adjust_res.json()
    assert updated_item1["stock_qty"] == item1_initial_stock + 50
    print(f"✓ Stock successfully increased: {item1_initial_stock} -> {updated_item1['stock_qty']} (+50)")

    # Verify Stock Logs
    logs_res = requests.get(f"{BASE_URL}/api/stock/logs?item_id=1", headers=staff_headers)
    assert logs_res.status_code == 200
    logs = logs_res.json()
    assert len(logs) > 0
    print(f"✓ Stock transaction log verified (Recent log: {logs[0]['reason']} {logs[0]['change_qty']} units)")

    # 3. Test Payments: Razorpay & Cash Reconciliation
    print("\n[STEP 3] Testing Payments (Razorpay Online & Cash Reconciliation)...")
    # Place a new order for Table 4 (1x Samosa + 1x Filter Coffee)
    order_res = requests.post(
        f"{BASE_URL}/api/orders",
        json={"table_id": 4, "items": [{"item_id": 7, "qty": 1}, {"item_id": 4, "qty": 1}], "payment_method": "counter"},
    )
    assert order_res.status_code == 201
    order_a = order_res.json()
    print(f"✓ Created test order A: #{order_a['order_number']} (ID: {order_a['id']}) Total = ₹{order_a['total_paise']/100:.2f}")

    # Razorpay Order Creation
    rzp_order_res = requests.post(
        f"{BASE_URL}/api/payments/create-razorpay-order",
        json={"order_id": order_a["id"]},
    )
    assert rzp_order_res.status_code == 200
    rzp_data = rzp_order_res.json()
    print(f"✓ Created Razorpay Order ID: {rzp_data['razorpay_order_id']} for ₹{rzp_data['amount_paise']/100:.2f}")

    # Razorpay Payment Verification
    verify_res = requests.post(
        f"{BASE_URL}/api/payments/verify-razorpay-payment",
        json={
            "order_id": order_a["id"],
            "razorpay_order_id": rzp_data["razorpay_order_id"],
            "razorpay_payment_id": "pay_test_9876543210",
            "razorpay_signature": "mock_sig_valid_123456",
        },
    )
    assert verify_res.status_code == 200
    print(f"✓ Razorpay Payment Verified: Order #{order_a['order_number']} payment status = '{verify_res.json()['payment_status']}'")

    # Place a 2nd order for Cash Counter Reconciliation
    order_b_res = requests.post(
        f"{BASE_URL}/api/orders",
        json={"table_id": 5, "items": [{"item_id": 6, "qty": 2}], "payment_method": "cash"},
    )
    assert order_b_res.status_code == 201
    order_b = order_b_res.json()

    cash_pay_res = requests.post(
        f"{BASE_URL}/api/payments/{order_b['id']}/mark-cash-paid",
        json={"notes": "Cash collected at billing counter"},
        headers=staff_headers,
    )
    assert cash_pay_res.status_code == 200
    print(f"✓ Cash Payment Reconciled: Order #{order_b['order_number']} marked paid in cash by {cash_pay_res.json()['collected_by']}")

    # List Payments
    payments_list_res = requests.get(f"{BASE_URL}/api/payments", headers=staff_headers)
    assert payments_list_res.status_code == 200
    payments = payments_list_res.json()
    assert len(payments) >= 2
    print(f"✓ Payments ledger loaded: {len(payments)} completed transactions")

    # 4. Test Service Calls
    print("\n[STEP 4] Testing Service Calls (Waiter/Bill/Water)...")
    service_req_res = requests.post(
        f"{BASE_URL}/api/service-calls",
        json={"table_id": 2, "call_type": "bill", "notes": "Requesting bill for table 2"},
    )
    assert service_req_res.status_code == 201
    service_call = service_req_res.json()
    print(f"✓ Customer created Service Call: ID {service_call['id']} on Table {service_call['table_label']} ({service_call['call_type'].upper()})")

    # Staff attends call
    attend_res = requests.patch(f"{BASE_URL}/api/service-calls/{service_call['id']}/attend", headers=staff_headers)
    assert attend_res.status_code == 200
    assert attend_res.json()["status"] == "attended"
    print(f"✓ Staff marked Service Call #{service_call['id']} as 'ATTENDED'")

    # 5. Test Analytics Aggregation
    print("\n[STEP 5] Testing Sales & Analytics Dashboards...")
    summary_res = requests.get(f"{BASE_URL}/api/analytics/summary", headers=owner_headers)
    assert summary_res.status_code == 200
    summary = summary_res.json()
    print("✓ Analytics Summary KPI:")
    print(f"  • Total Orders: {summary['total_orders']}")
    print(f"  • Total Revenue: ₹{summary['total_revenue_rupees']:.2f} ({summary['total_revenue_paise']} paise)")
    print(f"  • Average Order Value (AOV): ₹{summary['avg_order_value_rupees']:.2f}")
    print(f"  • Total Items Sold: {summary['total_items_sold']}")

    # Top items
    top_items_res = requests.get(f"{BASE_URL}/api/analytics/top-items", headers=owner_headers)
    assert top_items_res.status_code == 200
    top_items = top_items_res.json()
    print(f"\n✓ Top Selling Items ({len(top_items)} items):")
    for ti in top_items[:4]:
        print(f"  • {ti['item_name']:<25s}: {ti['qty_sold']} sold (₹{ti['revenue_rupees']:.2f})")

    # Revenue over time
    rev_trend_res = requests.get(f"{BASE_URL}/api/analytics/revenue-over-time?days=7", headers=owner_headers)
    assert rev_trend_res.status_code == 200
    rev_trend = rev_trend_res.json()
    print(f"\n✓ Revenue Trend (7 Days): {len(rev_trend)} daily data points loaded")

    # Hourly distribution
    hourly_res = requests.get(f"{BASE_URL}/api/analytics/hourly-distribution", headers=owner_headers)
    assert hourly_res.status_code == 200
    hourly = hourly_res.json()
    print(f"✓ Hourly Distribution: {len(hourly)} hourly buckets loaded for heatmap")

    # Category breakdown
    cat_breakdown_res = requests.get(f"{BASE_URL}/api/analytics/category-breakdown", headers=owner_headers)
    assert cat_breakdown_res.status_code == 200
    cat_breakdown = cat_breakdown_res.json()
    print(f"✓ Category Sales Breakdown: {len(cat_breakdown)} categories analyzed")
    for cb in cat_breakdown:
        print(f"  • {cb['category_name']:<25s}: {cb['qty_sold']} sold | ₹{cb['revenue_rupees']:.2f} ({cb['percentage']}%)")

    # Table turnover
    table_turnover_res = requests.get(f"{BASE_URL}/api/analytics/table-turnover", headers=owner_headers)
    assert table_turnover_res.status_code == 200
    turnover = table_turnover_res.json()
    print(f"✓ Table Turnover Metrics: {len(turnover)} tables tracked")

    print("\n" + "=" * 75)
    print("🎉 ALL STOCK, PAYMENTS, SERVICE CALLS & ANALYTICS TESTS PASSED!")
    print("=" * 75 + "\n")


if __name__ == "__main__":
    run_tests()
