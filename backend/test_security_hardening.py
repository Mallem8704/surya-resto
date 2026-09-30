import os
import sys
import subprocess
import requests
import time

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

BASE_URL = "http://127.0.0.1:8000"


def test_production_secret_key_guardrail():
    print("\n[TEST 1] Verifying Production SECRET_KEY Guardrail...")
    # A. Production environment with default secret key MUST fail with RuntimeError
    env_fail = os.environ.copy()
    env_fail["ENVIRONMENT"] = "production"
    env_fail["SECRET_KEY"] = "surya_family_restaurant_jwt_key_kadiri_2026"

    code_to_run = "import app.auth_utils; print('UNEXPECTED_SUCCESS')"
    res = subprocess.run(
        [sys.executable, "-c", code_to_run],
        env=env_fail,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    assert res.returncode != 0, "Server should fail to start with default key in production!"
    assert "CRITICAL SECURITY ERROR: Default SECRET_KEY detected in production!" in res.stderr, (
        f"Expected RuntimeError with specific message, got stderr: {res.stderr}"
    )
    print("  ✓ Correctly raised RuntimeError when default SECRET_KEY is used with ENVIRONMENT=production")

    # B. Production environment with secure custom secret key MUST succeed
    env_pass = os.environ.copy()
    env_pass["ENVIRONMENT"] = "production"
    env_pass["SECRET_KEY"] = "e87c08a9018449c25f462a6d71b30349f7832672049d5bf1aa5fa6a6f199be32"
    res_pass = subprocess.run(
        [sys.executable, "-c", "import app.auth_utils; print('AUTH_UTILS_LOADED_OK')"],
        env=env_pass,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    assert res_pass.returncode == 0, f"Expected success with secure secret, got: {res_pass.stderr}"
    assert "AUTH_UTILS_LOADED_OK" in res_pass.stdout
    print("  ✓ Successfully loaded with secure 64-character hex secret in production")


def test_health_check_endpoint():
    print("\n[TEST 2] Verifying /api/health Endpoint...")
    # Normal healthy response from live running server
    resp = requests.get(f"{BASE_URL}/api/health")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data["status"] == "healthy", f"Expected status='healthy', got {data.get('status')}"
    assert data["database"] == "connected", f"Expected database='connected', got {data.get('database')}"
    assert "timestamp" in data and len(data["timestamp"]) > 10, "Valid ISO timestamp expected"
    print(f"  ✓ Success (HTTP 200): status={data['status']}, database={data['database']}, timestamp={data['timestamp']}")

    # Failure simulation: Test 503 response logic in subprocess with mocked database error
    code_mock_err = """
from unittest.mock import patch
from app.main import app, health_check

with patch('app.main.SessionLocal') as mock_session_local:
    mock_db = mock_session_local.return_value
    mock_db.execute.side_effect = Exception('Simulated DB connection failure')
    res = health_check()
    assert res.status_code == 503, f'Expected 503, got {res.status_code}'
    import json
    content = json.loads(res.body.decode())
    assert content['status'] == 'unhealthy'
    assert content['database'] == 'disconnected'
    assert 'timestamp' in content
    print('HEALTH_503_DISCONNECTED_OK')
"""
    res_err = subprocess.run(
        [sys.executable, "-c", code_mock_err],
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    assert res_err.returncode == 0, f"Health error test failed: {res_err.stderr}"
    assert "HEALTH_503_DISCONNECTED_OK" in res_err.stdout
    print("  ✓ Success (HTTP 503 on DB disconnect): returns status='unhealthy' and database='disconnected'")


def test_cors_configuration():
    print("\n[TEST 3] Verifying Production & Dev CORS Configuration...")
    # Production mode: regex wildcard MUST NOT be present
    code_cors_prod = """
import os
os.environ['ENVIRONMENT'] = 'production'
os.environ['ALLOWED_ORIGINS'] = 'https://surya-resto.vercel.app,https://suryafamilyrestaurant.in,https://admin.suryafamilyrestaurant.in'
os.environ['SECRET_KEY'] = 'c28a8a9238382c237f897645f6291a2736b69b2d86f7b15d6c813589b2b29158'
from app.main import app
from fastapi.middleware.cors import CORSMiddleware

cors_mw = None
for mw in app.user_middleware:
    if mw.cls == CORSMiddleware:
        cors_mw = mw
        break

assert cors_mw is not None, 'CORSMiddleware must be present'
options = getattr(cors_mw, 'options', cors_mw.kwargs)
assert 'allow_origin_regex' not in options or options['allow_origin_regex'] is None, (
    f"In production, allow_origin_regex must NOT be set! Got {options.get('allow_origin_regex')}"
)
assert 'https://surya-resto.vercel.app' in options['allow_origins'], 'Allowed origin missing'
assert 'https://suryafamilyrestaurant.in' in options['allow_origins'], 'Allowed origin missing'
assert 'https://admin.suryafamilyrestaurant.in' in options['allow_origins'], 'Allowed origin missing'
print('PROD_CORS_VERIFIED')
"""
    res_cors = subprocess.run(
        [sys.executable, "-c", code_cors_prod],
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    assert res_cors.returncode == 0, f"CORS production test failed: {res_cors.stderr}"
    assert "PROD_CORS_VERIFIED" in res_cors.stdout
    print("  ✓ Strict production CORS verified: allow_origin_regex disabled, explicit whitelist enforced")


def test_auth_login_rate_limiting():
    print("\n[TEST 4] Verifying Admin/Staff Login Rate Limiting (/api/auth/login)...")
    import random
    test_ip = f"198.51.{random.randint(1, 250)}.{random.randint(1, 250)}"
    headers = {"X-Forwarded-For": test_ip}

    # 1. First 9 failed attempts should return 401 Unauthorized
    for i in range(1, 10):
        resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": f"nonexistent_admin_{i}@test.com", "password": "wrongpassword"},
            headers=headers,
        )
        assert resp.status_code == 401, f"Attempt {i}: expected 401, got {resp.status_code}"

    print("  ✓ First 9 failed login attempts correctly returned HTTP 401")

    # 2. The 10th failed attempt must trigger 429 Too Many Requests
    resp_10 = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "nonexistent_admin_10@test.com", "password": "wrongpassword"},
        headers=headers,
    )
    assert resp_10.status_code == 429, f"Attempt 10: expected 429, got {resp_10.status_code} ({resp_10.text})"
    print(f"  ✓ 10th failed login attempt blocked with HTTP 429 ({resp_10.json().get('detail')})")

    # 3. Subsequent attempts must also be blocked immediately with 429
    resp_11 = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "owner@teatime.com", "password": "anypassword"},
        headers=headers,
    )
    assert resp_11.status_code == 429, f"Attempt 11: expected 429, got {resp_11.status_code}"
    print("  ✓ 11th attempt immediately blocked at pre-check with HTTP 429")


