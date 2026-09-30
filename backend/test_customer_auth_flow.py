import requests
import json
import random
import time

BASE = "http://127.0.0.1:8000"

def test_flow():
    test_phone = f"98{random.randint(10000000, 99999999)}"
    test_password = "password123"

    print("1. Testing /check-phone for new user...")
    r = requests.post(f"{BASE}/api/customer/check-phone", json={"phone": test_phone})
    print(f"Status: {r.status_code}, Res: {r.json()}")
    assert r.status_code == 200

    print("\n2. Testing /register with 10-digit mobile & password (Zero OTP)...")
    r = requests.post(
        f"{BASE}/api/customer/register",
        json={"phone": test_phone, "name": "Venkatesh Rao", "password": test_password},
    )
    print(f"Status: {r.status_code}")
    assert r.status_code == 200, r.text
    reg_data = r.json()
    token = reg_data["access_token"]
    assert token, "Token should be present"
    print(f"Customer registered! ID: {reg_data['customer']['id']}, Token prefix: {token[:20]}...")

    print("\n3. Testing /login with correct password...")
    r = requests.post(
        f"{BASE}/api/customer/login",
        json={"phone": test_phone, "password": test_password},
    )
    assert r.status_code == 200, r.text
    login_token = r.json()["access_token"]
    print("Login successful! Token generated.")

    print("\n4. Testing /login with incorrect password...")
    r = requests.post(
        f"{BASE}/api/customer/login",
        json={"phone": test_phone, "password": "wrongpassword"},
    )
    print(f"Status: {r.status_code}, Res: {r.json()}")
    assert r.status_code == 400

    print("\n5. Testing /api/orders without token (Should be 401 Unauthorized)...")
    order_payload = {
        "outlet_id": 1,
        "table_id": 1,
        "order_type": "dine_in",
        "payment_method": "counter",
        "items": [{"item_id": 1, "qty": 1}],
    }
    r = requests.post(f"{BASE}/api/orders", json=order_payload)
    print(f"Status: {r.status_code}, Detail: {r.json().get('detail')}")
    assert r.status_code == 401, f"Expected 401, got {r.status_code}"

    print("\n6. Testing /api/orders with X-Customer-Token header...")
    headers = {"X-Customer-Token": token}
    r = requests.post(f"{BASE}/api/orders", json=order_payload, headers=headers)
    print(f"Status: {r.status_code}")
    assert r.status_code == 201, r.text
    created = r.json()
    print(f"Order created! Number: {created['order_number']}, Customer ID: {created.get('customer_id')}, Customer Phone: {created.get('customer_phone')}")
    assert created.get("customer_id") == reg_data["customer"]["id"]
    assert created.get("customer_phone") == test_phone

    print("\n7. Testing customer order count in response...")
    print(f"customer_order_count: {created.get('customer_order_count')}")
    assert created.get("customer_order_count") >= 1

    print("\nALL BACKEND AUTH & ORDER GATE TESTS PASSED!")

if __name__ == "__main__":
    test_flow()
