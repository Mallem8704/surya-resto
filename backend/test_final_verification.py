import sys
import requests

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

BASE_URL = "http://127.0.0.1:8000"

def test_final_system():
    print("\n" + "=" * 75)
    print("🧪 FINAL SYSTEM INTEGRATION TEST: PAYMENTS, ANALYTICS & AUDIT LOGS")
    print("=" * 75)

    # 1. Login Staff & Owner
    owner_res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "owner@teatime.com", "password": "admin123"})
    assert owner_res.status_code == 200
    owner_headers = {"Authorization": f"Bearer {owner_res.json()['access_token']}"}

    staff_res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "staff@teatime.com", "password": "staff123"})
    assert staff_res.status_code == 200
    staff_headers = {"Authorization": f"Bearer {staff_res.json()['access_token']}"}
    print("✓ Both Owner & Staff accounts authenticated")

    # 2. Place Order 1 with Online Payment (UPI) on Table 3
    order1_res = requests.post(
        f"{BASE_URL}/api/orders",
        json={"table_id": 3, "items": [{"item_id": 1, "qty": 2}, {"item_id": 5, "qty": 2}], "payment_method": "upi"}
    )
    assert order1_res.status_code == 201
    order1 = order1_res.json()
    print(f"✓ Order #1 placed: #{order1['order_number']} on Table 3 (Total = ₹{order1['total_paise']/100:.2f})")

    # Complete Online Payment
    rzp_res = requests.post(f"{BASE_URL}/api/payments/create-razorpay-order", json={"order_id": order1["id"]})
    assert rzp_res.status_code == 200
    verify_res = requests.post(
        f"{BASE_URL}/api/payments/verify-razorpay-payment",
        json={
            "order_id": order1["id"],
            "razorpay_order_id": rzp_res.json()["razorpay_order_id"],
            "razorpay_payment_id": f"pay_test_{order1['id']}",
            "razorpay_signature": "mock_sig_valid",
        }
    )
    assert verify_res.status_code == 200
    print(f"✓ Order #1 UPI Payment Verified & Marked Paid")

    # 3. Place Order 2 with Cash Counter on Table 6
    order2_res = requests.post(
        f"{BASE_URL}/api/orders",
        json={"table_id": 6, "items": [{"item_id": 3, "qty": 3}, {"item_id": 6, "qty": 2}], "payment_method": "counter"}
    )
    assert order2_res.status_code == 201
    order2 = order2_res.json()
    print(f"✓ Order #2 placed: #{order2['order_number']} on Table 6 (Total = ₹{order2['total_paise']/100:.2f})")

    # Staff reconciles cash payment
    cash_res = requests.post(
        f"{BASE_URL}/api/payments/{order2['id']}/mark-cash-paid",
        json={"notes": "Cash collected at counter by Suresh"},
        headers=staff_headers
    )
    assert cash_res.status_code == 200
    print(f"✓ Order #2 Cash Reconciled by Staff Suresh Kumar")

    # 4. Owner edits price of Ginger Tea (Item 2) to ₹22.00 (2200 paise)
    price_res = requests.patch(
        f"{BASE_URL}/api/menu/2/price",
        json={"price_paise": 2200},
        headers=owner_headers
    )
    assert price_res.status_code == 200
    print(f"✓ Owner edited Ginger Tea price to ₹22.00")

    # 5. Query Analytics Summary & Top Items
    analytics_res = requests.get(f"{BASE_URL}/api/analytics/summary", headers=owner_headers)
    assert analytics_res.status_code == 200
    summary = analytics_res.json()
    print(f"\n✓ Analytics Summary:")
    print(f"  • Total Orders: {summary['total_orders']}")
    print(f"  • Total Revenue: ₹{summary['total_revenue_rupees']:.2f}")
    print(f"  • Average Order Value (AOV): ₹{summary['avg_order_value_rupees']:.2f}")
    print(f"  • Total Items Sold: {summary['total_items_sold']} units")

    # 6. Query Audit Logs
    audit_res = requests.get(f"{BASE_URL}/api/audit", headers=owner_headers)
    assert audit_res.status_code == 200
    audit_logs = audit_res.json()
    assert len(audit_logs) > 0
    print(f"\n✓ Audit Logs ({len(audit_logs)} mutations recorded):")
    for log in audit_logs[:4]:
        detail_text = log.get("details_json") or log.get("details") or ""
        print(f"  • [Log #{log['id']}] {log['action']} on {log['entity_type']} #{log['entity_id']} by {log['user_name']} -> {detail_text}")

    print("\n" + "=" * 75)
    print("🎉 ALL FINAL INTEGRATION TESTS PASSED PERFECTLY!")
    print("=" * 75 + "\n")

if __name__ == "__main__":
    test_final_system()
