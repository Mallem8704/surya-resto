import sys
import requests

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

BASE_URL = "http://127.0.0.1:8000"

def test_admin_ops():
    print("\n" + "=" * 70)
    print("🧪 TESTING OPERATIONAL FLOWS: PRICE EDIT & QR GENERATION")
    print("=" * 70)

    # 1. Login as Owner
    login_res = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "owner@teatime.com", "password": "admin123"},
    )
    assert login_res.status_code == 200
    owner_token = login_res.json()["access_token"]
    owner_headers = {"Authorization": f"Bearer {owner_token}"}
    print("✓ Owner authenticated successfully")

    # 2. Check initial price of Irani Chai
    initial_res = requests.get(f"{BASE_URL}/api/menu/1")
    assert initial_res.status_code == 200
    initial_price = initial_res.json()["price_paise"]
    print(f"  • Current price of Item 1 (Irani Chai): ₹{initial_price/100:.2f} ({initial_price} paise)")

    # 3. Update price as Owner to ₹25.00 (2500 paise)
    new_price = 2500
    print(f"  • Owner updating price to ₹{new_price/100:.2f} (2500 paise)...")
    price_res = requests.patch(
        f"{BASE_URL}/api/menu/1/price",
        json={"price_paise": new_price},
        headers=owner_headers,
    )
    assert price_res.status_code == 200
    print(f"✓ Price updated on backend: ₹{price_res.json()['price_paise']/100:.2f}")

    # 4. Verify Customer Menu endpoint returns updated price
    customer_menu_res = requests.get(f"{BASE_URL}/api/menu/1")
    assert customer_menu_res.status_code == 200
    assert customer_menu_res.json()["price_paise"] == 2500
    print(f"✓ Customer Menu endpoint reflects new price immediately: ₹{customer_menu_res.json()['price_paise']/100:.2f}")

    # 5. Verify Table T1 QR code endpoint
    qr_res = requests.get(f"{BASE_URL}/api/tables/1/qr")
    assert qr_res.status_code == 200
    assert qr_res.headers.get("content-type") == "image/png"
    assert len(qr_res.content) > 500
    print(f"✓ Table T1 QR Code PNG generated successfully ({len(qr_res.content)} bytes, Content-Type: image/png)")

    print("\n" + "=" * 70)
    print("🎉 ALL OPERATIONAL TESTS PASSED!")
    print("=" * 70 + "\n")

if __name__ == "__main__":
    test_admin_ops()
