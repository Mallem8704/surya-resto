import sys
import subprocess

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

TEST_FILES = [
    "test_auth.py",
    "test_menu_tables.py",
    "test_orders.py",
    "test_ws.py",
    "test_remaining_routers.py",
    "test_admin_operations.py",
    "test_final_verification.py",
    "test_qr_ordering_upgrade.py",
]

def run_all():
    print("\n" + "=" * 75)
    print("🚀 RUNNING ALL 7 BACKEND & INTEGRATION TEST SUITES")
    print("=" * 75)

    passed = 0
    failed = 0

    for tf in TEST_FILES:
        print(f"\n▶ Running {tf}...")
        res = subprocess.run([sys.executable, tf], capture_output=True, text=True, encoding="utf-8")
        if res.returncode == 0:
            print(f"  ✓ {tf} PASSED")
            passed += 1
        else:
            print(f"  ✗ {tf} FAILED:")
            print(res.stdout)
            print(res.stderr)
            failed += 1

    print("\n" + "=" * 75)
    print(f"🏁 TEST SUMMARY: {passed} PASSED | {failed} FAILED")
    print("=" * 75 + "\n")

    if failed > 0:
        sys.exit(1)

if __name__ == "__main__":
    run_all()
