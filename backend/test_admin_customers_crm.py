import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_customers_crm():
    print("==================================================")
    print("TESTING ADMIN CUSTOMERS CRM MODULE (END-TO-END)")
    print("==================================================")

    # 1. Verify Unauthenticated Protection
    print("\n[STEP 1] Testing RBAC Security...")
    unauth_resp = requests.get(f"{BASE_URL}/api/customer/admin/list")
    assert unauth_resp.status_code == 401, f"Expected 401 Unauthorized, got {unauth_resp.status_code}"
    print("[OK] Protected: 401 Unauthorized returned without staff token.")

    # 2. Login as Admin/Staff
    print("\n[STEP 2] Logging in as Admin...")
    login_resp = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "owner@suryarestaurant.com", "password": "admin123"}
    )
    if login_resp.status_code != 200:
        login_resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "owner@teatime.com", "password": "admin123"}
        )
    assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("[OK] Admin authenticated successfully.")

    # 3. Fetch Full Customers CRM List
    print("\n[STEP 3] Fetching Customer CRM List (GET /api/customer/admin/list)...")
    crm_resp = requests.get(f"{BASE_URL}/api/customer/admin/list", headers=headers)
    assert crm_resp.status_code == 200, f"CRM List failed: {crm_resp.text}"
    crm_data = crm_resp.json()

    summary = crm_data.get("summary", {})
    customers = crm_data.get("customers", [])

    print(f"[OK] Customers Summary: Total={summary.get('total_customers')}, VIP={summary.get('vip_count')}, "
          f"Returning={summary.get('returning_count')}, New={summary.get('new_count')}, "
          f"Revenue=Rs. {summary.get('total_revenue_paise', 0) / 100:.2f}")
    print(f"[OK] Retrieved {len(customers)} customer records.")

    # 4. Test Tier Filtering
    print("\n[STEP 4] Testing Tier Filtering...")
    vip_resp = requests.get(f"{BASE_URL}/api/customer/admin/list?tier=vip", headers=headers)
    assert vip_resp.status_code == 200
    vip_customers = vip_resp.json().get("customers", [])
    print(f"[OK] Tier 'vip' filter returned {len(vip_customers)} customers.")

    # 5. Test Search Filtering
    if customers:
        first_cust = customers[0]
        test_phone = first_cust["phone"]
        print(f"\n[STEP 5] Testing Search with phone: {test_phone}...")
        search_resp = requests.get(f"{BASE_URL}/api/customer/admin/list?search={test_phone}", headers=headers)
        assert search_resp.status_code == 200
        found = search_resp.json().get("customers", [])
        assert any(c["phone"] == test_phone for c in found), f"Expected to find customer with phone {test_phone}"
        print(f"[OK] Search found {len(found)} matching customer(s).")

        # 6. Test Single Customer In-Depth CRM View
        cust_id = first_cust["id"]
        print(f"\n[STEP 6] Testing Customer Details Drawer endpoint (GET /api/customer/admin/{cust_id})...")
        detail_resp = requests.get(f"{BASE_URL}/api/customer/admin/{cust_id}", headers=headers)
        assert detail_resp.status_code == 200, f"Detail failed: {detail_resp.text}"
        detail_data = detail_resp.json()
        assert "customer" in detail_data and "addresses" in detail_data and "orders" in detail_data
        print(f"[OK] Customer Detail loaded: Name='{detail_data['customer']['name']}', "
              f"Addresses={len(detail_data['addresses'])}, Past Orders={len(detail_data['orders'])}")

    print("\n==================================================")
    print("ALL ADMIN CUSTOMERS CRM TESTS PASSED (100% SUCCESS)")
    print("==================================================")

if __name__ == "__main__":
    test_customers_crm()
