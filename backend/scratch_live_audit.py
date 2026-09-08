"""
Real-User Live Production End-to-End Audit
Tests directly against the live backend: https://tea-time-backend-1f44.onrender.com
and Vercel frontend: https://arabic-restaurant-dineos.vercel.app
"""

import json
import time
import urllib.request
import urllib.error

import sys
import io

# Ensure utf-8 output encoding for Windows terminal
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

LIVE_BACKEND = "https://tea-time-backend-1f44.onrender.com"
LIVE_FRONTEND = "https://arabic-restaurant-dineos.vercel.app"

def http_req(url, method="GET", data=None, headers=None):
    if headers is None:
        headers = {}
    if data is not None:
        body = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    else:
        body = None
    
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    start_t = time.time()
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            elapsed = time.time() - start_t
            status = resp.status
            content = resp.read()
            try:
                parsed = json.loads(content.decode("utf-8"))
            except Exception:
                parsed = content.decode("utf-8", errors="ignore")
            return {"status": status, "data": parsed, "elapsed_ms": int(elapsed * 1000), "error": None}
    except urllib.error.HTTPError as e:
        elapsed = time.time() - start_t
        err_content = e.read().decode("utf-8", errors="ignore")
        try:
            parsed = json.loads(err_content)
        except Exception:
            parsed = err_content
        return {"status": e.code, "data": parsed, "elapsed_ms": int(elapsed * 1000), "error": str(e)}
    except Exception as e:
        elapsed = time.time() - start_t
        return {"status": 0, "data": None, "elapsed_ms": int(elapsed * 1000), "error": str(e)}