def test_customer_login_rate_limiting():
    print("\n[TEST 5] Verifying Customer Login Rate Limiting (/api/customer/login)...")
    import random
    test_ip = f"198.51.{random.randint(1, 250)}.{random.randint(1, 250)}"
    headers = {"X-Forwarded-For": test_ip}

    # 9 failed customer login attempts (non-existent or wrong password)
    for i in range(1, 10):
        resp = requests.post(
            f"{BASE_URL}/api/customer/login",
            json={"phone": f"91{random.randint(10000000, 99999999)}", "password": "wrongpassword"},
            headers=headers,
        )
        assert resp.status_code in (400, 404), f"Attempt {i}: expected 400/404, got {resp.status_code}"

    print("  ✓ First 9 failed customer login attempts returned 400/404")

    # 10th failed attempt must trigger 429
    resp_10 = requests.post(
        f"{BASE_URL}/api/customer/login",
        json={"phone": "9100000010", "password": "wrongpassword"},
        headers=headers,
    )
    assert resp_10.status_code == 429, f"Attempt 10: expected 429, got {resp_10.status_code} ({resp_10.text})"
    print(f"  ✓ 10th failed customer login attempt blocked with HTTP 429 ({resp_10.json().get('detail')})")

    # 11th attempt pre-check blocked with 429
    resp_11 = requests.post(
        f"{BASE_URL}/api/customer/login",
        json={"phone": "9100000010", "password": "anypassword"},
        headers=headers,
    )
    assert resp_11.status_code == 429, f"Attempt 11: expected 429, got {resp_11.status_code}"
    print("  ✓ 11th customer login attempt pre-blocked with HTTP 429")


def test_customer_register_rate_limiting():
    print("\n[TEST 6] Verifying Customer Registration Rate Limiting (/api/customer/register)...")
    import random
    test_ip = f"198.51.{random.randint(1, 250)}.{random.randint(1, 250)}"
    headers = {"X-Forwarded-For": test_ip}
    prefix = random.randint(10, 89)

    # First 10 registration attempts allowed through rate limiter
    for i in range(1, 11):
        resp = requests.post(
            f"{BASE_URL}/api/customer/register",
            json={"phone": f"9{prefix}{random.randint(1000000, 9999999)}", "password": "password123"},
            headers=headers,
        )
        assert resp.status_code != 429, f"Attempt {i} should not be rate limited, got 429"

    print("  ✓ First 10 registration attempts permitted within 60-second window")

    # 11th attempt must be rejected with 429 Too Many Requests
    resp_11 = requests.post(
        f"{BASE_URL}/api/customer/register",
        json={"phone": f"9{prefix}9999999", "password": "password123"},
        headers=headers,
    )
    assert resp_11.status_code == 429, f"Attempt 11: expected 429, got {resp_11.status_code} ({resp_11.text})"
    print(f"  ✓ 11th registration attempt blocked with HTTP 429 ({resp_11.json().get('detail')})")


def run_all_security_tests():
    print("\n" + "=" * 75)
    print("🔒 RUNNING SURYA SECURITY & API HARDENING VERIFICATION TEST SUITE")
    print("=" * 75)

    test_production_secret_key_guardrail()
    test_health_check_endpoint()
    test_cors_configuration()
    test_auth_login_rate_limiting()
    test_customer_login_rate_limiting()
    test_customer_register_rate_limiting()

    print("\n" + "=" * 75)
    print("🎉 ALL 6 SECURITY & HARDENING TESTS PASSED SUCCESSFULLY!")
    print("=" * 75 + "\n")


if __name__ == "__main__":
    run_all_security_tests()
