import sys
import io
import json
import requests

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

BASE_URL = "http://127.0.0.1:8000"


def run_tests():
    print("\n" + "=" * 75)
    print("🧪 TESTING CATEGORIES, MENU, TABLES, QR GENERATOR & AUDIT LOGS")
    print("=" * 75)

    # 1. Login as Owner & Staff
    print("\n[STEP 1] Authenticating Owner and Staff accounts...")
    owner_res = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "owner@teatime.com", "password": "admin123"},
    )
    assert owner_res.status_code == 200
    owner_token = owner_res.json()["access_token"]
    owner_headers = {"Authorization": f"Bearer {owner_token}"}

    staff_res = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "staff@teatime.com", "password": "staff123"},
    )
    assert staff_res.status_code == 200
    staff_token = staff_res.json()["access_token"]
    staff_headers = {"Authorization": f"Bearer {staff_token}"}
    print("✓ Got tokens for Owner and Staff")

    # 2. List Categories & Menu Items
    print("\n[STEP 2] Fetching initial categories and menu items...")
    cats_res = requests.get(f"{BASE_URL}/api/categories")
    assert cats_res.status_code == 200
    cats = cats_res.json()
    print(f"✓ Found {len(cats)} categories (e.g. {cats[0]['name']})")

    menu_res = requests.get(f"{BASE_URL}/api/menu")
    assert menu_res.status_code == 200
    items = menu_res.json()
    print(f"✓ Found {len(items)} initial menu items")

    # 3. Create a New Menu Item (Owner only)
    print("\n[STEP 3] Creating new Menu Item 'Mysore Bonda (4 pcs)' as Owner...")
    new_item_payload = {
        "category_id": cats[2]["id"],  # Savory snacks
        "name": "Mysore Bonda (4 pcs)",
        "name_te": "మైసూర్ బోండా (4 నెం)",
        "description": "Crispy golden fried savory dumplings served with spicy coconut and ginger chutney.",
        "description_te": "కొబ్బరి చట్నీ మరియు అల్లం పచ్చడితో వడ్డించే వేడి మైసూర్ బోండాలు.",
        "price_paise": 3000,  # ₹30.00
        "is_veg": True,
        "is_available": True,
        "track_stock": True,
        "stock_qty": 60,
        "low_stock_threshold": 10,
        "is_special": True,
    }
    create_res = requests.post(
        f"{BASE_URL}/api/menu",
        json=new_item_payload,
        headers=owner_headers,
    )
    assert create_res.status_code == 201, f"Create item failed: {create_res.text}"
    created_item = create_res.json()
    item_id = created_item["id"]
    print(f"✓ Created item ID {item_id}: {created_item['name']} @ ₹{created_item['price_paise']/100:.2f}")

    # 4. Update Price as Owner
    print(f"\n[STEP 4] Updating price of item {item_id} to ₹35 (3500 paise) as Owner...")
    price_res = requests.patch(
        f"{BASE_URL}/api/menu/{item_id}/price",
        json={"price_paise": 3500},
        headers=owner_headers,
    )
    assert price_res.status_code == 200, f"Price update failed: {price_res.text}"
    updated_item = price_res.json()
    assert updated_item["price_paise"] == 3500
    print(f"✓ Successfully updated price to ₹{updated_item['price_paise']/100:.2f}")

    # 5. Staff attempts to change price (Must be 403 Forbidden)
    print("\n[STEP 5] Testing RBAC: Staff attempts price change (Expect 403 Forbidden)...")
    staff_price_res = requests.patch(
        f"{BASE_URL}/api/menu/{item_id}/price",
        json={"price_paise": 2000},
        headers=staff_headers,
    )
    assert staff_price_res.status_code == 403, f"Expected 403, got {staff_price_res.status_code}"
    print(f"✓ RBAC Success (HTTP 403): Staff price change blocked ({staff_price_res.json()['detail']})")

    # 6. Staff toggles availability (Must succeed)
    print(f"\n[STEP 6] Staff toggles availability for item {item_id} to False...")
    avail_res = requests.patch(
        f"{BASE_URL}/api/menu/{item_id}/availability",
        json={"is_available": False},
        headers=staff_headers,
    )
    assert avail_res.status_code == 200
    assert avail_res.json()["is_available"] is False
    print("✓ Staff successfully updated item availability to Out of Stock (False)")

    # 7. Test Image Upload
    print("\n[STEP 7] Uploading dummy menu photo to /api/menu/upload-image...")
    # Create a tiny PNG in memory
    dummy_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    upload_res = requests.post(
        f"{BASE_URL}/api/menu/upload-image",
        files={"file": ("bonda.png", dummy_png, "image/png")},
        headers=staff_headers,
    )
    assert upload_res.status_code == 200, f"Upload failed: {upload_res.text}"
    img_data = upload_res.json()
    print(f"✓ Uploaded image stored at: {img_data['url']}")

    # 8. Tables and QR Code Generation
    print("\n[STEP 8] Listing tables and generating QR code for Table T1 (ID 1)...")
    tables_res = requests.get(f"{BASE_URL}/api/tables")
    assert tables_res.status_code == 200
    tables = tables_res.json()
    print(f"✓ Tables count: {len(tables)} (T1–T{len(tables)})")

    qr_res = requests.get(f"{BASE_URL}/api/tables/1/qr")
    assert qr_res.status_code == 200, f"QR generation failed: {qr_res.text}"
    assert qr_res.headers.get("content-type") == "image/png"
    assert qr_res.content[:4] == b"\x89PNG", "Response content must be valid PNG"
    print(f"✓ Generated QR PNG for Table T1 ({len(qr_res.content)} bytes, Target: {qr_res.headers.get('X-Target-Url')})")

    # 9. Verify Audit Logs
    print("\n[STEP 9] Querying /api/audit to confirm audit log ledger entries...")
    audit_res = requests.get(f"{BASE_URL}/api/audit", headers=owner_headers)
    assert audit_res.status_code == 200, f"Audit query failed: {audit_res.text}"
    audit_logs = audit_res.json()
    assert len(audit_logs) >= 3, f"Expected at least 3 audit logs, found {len(audit_logs)}"

    print(f"✓ Found {len(audit_logs)} audit log records. Recent entries:")
    for log in audit_logs[:4]:
        details = json.loads(log["details_json"]) if log.get("details_json") else {}
        print(f"  • [{log['created_at'][:19]}] Action: {log['action']:<20s} | Entity: {log['entity_type']:<10s} #{log['entity_id']} | Details: {details}")

    print("\n" + "=" * 75)
    print("🎉 ALL CATEGORY, MENU, TABLE, QR & AUDIT LOG TESTS PASSED!")
    print("=" * 75 + "\n")


if __name__ == "__main__":
    run_tests()
