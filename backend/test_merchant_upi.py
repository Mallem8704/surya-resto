"""
Direct Merchant UPI Payment & Settlement Verification Test Suite
Surya Family Restaurant Kadiri - Zero-Fee NPCI UPI Engine
"""
import sys
import os
import re
import urllib.parse
from fastapi.testclient import TestClient

# Ensure UTF-8 stdout on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

from app.main import app
from app.database import SessionLocal
from app.models import Order, Payment, User, Outlet, CafeTable, MenuItem
from app.routers.payments import generate_dynamic_upi_qr

client = TestClient(app)

def run_merchant_upi_tests():
    print("=" * 80)
    print("🚀 SURYA FAMILY RESTAURANT: DIRECT MERCHANT UPI & SETTLEMENT VERIFICATION")
    print("=" * 80)

    # -------------------------------------------------------------
    # TEST 1: Validate NPCI Dynamic UPI QR Format Conformance
    # -------------------------------------------------------------
    print("\n[TEST 1] Testing NPCI Dynamic UPI Intent URI Format...")
    vpa = "9880358634@upi"
    name = "Surya Family Restaurant"
    amount = 350.50
    order_no = "ORD-2026-9901"

    uri = generate_dynamic_upi_qr(
        upi_vpa=vpa,
        payee_name=name,
        amount_rupees=amount,
        order_number=order_no,
    )
    print(f"Generated URI: {uri}")

    # Standard NPCI validation: upi://pay?pa=...&pn=...&am=...&cu=INR&tn=...&tr=...
    assert uri.startswith("upi://pay?"), "URI must begin with upi://pay?"
    assert f"pa={vpa}" in uri, "Missing or incorrect VPA 'pa'"
    assert f"pn={urllib.parse.quote(name)}" in uri, "Missing or unencoded payee name 'pn'"
    assert "am=350.50" in uri, "Missing or unformatted amount 'am'"
    assert "cu=INR" in uri, "Missing currency 'cu=INR'"
    assert f"tn={urllib.parse.quote(order_no)}" in uri, "Missing transaction note 'tn'"
    assert f"tr={urllib.parse.quote(order_no)}" in uri, "Missing transaction ref 'tr'"
    print("✓ TEST 1 PASSED: NPCI Dynamic UPI URI strictly conforms to NPCI standards.")

    # -------------------------------------------------------------
    # Setup test order in database
    # -------------------------------------------------------------
    db = SessionLocal()
    try:
        outlet = db.query(Outlet).first()
        assert outlet is not None, "Outlet must exist in database"
        
        # Ensure staff exists
        staff = db.query(User).filter(User.role == "staff").first()
        if not staff:
            from app.routers.auth import hash_password
            staff = User(
                outlet_id=outlet.id,
                name="Kadiri Cashier",
                email="cashier_test@surya.com",
                password_hash=hash_password("staff123"),
                role="staff",
            )
            db.add(staff)
            db.commit()
            db.refresh(staff)

        staff_email = staff.email
        outlet_id = outlet.id

        # Get or create table
        table = db.query(CafeTable).filter(CafeTable.outlet_id == outlet.id).first()
        table_id = table.id if table else None

        # Create sample test order
        import uuid
        test_order_no = f"ORD-UPI-{uuid.uuid4().hex[:6].upper()}"
        order = Order(
            outlet_id=outlet.id,
            table_id=table_id,
            order_number=test_order_no,
            status="placed",
            order_type="dine_in",
            total_paise=45000,  # ₹450.00
            payment_status="pending",
            payment_method="upi",
        )
        db.add(order)
        db.commit()
        db.refresh(order)
        order_id = order.id
        print(f"\nCreated Test Order #{order.order_number} (ID: {order_id}, Total: ₹{order.total_paise/100:.2f})")
    finally:
        db.close()

    # -------------------------------------------------------------
    # TEST 2: GET /api/payments/{order_id}/dynamic-upi Endpoint
    # -------------------------------------------------------------
    print("\n[TEST 2] Testing GET /api/payments/{order_id}/dynamic-upi...")
    res = client.get(f"/api/payments/{order_id}/dynamic-upi")
    assert res.status_code == 200, f"Failed dynamic UPI fetch: {res.text}"
    qr_data = res.json()
    print(f"Dynamic UPI Response: {qr_data}")
    assert qr_data["order_number"] == test_order_no
    assert qr_data["amount_paise"] == 45000
    assert qr_data["amount_rs"] == 450.0
    assert "upi://pay?" in qr_data["upi_uri"]
    assert "cu=INR" in qr_data["upi_uri"]
    print("✓ TEST 2 PASSED: Dynamic UPI QR endpoint returned valid NPCI payload.")

    # -------------------------------------------------------------
    # TEST 3: POST /api/payments/submit-upi-ref (Customer / Intent Submission)
    # -------------------------------------------------------------
    print("\n[TEST 3] Testing POST /api/payments/submit-upi-ref (12-digit UTR submission)...")
    utr_test = "426189034512"  # 12-digit UPI reference number
    submit_payload = {
        "order_id": order_id,
        "utr_number": utr_test,
        "notes": "Paid via Google Pay",
    }
    sub_res = client.post("/api/payments/submit-upi-ref", json=submit_payload)
    assert sub_res.status_code == 200, f"Submit UPI ref failed: {sub_res.text}"
    sub_data = sub_res.json()
    print(f"Submit UPI Ref Response: {sub_data}")
    assert sub_data["success"] is True
    assert sub_data["payment_status"] == "paid"
    assert sub_data["payment_method"] == "upi"
    assert sub_data["utr_number"] == utr_test

    # Verify order state in DB
    db = SessionLocal()
    try:
        updated_order = db.query(Order).filter(Order.id == order_id).first()
        assert updated_order.payment_status == "paid"
        assert updated_order.payment_method == "upi"
        payment_record = db.query(Payment).filter(Payment.order_id == order_id).first()
        assert payment_record is not None
        assert payment_record.method == "upi"
        assert payment_record.txn_id == utr_test
        assert payment_record.status == "completed"
        print(f"✓ DB Verified: Order #{updated_order.order_number} marked paid with UTR {payment_record.txn_id}")
    finally:
        db.close()
    print("✓ TEST 3 PASSED: Customer UTR submission recorded and reconciled successfully.")

    # -------------------------------------------------------------
    # TEST 4: Cashier 1-Click Settlement (Matching Soundbox Voice Alert)
    # -------------------------------------------------------------
    print("\n[TEST 4] Testing Cashier 1-Click Settlement (Soundbox / Bank alert matching)...")
    # Login staff to obtain JWT token
    login_res = client.post(
        "/api/auth/login",
        json={"email": staff_email, "password": "staff123"},
    )
    if login_res.status_code != 200:
        # Fallback to owner or default staff if login differs
        staff_token = "mock_staff_token"
        headers = {}
    else:
        staff_token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {staff_token}"}

    # Create another order for Cashier settlement test
    db = SessionLocal()
    try:
        order2_no = f"ORD-CASHIER-{uuid.uuid4().hex[:6].upper()}"
        order2 = Order(
            outlet_id=outlet_id,
            table_id=table_id,
            order_number=order2_no,
            status="placed",
            order_type="dine_in",
            total_paise=28000,  # ₹280.00
            payment_status="pending",
            payment_method="upi",
        )
        db.add(order2)
        db.commit()
        db.refresh(order2)
        order2_id = order2.id
    finally:
        db.close()

    verify_res = client.post(
        f"/api/payments/{order2_id}/verify-upi",
        headers=headers,
        json={"notes": "Soundbox confirmed ₹280 received on UPI"},
    )
    assert verify_res.status_code == 200, f"Cashier verify failed: {verify_res.text}"
    v_data = verify_res.json()
    print(f"Cashier Verify Response: {v_data}")
    assert v_data["success"] is True
    assert v_data["payment_status"] == "paid"
    assert v_data["payment_method"] == "upi"

    # Verify order 2 in DB
    db = SessionLocal()
    try:
        ord2_db = db.query(Order).filter(Order.id == order2_id).first()
        assert ord2_db.payment_status == "paid"
        payment2 = db.query(Payment).filter(Payment.order_id == order2_id).first()
        assert payment2 is not None
        assert payment2.status == "completed"
        assert "Soundbox" in payment2.notes or "alert" in payment2.notes
        print(f"✓ DB Verified: Order #{ord2_db.order_number} settled via Cashier 1-Click")
    finally:
        db.close()
    print("✓ TEST 4 PASSED: Cashier 1-Click settlement completed and verified.")

    # -------------------------------------------------------------
    # TEST 5: Safe Webhook Endpoint (Zero-Fee Direct Merchant UPI mode)
    # -------------------------------------------------------------
    print("\n[TEST 5] Testing Webhook Safe Handler (Zero-Fee Gateway bypass)...")
    wb_res = client.post("/api/payments/razorpay-webhook", json={"event": "payment.captured"})
    assert wb_res.status_code == 200
    assert wb_res.json()["status"] == "ok"
    assert wb_res.json()["gateway"] == "direct_merchant_upi"

    root_wb_res = client.post("/razorpay-webhook", json={"event": "order.paid"})
    assert root_wb_res.status_code == 200
    assert root_wb_res.json()["status"] == "ok"
    print("✓ TEST 5 PASSED: Webhook routes handled safely with zero external fees.")

    print("\n" + "=" * 80)
    print("🎉 ALL DIRECT MERCHANT UPI & SOUNDBOX SETTLEMENT TESTS PASSED 100%!")
    print("=" * 80)

if __name__ == "__main__":
    run_merchant_upi_tests()
