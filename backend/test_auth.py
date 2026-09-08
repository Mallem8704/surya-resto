import sys
import requests
import json

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

BASE_URL = "http://127.0.0.1:8000"


def test_auth():
    print("\n" + "=" * 70)
    print("🧪 TESTING AUTHENTICATION & RBAC ENDPOINTS")
    print("=" * 70)

    # 1. Test Owner Login
    print("\n[TEST 1] Owner Login (owner@teatime.com / admin123)...")
    resp = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "owner@teatime.com", "password": "admin123"},
    )
    assert resp.status_code == 200, f"Owner login failed: {resp.text}"
    owner_data = resp.json()
    owner_token = owner_data["access_token"]
    assert owner_data["role"] == "owner", "Role must be owner"
    assert owner_data["outlet_id"] == 1, "Outlet ID must be 1"
    print(f"✓ Success (HTTP 200): Got JWT token (Role: {owner_data['role']}, User: {owner_data['name']})")

    # 2. Test Staff Login
    print("\n[TEST 2] Staff Login (staff@teatime.com / staff123)...")
    resp = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "staff@teatime.com", "password": "staff123"},
    )
    assert resp.status_code == 200, f"Staff login failed: {resp.text}"
    staff_data = resp.json()
    staff_token = staff_data["access_token"]
    assert staff_data["role"] == "staff", "Role must be staff"
    print(f"✓ Success (HTTP 200): Got JWT token (Role: {staff_data['role']}, User: {staff_data['name']})")

    # 3. Test Invalid Password Login
    print("\n[TEST 3] Invalid Password (owner@teatime.com / wrongpassword)...")
    resp = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "owner@teatime.com", "password": "wrongpassword"},
    )
    assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
    print(f"✓ Success (HTTP 401): Correctly rejected bad credentials ({resp.json()['detail']})")

    # 4. Test GET /me with Owner Token
    print("\n[TEST 4] GET /api/auth/me using Owner Token...")
    resp = requests.get(
        f"{BASE_URL}/api/auth/me",
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert resp.status_code == 200, f"GET /me failed: {resp.text}"
    me = resp.json()
    print(f"✓ Success (HTTP 200): Verified profile for {me['name']} (Email: {me['email']}, Role: {me['role']})")

    # 5. Test Owner-only endpoint with Owner Token
    print("\n[TEST 5] Accessing Owner-only endpoint with Owner Token...")
    resp = requests.get(
        f"{BASE_URL}/api/auth/owner-check",
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert resp.status_code == 200, f"Owner check failed: {resp.text}"
    print(f"✓ Success (HTTP 200): Owner authorized -> {resp.json()['message']}")

    # 6. Test Owner-only endpoint with Staff Token (Expect 403 Forbidden)
    print("\n[TEST 6] Accessing Owner-only endpoint with Staff Token (RBAC check)...")
    resp = requests.get(
        f"{BASE_URL}/api/auth/owner-check",
        headers={"Authorization": f"Bearer {staff_token}"},
    )
    assert resp.status_code == 403, f"Expected 403 Forbidden, got {resp.status_code}"
    print(f"✓ Success (HTTP 403): Staff correctly forbidden from owner-only route ({resp.json()['detail']})")

    # 7. Test unauthenticated request
    print("\n[TEST 7] Accessing protected endpoint without token...")
    resp = requests.get(f"{BASE_URL}/api/auth/me")
    assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
    print(f"✓ Success (HTTP 401): Request without token rejected ({resp.json()['detail']})")

    print("\n" + "=" * 70)
    print("🎉 ALL 7 AUTHENTICATION & RBAC TESTS PASSED SUCCESSFULLY!")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    test_auth()