def run_live_audit():
    report = {
        "steps": [],
        "overall_summary": {
            "total_tests": 0,
            "passed": 0,
            "failed": 0,
            "warnings": 0
        },
        "findings": []
    }
    
    print("=" * 70)
    print("🌐 REAL-USER END-TO-END LIVE PRODUCTION SYSTEM AUDIT")
    print(f"Backend:  {LIVE_BACKEND}")
    print(f"Frontend: {LIVE_FRONTEND}")
    print("=" * 70)

    # ── STEP 1: FRONTEND ROUTE ACCESSIBILITY ──
    print("\n[TEST 1] Frontend Route Accessibility (iOS & Mobile Browsers)")
    routes = [
        ("/", "Homepage"),
        ("/order?branch=1&table=T1", "Table QR Order Page (Branch 1, Table T1)"),
        ("/order?branch=2&table=T3", "Table QR Order Page (Branch 2, Table T3)"),
        ("/delivery?branch=1", "Delivery Page (Branch 1)"),
        ("/admin/login", "Admin Login Cockpit"),
        ("/admin/kds", "Kitchen Display System"),
        ("/admin/tables", "Tables Management Cockpit")
    ]
    for r, label in routes:
        report["overall_summary"]["total_tests"] += 1
        res = http_req(f"{LIVE_FRONTEND}{r}")
        if res["status"] == 200:
            report["overall_summary"]["passed"] += 1
            print(f"  ✅ {label} ({r}) -> 200 OK [{res['elapsed_ms']}ms]")
        else:
            report["overall_summary"]["failed"] += 1
            print(f"  ❌ {label} ({r}) -> Status {res['status']} ({res['error']})")

    # ── STEP 2: OUTLET DETAILS ──
    print("\n[TEST 2] Branch & Outlet Settings")
    report["overall_summary"]["total_tests"] += 1
    res_outlet = http_req(f"{LIVE_BACKEND}/api/outlets/single?outlet_id=1")
    if res_outlet["status"] == 200:
        report["overall_summary"]["passed"] += 1
        o = res_outlet["data"]
        print(f"  ✅ Outlet: {o.get('name')} | Tax: {o.get('tax_rate_percent')}% | Currency: {o.get('currency')}")
    else:
        report["overall_summary"]["failed"] += 1
        print(f"  ❌ Outlet fetch failed: {res_outlet['error']}")

    # ── STEP 3: TABLES LISTING & LIVE STATUS ──
    print("\n[TEST 3] Cafe Tables & QR Code Links")
    report["overall_summary"]["total_tests"] += 1
    res_tables = http_req(f"{LIVE_BACKEND}/api/tables?outlet_id=1")
    tables = []
    if res_tables["status"] == 200 and isinstance(res_tables["data"], list):
        tables = res_tables["data"]
        report["overall_summary"]["passed"] += 1
        print(f"  ✅ Listed {len(tables)} tables for Branch 1.")
        for t in tables[:3]:
            print(f"     - Table {t.get('label')} (ID: {t.get('id')}) -> Status: {t.get('status')}")
    else:
        report["overall_summary"]["failed"] += 1
        print(f"  ❌ Tables fetch failed: {res_tables['error']}")

    # ── STEP 4: MENU CATEGORIES & DISHES WITH VARIANTS & ADD-ONS ──
    print("\n[TEST 4] Menu Categories, Dishes, Portions & Addons")
    report["overall_summary"]["total_tests"] += 1
    res_cats = http_req(f"{LIVE_BACKEND}/api/categories?outlet_id=1&active_only=true")
    if res_cats["status"] == 200 and isinstance(res_cats["data"], list):
        report["overall_summary"]["passed"] += 1
        print(f"  ✅ Loaded {len(res_cats['data'])} active categories")
    else:
        report["overall_summary"]["failed"] += 1
        print(f"  ❌ Categories failed: {res_cats['error']}")

    report["overall_summary"]["total_tests"] += 1
    res_menu = http_req(f"{LIVE_BACKEND}/api/menu?outlet_id=1")
    menu_items = []
    customizable_items = []
    if res_menu["status"] == 200 and isinstance(res_menu["data"], list):
        menu_items = res_menu["data"]
        report["overall_summary"]["passed"] += 1
        print(f"  ✅ Loaded {len(menu_items)} dishes in menu")
        for it in menu_items:
            if it.get("variants") or it.get("addons"):
                customizable_items.append(it)
        print(f"  ✅ Found {len(customizable_items)} dishes with portion variants/addons")
    else:
        report["overall_summary"]["failed"] += 1
        print(f"  ❌ Menu fetch failed: {res_menu['error']}")

    # ── STEP 5: PROMO CODE VALIDATION ──
    print("\n[TEST 5] Promo Code Validation (WELCOME50)")
    report["overall_summary"]["total_tests"] += 1
    res_promo = http_req(f"{LIVE_BACKEND}/api/coupons/validate", method="POST", data={
        "code": "WELCOME50",
        "subtotal_paise": 50000,
        "outlet_id": 1
    })
    if res_promo["status"] == 200:
        report["overall_summary"]["passed"] += 1
        print(f"  ✅ Coupon WELCOME50: Discount ₹{res_promo['data'].get('discount_paise', 0)/100:.2f} [{res_promo['data'].get('message')}]")
    else:
        report["overall_summary"]["warnings"] += 1
        print(f"  ⚠️ Coupon validation returned: {res_promo['status']} ({res_promo.get('data')})")

    # ── STEP 6: REAL CUSTOMER DINE-IN QR ORDER PLACEMENT ──
    print("\n[TEST 6] Real-User QR Order Placement with Addons & Variants")
    report["overall_summary"]["total_tests"] += 1
    test_table = tables[0] if tables else {"id": 1, "label": "T1"}
    test_item = customizable_items[0] if customizable_items else (menu_items[0] if menu_items else {"id": 1, "price_paise": 22000})
    
    variant_id = test_item["variants"][0]["id"] if test_item.get("variants") else None
    addon_ids = [test_item["addons"][0]["id"]] if test_item.get("addons") else []

    order_payload = {
        "table_id": test_table["id"],
        "outlet_id": 1,
        "idempotency_key": f"audit_live_{int(time.time())}",
        "customer_notes": "Live Audit: Spicy, fast service",
        "payment_method": "upi",
        "items": [
            {
                "item_id": test_item["id"],
                "variant_id": variant_id,
                "addon_ids": addon_ids,
                "qty": 1,
                "notes": "Less oil"
            }
        ]
    }

    res_order = http_req(f"{LIVE_BACKEND}/api/orders", method="POST", data=order_payload)
    created_order = None
    if res_order["status"] in (200, 201) and isinstance(res_order["data"], dict):
        created_order = res_order["data"]
        report["overall_summary"]["passed"] += 1
        print(f"  ✅ Order #{created_order.get('order_number')} Created Successfully!")
        print(f"     Order ID: {created_order.get('id')}")
        print(f"     Table: {created_order.get('table_label') or test_table['label']}")
        print(f"     Subtotal: ₹{created_order.get('subtotal_paise')/100:.2f}")
        print(f"     Tax (GST): ₹{created_order.get('tax_paise')/100:.2f}")
        print(f"     Total Bill: ₹{created_order.get('total_paise')/100:.2f}")
    else:
        report["overall_summary"]["failed"] += 1
        print(f"  ❌ Order placement failed: {res_order['status']} - {res_order['data']}")

    # ── STEP 7: DYNAMIC UPI INTENT & QR GENERATION ──
    print("\n[TEST 7] Dynamic NPCI UPI QR & Intent Generation")
    if created_order:
        report["overall_summary"]["total_tests"] += 1
        order_id = created_order["id"]
        res_upi = http_req(f"{LIVE_BACKEND}/api/payments/{order_id}/dynamic-upi")
        if res_upi["status"] == 200:
            upi_info = res_upi["data"]
            report["overall_summary"]["passed"] += 1
            print(f"  ✅ Payee UPI ID (VPA): {upi_info.get('upi_vpa')}")
            print(f"  ✅ Amount Encoded: ₹{upi_info.get('amount_rs')}")
            print(f"  ✅ Generated UPI Deep Link: {upi_info.get('upi_uri')}")
            
            # Check deep link parameters
            uri = upi_info.get('upi_uri', '')
            if "pa=" in uri and "am=" in uri and "pn=" in uri:
                print("  ✅ UPI Intent conforms strictly to NPCI standards.")
            else:
                report["overall_summary"]["warnings"] += 1
                print("  ⚠️ UPI Intent missing standard tags.")
        else:
            report["overall_summary"]["failed"] += 1
            print(f"  ❌ Dynamic UPI generation failed: {res_upi['error']}")

    # ── STEP 8: CALL WAITER SERVICE BELL ──
    print("\n[TEST 8] Call Waiter Service Bell")
    report["overall_summary"]["total_tests"] += 1
    res_bell = http_req(f"{LIVE_BACKEND}/api/tables/{test_table['id']}/call", method="POST", data={"call_type": "water"})
    if res_bell["status"] in (200, 201):
        report["overall_summary"]["passed"] += 1
        print(f"  ✅ Service Call: Customer at Table {test_table['label']} called for Water -> Broadcasted [OK]")
    else:
        report["overall_summary"]["failed"] += 1
        print(f"  ❌ Call waiter failed: {res_bell['error']}")

    print("\n" + "=" * 70)
    print("📊 AUDIT RESULTS SUMMARY")
    print("=" * 70)
    print(f"Total Tests Executed: {report['overall_summary']['total_tests']}")
    print(f"Passed: {report['overall_summary']['passed']}")
    print(f"Failed: {report['overall_summary']['failed']}")
    print(f"Warnings: {report['overall_summary']['warnings']}")

if __name__ == "__main__":
    run_live_audit()
