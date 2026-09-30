"""
Payment & Webhook Verification Test Suite
Surya Family Restaurant Kadiri
Tests Dynamic NPCI UPI QR, Merchant UPI UTR submission, Cashier 1-click settlement, and safe webhook handling.
"""
import sys
import os
import hmac
import hashlib
import json
import uuid
import urllib.parse
from fastapi.testclient import TestClient

# Ensure UTF-8 stdout on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

from app.main import app
from app.database import SessionLocal
from app.models import Order, Payment, User, Outlet, CafeTable
from app.routers.payments import generate_dynamic_upi_qr, RAZORPAY_WEBHOOK_SECRET

client = TestClient(app)

def run_all_tests():
    print("=" * 80)
    print("💳 PAYMENTS & WEBHOOKS VERIFICATION SUITE - SURYA FAMILY RESTAURANT")
    print("=" * 80)

    # -------------------------------------------------------------
    # 1. Validate NPCI Dynamic UPI Intent URI
    # -------------------------------------------------------------
    print("\n[STEP 1] Validating NPCI Dynamic UPI Intent URI Format...")
    test_vpa = "9880358634@upi"
    test_name = "Surya Family Restaurant"
    test_amount = 550.00
    test_order_no = "ORD-2026-WEBHOOK-1"

    uri = generate_dynamic_upi_qr(
        upi_vpa=test_vpa,
        payee_name=test_name,
        amount_rupees=test_amount,
        order_number=test_order_no,
    )
    print(f"Generated NPCI UPI URI: {uri}")

    assert uri.startswith("upi://pay?"), "URI must begin with 'upi://pay?'"
    assert f"pa={test_vpa}" in uri, "Missing pa parameter"
    assert f"pn={urllib.parse.quote(test_name)}" in uri, "Missing or unencoded pn parameter"
    assert "am=550.00" in uri, "Missing formatted am parameter"
    assert "cu=INR" in uri, "Missing cu=INR parameter"
    assert f"tn={urllib.parse.quote(test_order_no)}" in uri, "Missing tn parameter"
    assert f"tr={urllib.parse.quote(test_order_no)}" in uri, "Missing tr parameter"
    print("✓ STEP 1 PASSED: NPCI Dynamic UPI Intent URI strictly complies with standards.")

    # -------------------------------------------------------------
    # 2. Database Setup: Create an Order
    # -------------------------------------------------------------
    print("\n[STEP 2] Creating test order in database...")
    db = SessionLocal()
    try:
        outlet = db.query(Outlet).first()
        assert outlet is not None, "At least one outlet must exist"
        
        table = db.query(CafeTable).filter(CafeTable.outlet_id == outlet.id).first()
        table_id = table.id if table else None

        order_no = f"ORD-WH-{uuid.uuid4().hex[:6].upper()}"
        order = Order(
            outlet_id=outlet.id,
            table_id=table_id,
            order_number=order_no,
            status="placed",
            order_type="dine_in",
            total_paise=32000,  # ₹320.00
            payment_status="pending",
            payment_method="upi",
        )
        db.add(order)
        db.commit()
        db.refresh(order)
        order_id = order.id
        print(f"✓ Created Order #{order.order_number} (ID: {order_id}, Total: ₹{order.total_paise/100:.2f})")
    finally:
        db.close()

    # -------------------------------------------------------------
    # 3. Dynamic UPI Endpoint for the Order
    # -------------------------------------------------------------
    print("\n[STEP 3] Fetching Dynamic UPI details via GET /api/payments/{order_id}/dynamic-upi...")
    qr_res = client.get(f"/api/payments/{order_id}/dynamic-upi")
    assert qr_res.status_code == 200, f"Dynamic UPI GET failed: {qr_res.text}"
    qr_json = qr_res.json()
    assert qr_json["order_number"] == order_no
    assert qr_json["amount_paise"] == 32000
    assert qr_json["amount_rs"] == 320.0
    assert "upi://pay?" in qr_json["upi_uri"]
    print(f"✓ Dynamic UPI URI fetched: {qr_json['upi_uri']}")
    print("✓ STEP 3 PASSED: Dynamic UPI QR endpoint validated.")

    # -------------------------------------------------------------
    # 4. Customer Direct Merchant UPI UTR Submission
    # -------------------------------------------------------------
    print("\n[STEP 4] Submitting 12-Digit UPI UTR via POST /api/payments/submit-upi-ref...")
    sample_utr = "426189998877"
    sub_res = client.post(
        "/api/payments/submit-upi-ref",
        json={"order_id": order_id, "utr_number": sample_utr, "notes": "Customer Paid via PhonePe"},
    )
    assert sub_res.status_code == 200, f"Submit UPI ref failed: {sub_res.text}"
    sub_data = sub_res.json()
    assert sub_data["success"] is True
    assert sub_data["payment_status"] == "paid"
    assert sub_data["payment_method"] == "upi"
    assert sub_data["utr_number"] == sample_utr
    print("✓ STEP 4 PASSED: Customer UPI submission verified and marked order as paid.")

    # -------------------------------------------------------------
    # 5. Synthetic Webhook Event Verification
    # -------------------------------------------------------------
    print("\n[STEP 5] Testing synthetic signed webhook call to /api/payments/razorpay-webhook...")
    payload = json.dumps({
        "event": "payment.captured",
        "order_number": order_no,
        "amount_paise": 32000,
        "notes": "Synthetic signed test event",
    })
    secret = RAZORPAY_WEBHOOK_SECRET or "sample_secret_key"
    signature = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()

    wh_res = client.post(
        "/api/payments/razorpay-webhook",
        content=payload,
        headers={
            "Content-Type": "application/json",
            "X-Razorpay-Signature": signature,
        },
    )
    assert wh_res.status_code == 200, f"Webhook failed: {wh_res.text}"
    wh_data = wh_res.json()
    assert wh_data.get("status") == "ok", f"Expected status 'ok', got {wh_data}"
    print(f"✓ Webhook Response: {wh_data}")

    # Root route alias test
    root_wh_res = client.post(
        "/razorpay-webhook",
        content=payload,
        headers={
            "Content-Type": "application/json",
            "X-Razorpay-Signature": signature,
        },
    )
    assert root_wh_res.status_code == 200
    assert root_wh_res.json().get("status") == "ok"
    print("✓ STEP 5 PASSED: Webhook endpoints acknowledged safely with status 'ok'.")

    # -------------------------------------------------------------
    # 6. Cashier 1-Click Settlement (Matching Soundbox)
    # -------------------------------------------------------------
    print("\n[STEP 6] Testing Cashier 1-Click Settlement via POST /api/payments/{order_id}/verify-upi...")
    db = SessionLocal()
    try:
        outlet = db.query(Outlet).first()
        outlet_id = outlet.id
        table = db.query(CafeTable).filter(CafeTable.outlet_id == outlet_id).first()
        table_id = table.id if table else None
        staff = db.query(User).filter(User.role == "staff").first()
        staff_email = staff.email if staff else "staff@surya.com"

        order_cashier_no = f"ORD-SETTLE-{uuid.uuid4().hex[:6].upper()}"
        order_cashier = Order(
            outlet_id=outlet_id,
            table_id=table_id,
            order_number=order_cashier_no,
            status="placed",
            order_type="dine_in",
            total_paise=15000,  # ₹150.00
            payment_status="pending",
            payment_method="upi",
        )
        db.add(order_cashier)
        db.commit()
        db.refresh(order_cashier)
        c_order_id = order_cashier.id
    finally:
        db.close()

    login_res = client.post("/api/auth/login", json={"email": staff_email, "password": "staff123"})
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"} if login_res.status_code == 200 else {}

    settle_res = client.post(
        f"/api/payments/{c_order_id}/verify-upi",
        headers=headers,
        json={"notes": "Soundbox confirmed payment: ₹150"},
    )
    assert settle_res.status_code == 200, f"Settle failed: {settle_res.text}"
    s_data = settle_res.json()
    assert s_data["success"] is True
    assert s_data["payment_status"] == "paid"
    print(f"✓ Cashier Settlement Response: {s_data}")
    print("✓ STEP 6 PASSED: Cashier 1-click settlement executed successfully.")

    print("\n" + "=" * 80)
    print("🎉 ALL PAYMENT & WEBHOOK VERIFICATION TESTS COMPLETED WITH 100% SUCCESS!")
    print("=" * 80)

if __name__ == "__main__":
    run_all_tests()
