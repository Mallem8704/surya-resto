"""
Unit and Integration Test Suite for Surya Family Restaurant Kadiri - Zero-Cost Hybrid Sync Engine.
Tests status reporting, pending order tracking, authentication barriers, and local-first resilience.
"""

import sys
import os
import unittest
from fastapi.testclient import TestClient

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.main import app
from app.database import SessionLocal
from app.models import User, Order, Outlet
from app.auth_utils import get_password_hash, create_access_token
from app.sync_engine import get_sync_status, sync_local_to_cloud

class TestHybridSync(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        db = SessionLocal()
        try:
            # Ensure SQLite columns exist
            for table_name in ["orders", "payments", "customers"]:
                try:
                    cols = [r[1] for r in db.execute(text(f"PRAGMA table_info({table_name})")).fetchall()]
                    if "synced_to_cloud" not in cols:
                        db.execute(text(f"ALTER TABLE {table_name} ADD COLUMN synced_to_cloud BOOLEAN DEFAULT 0;"))
                        db.commit()
                except Exception:
                    pass

            # Ensure outlet exists
            outlet = db.query(Outlet).filter_by(id=1).first()
            if not outlet:
                outlet = Outlet(id=1, name="Surya Family Restaurant Kadiri", address="Near Clock Tower", is_active=True)
                db.add(outlet)
                db.commit()

            # Ensure staff test user exists
            staff = db.query(User).filter_by(email="sync_staff_test@surya.com").first()
            if not staff:
                staff = User(
                    name="Sync Tester",
                    email="sync_staff_test@surya.com",
                    password_hash=get_password_hash("SyncTest123!"),
                    role="staff",
                    outlet_id=1,
                )
                db.add(staff)
                db.commit()
                db.refresh(staff)

            cls.staff_token = create_access_token(data={"sub": str(staff.id), "user_id": staff.id, "role": staff.role, "outlet_id": staff.outlet_id})
        finally:
            db.close()

    def test_01_status_requires_auth(self):
        """Unauthenticated requests to /api/sync/status must be rejected with 401."""
        response = self.client.get("/api/sync/status")
        self.assertEqual(response.status_code, 401)

    def test_02_status_authenticated(self):
        """Authenticated staff can retrieve live hybrid sync status with zero-cost verification."""
        headers = {"Authorization": f"Bearer {self.staff_token}"}
        response = self.client.get("/api/sync/status", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("hybrid_mode", data)
        self.assertTrue(data["hybrid_mode"])
        self.assertIn("monthly_cloud_cost", data)
        self.assertIn("₹0.00", data["monthly_cloud_cost"])
        self.assertIn("pending_orders", data)
        self.assertIn("total_orders", data)

    def test_03_trigger_sync_local_mode(self):
        """Triggering sync in local-only mode succeeds safely without breaking counter operations."""
        headers = {"Authorization": f"Bearer {self.staff_token}"}
        response = self.client.post("/api/sync/trigger", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data.get("success"))

    def test_04_direct_sync_engine_functions(self):
        """Directly test get_sync_status and sync_local_to_cloud Python functions."""
        db = SessionLocal()
        try:
            status = get_sync_status(db)
            self.assertIsInstance(status, dict)
            self.assertEqual(status["hybrid_mode"], True)
            self.assertIn("pending_orders", status)

            sync_res = sync_local_to_cloud(db)
            self.assertIsInstance(sync_res, dict)
            self.assertTrue(sync_res.get("success", False))
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
