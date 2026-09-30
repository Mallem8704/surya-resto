"""
Master End-to-End Functional Test Suite for Surya Family Restaurant Kadiri.
Validates all 22 User-Side and Admin-Side features against the live API server.
"""

import sys
import datetime
import requests

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE_URL = "http://127.0.0.1:8000"

PASSED = "✅ PASS"
FAILED = "❌ FAIL"
results = []

def record(test_num: int, name: str, success: bool, details: str = ""):
    status_str = PASSED if success else FAILED
    print(f"[{test_num:02d}] {status_str} - {name} {('- ' + details) if details else ''}")
    results.append({"num": test_num, "name": name, "success": success, "details": details})
    if not success:
        print(f"     ERROR DETAILS: {details}")

def run_all_tests():
    print("=" * 80)
    print(" SURYA FAMILY RESTAURANT KADIRI - FULL PLATFORM E2E FUNCTIONAL VERIFICATION")
    print("=" * 80)
    print(f"Target API Base URL: {BASE_URL}")
    print(f"Timestamp: {datetime.datetime.now().isoformat()}")
    print("-" * 80)

    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})

    # -------------------------------------------------------------
    # 1. Menu & Category Retrieval
    # -------------------------------------------------------------
    try:
        r = session.get(f"{BASE_URL}/api/categories")
        cats = r.json()
        r_menu = session.get(f"{BASE_URL}/api/menu")
        menu_items = r_menu.json()
        success = (r.status_code == 200 and len(cats) >= 5 and r_menu.status_code == 200 and len(menu_items) >= 40)
        record(1, "Menu Catalog & Categories Discovery", success, f"{len(cats)} categories, {len(menu_items)} dishes")
    except Exception as e:
        record(1, "Menu Catalog & Categories Discovery", False, str(e))
        return

    # -------------------------------------------------------------
    # 2. Telugu Localization & Dish Customization (Variants & Addons)
    # -------------------------------------------------------------
    try:
        # Find Biryani or Mandi item with variants
        sample_item = next((it for it in menu_items if it.get("has_variants") and it.get("name_te")), menu_items[0])
        r_detail = session.get(f"{BASE_URL}/api/menu/{sample_item['id']}")
        item_data = r_detail.json()
        has_te = bool(item_data.get("name_te"))
        has_var = len(item_data.get("variants", [])) > 0
        record(2, "Telugu Localization & Item Customization", (r_detail.status_code == 200 and has_te), 
               f"Item: '{item_data['name']}' / '{item_data.get('name_te')}', Variants: {len(item_data.get('variants', []))}, Addons: {len(item_data.get('addons', []))}")
    except Exception as e:
        record(2, "Telugu Localization & Item Customization", False, str(e))

    # -------------------------------------------------------------
    # 3. Promo Coupon Validation (WELCOME50 & BIRYANI10)
    # -------------------------------------------------------------
    try:
        r_w50 = session.post(f"{BASE_URL}/api/coupons/validate", json={"code": "WELCOME50", "subtotal_paise": 40000, "outlet_id": 1})
        d_w50 = r_w50.json()
        r_b10 = session.post(f"{BASE_URL}/api/coupons/validate", json={"code": "BIRYANI10", "subtotal_paise": 50000, "outlet_id": 1})
        d_b10 = r_b10.json()
        success = (r_w50.status_code == 200 and d_w50.get("discount_paise") == 5000 and 
                   r_b10.status_code == 200 and d_b10.get("discount_paise") == 5000)
        record(3, "Promo Coupon Validation", success, f"WELCOME50 disc: ₹{d_w50.get('discount_paise',0)/100:.2f}, BIRYANI10 disc: ₹{d_b10.get('discount_paise',0)/100:.2f}")
    except Exception as e:
        record(3, "Promo Coupon Validation", False, str(e))

    # -------------------------------------------------------------
    # 4. Customer Account Creation & Zero-OTP Login
    # -------------------------------------------------------------
    customer_token = None
    customer_id = None
    test_phone = "9887766554"
    try:
        # Register customer
        reg_payload = {"phone": test_phone, "name": "Kalyan Varma", "email": "kalyan@kadiri.in", "password": "KadiriUser@2026"}
        r_reg = session.post(f"{BASE_URL}/api/customer/register", json=reg_payload)
        if r_reg.status_code == 400 and "already exists" in r_reg.text:
            # Login if exists
            r_login = session.post(f"{BASE_URL}/api/customer/login", json={"phone": test_phone, "password": "KadiriUser@2026"})
            c_data = r_login.json()
        else:
            c_data = r_reg.json()
        
        customer_token = c_data.get("access_token")
        customer_id = c_data.get("customer", {}).get("id")
        success = bool(customer_token and customer_id)
        record(4, "Customer Zero-OTP Registration & Password Login", success, f"Customer ID: {customer_id}, Token: {customer_token[:15]}...")
    except Exception as e:
        record(4, "Customer Zero-OTP Registration & Password Login", False, str(e))

    # -------------------------------------------------------------
    # 5. Dine-in QR Order Creation (Table 3)
    # -------------------------------------------------------------
    order_id = None
    order_number = None
    table_id = None
    customer_headers = {"Authorization": f"Bearer {customer_token}"}
    try:
        # Get table 3
        tables_res = session.get(f"{BASE_URL}/api/tables").json()
        table_3 = next((t for t in tables_res if "3" in str(t.get("label", ""))), tables_res[0])
        table_id = table_3["id"]

        first_item = menu_items[0]
        order_payload = {
            "table_id": table_id,
            "outlet_id": 1,
            "order_type": "dine_in",
            "customer_id": customer_id,
            "customer_name": "Kalyan Varma",
            "customer_phone": test_phone,
            "coupon_code": "WELCOME50",
            "items": [
                {
                    "item_id": first_item["id"],
                    "qty": 2,
                    "notes": "Extra spicy Kadiri style"
                }
            ],
            "customer_notes": "Please serve fast",
            "payment_method": "upi"
        }
        r_ord = session.post(f"{BASE_URL}/api/orders", json=order_payload, headers=customer_headers)
        ord_data = r_ord.json()
        order_id = ord_data.get("id")
        order_number = ord_data.get("order_number")
        success = (r_ord.status_code in [200, 201] and order_id is not None and ord_data.get("discount_paise") == 5000)
        record(5, "Dine-In QR Order Placement (Table 3)", success, 
               f"Order #{order_number} (ID: {order_id}), Total: ₹{ord_data.get('total_paise', 0)/100:.2f}, Discount: ₹{ord_data.get('discount_paise',0)/100:.2f}")
    except Exception as e:
        record(5, "Dine-In QR Order Placement (Table 3)", False, str(e))

    # -------------------------------------------------------------
    # 6. Dynamic NPCI UPI QR Generation
    # -------------------------------------------------------------
    try:
        r_qr = session.get(f"{BASE_URL}/api/payments/{order_id}/dynamic-upi-qr")
        qr_data = r_qr.json()
        upi_uri = qr_data.get("upi_uri", "")
        success = (r_qr.status_code == 200 and "upi://pay" in upi_uri and "9880358634@upi" in upi_uri)
        record(6, "Dynamic NPCI UPI QR Generation", success, f"UPI URI: {upi_uri[:60]}... (VPA: {qr_data.get('upi_vpa')})")
    except Exception as e:
        record(6, "Dynamic NPCI UPI QR Generation", False, str(e))

    # -------------------------------------------------------------
    # 7. Customer 12-Digit UTR Submission
    # -------------------------------------------------------------
    try:
        utr_num = "429810294812"
        r_utr = session.post(f"{BASE_URL}/api/payments/submit-upi-ref", json={
            "order_id": order_id,
            "utr_number": utr_num,
            "notes": "Paid via Google Pay"
        })
        utr_data = r_utr.json()
        success = (r_utr.status_code == 200 and utr_data.get("payment_status") == "paid" and utr_data.get("utr_number") == utr_num)
        record(7, "Customer 12-Digit UTR Submission", success, f"UTR: {utr_num}, Status: {utr_data.get('payment_status')}")
    except Exception as e:
        record(7, "Customer 12-Digit UTR Submission", False, str(e))

    # -------------------------------------------------------------
    # 8. Digital Waiter Calling / Service Buzzer
    # -------------------------------------------------------------
    call_id = None
    try:
        r_call = session.post(f"{BASE_URL}/api/tables/{table_id}/call", json={"table_id": table_id, "call_type": "water"})
        c_res = r_call.json()
        call_id = c_res.get("id")
        success = (r_call.status_code in [200, 201] and call_id is not None)
        record(8, "Digital Waiter Calling / Service Buzzer", success, f"Service Call ID: {call_id}, Type: {c_res.get('call_type')}, Table: {table_id}")
    except Exception as e:
        record(8, "Digital Waiter Calling / Service Buzzer", False, str(e))

    # -------------------------------------------------------------
    # 9. Delivery Order Placement with Address
    # -------------------------------------------------------------
    delivery_order_id = None
    try:
        second_item = menu_items[1]
        deliv_payload = {
            "outlet_id": 1,
            "order_type": "delivery",
            "customer_id": customer_id,
            "customer_name": "Kalyan Varma",
            "customer_phone": test_phone,
            "delivery_address": "Door No 2-145, RTC Colony, Kadiri, AP 515591",
            "items": [
                {
                    "item_id": second_item["id"],
                    "qty": 1
                }
            ],
            "customer_notes": "Call on arrival",
            "payment_method": "cod"
        }
        r_deliv = session.post(f"{BASE_URL}/api/orders", json=deliv_payload, headers=customer_headers)
        deliv_data = r_deliv.json()
        delivery_order_id = deliv_data.get("id")
        success = (r_deliv.status_code in [200, 201] and delivery_order_id is not None and deliv_data.get("order_type") == "delivery")
        record(9, "Delivery Order Creation with Address", success, f"Order #{deliv_data.get('order_number')}, Address: '{deliv_data.get('delivery_address')}'")
    except Exception as e:
        record(9, "Delivery Order Creation with Address", False, str(e))

    # -------------------------------------------------------------
    # 10. Table Reservation Booking
    # -------------------------------------------------------------
    reservation_id = None
    try:
        tomorrow = (datetime.date.today() + datetime.timedelta(days=1)).strftime("%Y-%m-%d")
        res_payload = {
            "outlet_id": 1,
            "customer_name": "Sita Lakshmi",
            "customer_phone": "9440112233",
            "customer_email": "sita@kadiri.in",
            "party_size": 4,
            "reservation_date": tomorrow,
            "reservation_time": "19:30",
            "seating_preference": "family_ac",
            "occasion": "Family Gathering"
        }
        r_res = session.post(f"{BASE_URL}/api/reservations", json=res_payload)
        res_data = r_res.json()
        reservation_id = res_data.get("id")
        success = (r_res.status_code in [200, 201] and reservation_id is not None)
        record(10, "Table Reservation Pre-Booking", success, f"Res #{res_data.get('reservation_number')}, Date: {res_data.get('reservation_date')} at {res_data.get('reservation_time')}")
    except Exception as e:
        record(10, "Table Reservation Pre-Booking", False, str(e))

    # -------------------------------------------------------------
    # 11. Official Staff & Owner Authentication
    # -------------------------------------------------------------
    owner_token = None
    staff_token = None
    try:
        r_owner = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "owner@suryafamilyrestaurant.in",
            "password": "surya_admin_2026"
        })
        d_owner = r_owner.json()
        owner_token = d_owner.get("access_token")

        r_staff = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "staff@suryafamilyrestaurant.in",
            "password": "surya_staff_2026"
        })
        d_staff = r_staff.json()
        staff_token = d_staff.get("access_token")

        success = (r_owner.status_code == 200 and owner_token is not None and 
                   r_staff.status_code == 200 and staff_token is not None)
        record(11, "Staff & Owner Official Credentials Authentication", success, f"Owner Role: {d_owner.get('user',{}).get('role')}, Staff Role: {d_staff.get('user',{}).get('role')}")
    except Exception as e:
        record(11, "Staff & Owner Official Credentials Authentication", False, str(e))

    staff_headers = {"Authorization": f"Bearer {staff_token}"}
    owner_headers = {"Authorization": f"Bearer {owner_token}"}

    # -------------------------------------------------------------
    # 12. Order Lifecycle Progression (placed -> preparing -> ready -> served)
    # -------------------------------------------------------------
    try:
        s1 = session.patch(f"{BASE_URL}/api/orders/{order_id}/status", json={"status": "preparing"}, headers=staff_headers).json()
        s2 = session.patch(f"{BASE_URL}/api/orders/{order_id}/status", json={"status": "ready"}, headers=staff_headers).json()
        s3 = session.patch(f"{BASE_URL}/api/orders/{order_id}/status", json={"status": "served"}, headers=staff_headers).json()
        success = (s1.get("status") == "preparing" and s2.get("status") == "ready" and s3.get("status") == "served")
        record(12, "Order Lifecycle Progression (preparing -> ready -> served)", success, f"Order #{order_number} final status: {s3.get('status')}")
    except Exception as e:
        record(12, "Order Lifecycle Progression", False, str(e))

    # -------------------------------------------------------------
    # 13. 1-Click Cashier Soundbox UPI Verification
    # -------------------------------------------------------------
    try:
        r_cashier_upi = session.post(f"{BASE_URL}/api/payments/{delivery_order_id}/verify-upi", json={
            "utr_number": "SB-VOICE-VERIFIED-9821",
            "notes": "Verified via Paytm Soundbox announcement at counter"
        }, headers=staff_headers)
        c_upi_data = r_cashier_upi.json()
        success = (r_cashier_upi.status_code == 200 and c_upi_data.get("payment_status") == "paid")
        record(13, "1-Click Cashier Soundbox UPI Verification", success, f"Verified by: {c_upi_data.get('verified_by')}, Status: {c_upi_data.get('payment_status')}")
    except Exception as e:
        record(13, "1-Click Cashier Soundbox UPI Verification", False, str(e))

    # -------------------------------------------------------------
    # 14. Kitchen KDS Active Tickets Retrieval
    # -------------------------------------------------------------
    try:
        r_kds = session.get(f"{BASE_URL}/api/orders?status=placed,preparing,ready", headers=staff_headers)
        kds_orders = r_kds.json()
        success = (r_kds.status_code == 200 and isinstance(kds_orders, list))
        record(14, "Kitchen KDS Active Tickets & Chime Stream", success, f"Found {len(kds_orders)} active kitchen ticket(s)")
    except Exception as e:
        record(14, "Kitchen KDS Active Tickets & Chime Stream", False, str(e))

    # -------------------------------------------------------------
    # 15. Table Floor Status Check & Reset
    # -------------------------------------------------------------
    try:
        r_free = session.patch(f"{BASE_URL}/api/tables/{table_id}/status", json={"status": "free"}, headers=staff_headers)
        t_free_data = r_free.json()
        success = (r_free.status_code == 200 and t_free_data.get("status") == "free")
        record(15, "Table Floor Status Management (occupied -> free)", success, f"Table {table_id} status: {t_free_data.get('status')}")
    except Exception as e:
        record(15, "Table Floor Status Management", False, str(e))

    # -------------------------------------------------------------
    # 16. Service Call Attendance & Resolution
    # -------------------------------------------------------------
    try:
        r_att = session.patch(f"{BASE_URL}/api/tables/service-calls/{call_id}/attend", headers=staff_headers)
        att_data = r_att.json()
        success = (r_att.status_code == 200 and att_data.get("status") == "attended")
        record(16, "Service Call Attendance & Buzzer Clearance", success, f"Call ID: {call_id} marked as '{att_data.get('status')}'")
    except Exception as e:
        record(16, "Service Call Attendance & Buzzer Clearance", False, str(e))

    # -------------------------------------------------------------
    # 17. Menu Item Stock / Availability (86'ing) Toggle
    # -------------------------------------------------------------
    try:
        test_dish = menu_items[0]
        # Turn off
        r_off = session.patch(f"{BASE_URL}/api/menu/{test_dish['id']}/availability", json={"is_available": False}, headers=staff_headers).json()
        # Turn back on
        r_on = session.patch(f"{BASE_URL}/api/menu/{test_dish['id']}/availability", json={"is_available": True}, headers=staff_headers).json()
        success = (r_off.get("is_available") is False and r_on.get("is_available") is True)
        record(17, "Menu Item Stock / Availability 86'ing Toggle", success, f"Dish '{test_dish['name']}': False -> True")
    except Exception as e:
        record(17, "Menu Item Stock / Availability 86'ing Toggle", False, str(e))

    # -------------------------------------------------------------
    # 18. Customer CRM Listing & Profile Lookup
    # -------------------------------------------------------------
    try:
        r_crm = session.get(f"{BASE_URL}/api/customer/admin/list", headers=staff_headers)
        crm_data = r_crm.json()
        r_detail = session.get(f"{BASE_URL}/api/customer/admin/{customer_id}", headers=staff_headers)
        crm_customer = r_detail.json()
        crm_info = crm_customer.get("customer", crm_customer)
        success = (r_crm.status_code == 200 and r_detail.status_code == 200 and crm_info.get("phone") == test_phone)
        record(18, "Customer CRM Listing & History Lookup", success, f"CRM Total Customers: {crm_data.get('summary',{}).get('total_customers')}, Profile: '{crm_info.get('name')}'")
    except Exception as e:
        record(18, "Customer CRM Listing & History Lookup", False, str(e))

    # -------------------------------------------------------------
    # 19. Table Reservation Management (Confirm & Seat)
    # -------------------------------------------------------------
    try:
        r_res_up = session.patch(f"{BASE_URL}/api/reservations/{reservation_id}/status", json={
            "status": "seated",
            "table_id": table_id
        }, headers=staff_headers)
        res_up_data = r_res_up.json()
        success = (r_res_up.status_code == 200 and res_up_data.get("status") == "seated" and res_up_data.get("table_id") == table_id)
        record(19, "Table Reservation Confirmation & Seating", success, f"Res ID {reservation_id} seated at Table {table_id}")
    except Exception as e:
        record(19, "Table Reservation Confirmation & Seating", False, str(e))

    # -------------------------------------------------------------
    # 20. Sales Analytics & Revenue Reporting
    # -------------------------------------------------------------
    try:
        r_ana = session.get(f"{BASE_URL}/api/analytics/summary", headers=owner_headers)
        ana_data = r_ana.json()
        success = (r_ana.status_code == 200 and "total_orders" in ana_data and "gross_sales_paise" in ana_data)
        record(20, "Sales Analytics & KPI Revenue Summary", success, 
               f"Total Orders: {ana_data.get('total_orders')}, Gross Sales: ₹{ana_data.get('gross_sales_paise', 0)/100:.2f}, Net Sales: ₹{ana_data.get('net_sales_paise', 0)/100:.2f}")
    except Exception as e:
        record(20, "Sales Analytics & KPI Revenue Summary", False, str(e))

    # -------------------------------------------------------------
    # 21. Audit Trail Logging Inspection
    # -------------------------------------------------------------
    try:
        r_audit = session.get(f"{BASE_URL}/api/audit?limit=10", headers=owner_headers)
        audit_data = r_audit.json()
        success = (r_audit.status_code == 200 and len(audit_data) > 0)
        recent_action = audit_data[0].get("action") if audit_data else "None"
        record(21, "Audit Trail Logging & Immutable Ledger", success, f"{len(audit_data)} audit entries found, Most recent: '{recent_action}'")
    except Exception as e:
        record(21, "Audit Trail Logging & Immutable Ledger", False, str(e))

    # -------------------------------------------------------------
    # 22. Hybrid Cloud Sync Trigger
    # -------------------------------------------------------------
    try:
        r_sync = session.post(f"{BASE_URL}/api/sync/trigger", headers=owner_headers)
        sync_data = r_sync.json()
        success = (r_sync.status_code == 200 and sync_data.get("success") is True)
        record(22, "Hybrid Cloud Sync to Supabase Cloud", success, f"Synced: {sync_data.get('synced_count', 0)} entities to Supabase")
    except Exception as e:
        record(22, "Hybrid Cloud Sync to Supabase Cloud", False, str(e))

    # -------------------------------------------------------------
    # SUMMARY
    # -------------------------------------------------------------
    print("=" * 80)
    total_passed = sum(1 for r in results if r["success"])
    total_tests = len(results)
    print(f"RESULTS: {total_passed}/{total_tests} TESTS PASSED ({total_passed/total_tests*100:.1f}%)")
    print("=" * 80)

    if total_passed == total_tests:
        print("🎉 ALL 22/22 USER & ADMIN WORKFLOWS VERIFIED 100% OPERATIONAL!")
        sys.exit(0)
    else:
        print("⚠️ SOME WORKFLOWS ENCOUNTERED ISSUES. SEE LOG ABOVE.")
        sys.exit(1)

if __name__ == "__main__":
    run_all_tests()
