import sys
import json
import asyncio
import requests
import websockets

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

HTTP_URL = "http://127.0.0.1:8000"
WS_URL = "ws://127.0.0.1:8000/ws"


async def run_ws_test():
    print("\n" + "=" * 75)
    print("⚡ TESTING WEBSOCKET CONNECTION HUB & REAL-TIME EVENT DISPATCH")
    print("=" * 75)

    # 1. Login as Staff to get auth token
    staff_res = requests.post(
        f"{HTTP_URL}/api/auth/login",
        json={"email": "staff@teatime.com", "password": "staff123"},
    )
    assert staff_res.status_code == 200
    staff_token = staff_res.json()["access_token"]
    staff_headers = {"Authorization": f"Bearer {staff_token}"}
    print("✓ Staff authenticated for status updates")

    # 2. Connect Admin WebSocket Client
    print("\n[STEP 1] Connecting Admin WebSocket Client to /ws?client_type=admin...")
    admin_ws = await websockets.connect(f"{WS_URL}?client_type=admin&outlet_id=1")
    admin_welcome = json.loads(await admin_ws.recv())
    assert admin_welcome["event"] == "connected"
    print(f"✓ Admin WebSocket Connected: {admin_welcome['message']}")

    # 3. Place a new Order via HTTP REST API
    print("\n[STEP 2] Placing new Order for Table T3 via POST /api/orders...")
    order_payload = {
        "table_id": 3,
        "customer_notes": "Less sugar please",
        "payment_method": "counter",
        "items": [
            {"item_id": 3, "qty": 2, "notes": "Dum Chai"},
            {"item_id": 5, "qty": 1, "notes": "Osmania Biscuits"},
        ],
    }
    order_res = requests.post(f"{HTTP_URL}/api/orders", json=order_payload)
    assert order_res.status_code == 201
    created_order = order_res.json()
    order_id = created_order["id"]
    print(f"✓ Order Created: #{created_order['order_number']} (ID: {order_id}) on Table {created_order['table_label']}")

    # 4. Verify Admin WebSocket receives "new_order" event
    print("\n[STEP 3] Verifying Admin WebSocket received 'new_order' broadcast...")
    admin_msg = json.loads(await asyncio.wait_for(admin_ws.recv(), timeout=5.0))
    print(f"✓ Admin Received Event: '{admin_msg['event']}'")
    assert admin_msg["event"] == "new_order", f"Expected 'new_order', got {admin_msg['event']}"
    assert admin_msg["data"]["id"] == order_id
    assert admin_msg["data"]["order_number"] == created_order["order_number"]
    assert len(admin_msg["data"]["items"]) == 2
    print(f"  • Order Payload Verified: #{admin_msg['data']['order_number']} @ ₹{admin_msg['data']['total_paise']/100:.2f}")

    # 5. Connect Customer WebSocket Client scoped to order_id
    print(f"\n[STEP 4] Connecting Customer WebSocket Client to /ws?client_type=customer&order_id={order_id}...")
    customer_ws = await websockets.connect(f"{WS_URL}?client_type=customer&order_id={order_id}")
    customer_welcome = json.loads(await customer_ws.recv())
    assert customer_welcome["event"] == "connected"
    print(f"✓ Customer WebSocket Connected: {customer_welcome['message']}")

    # 6. Progress Order Status to 'preparing' via Staff API
    print(f"\n[STEP 5] Updating Order #{created_order['order_number']} status to 'preparing' via Staff API...")
    status_res = requests.patch(
        f"{HTTP_URL}/api/orders/{order_id}/status",
        json={"status": "preparing"},
        headers=staff_headers,
    )
    assert status_res.status_code == 200

    # 7. Verify Customer receives "order_status_updated"
    print("\n[STEP 6] Verifying Customer WebSocket received 'order_status_updated' event...")
    cust_msg = json.loads(await asyncio.wait_for(customer_ws.recv(), timeout=5.0))
    print(f"✓ Customer Received Event: '{cust_msg['event']}' with status='{cust_msg['data']['status']}'")
    assert cust_msg["event"] == "order_status_updated"
    assert cust_msg["data"]["status"] == "preparing"

    # 8. Verify Admin also received "order_updated"
    print("\n[STEP 7] Verifying Admin WebSocket received 'order_updated' event...")
    admin_status_msg = json.loads(await asyncio.wait_for(admin_ws.recv(), timeout=5.0))
    assert admin_status_msg["event"] == "order_updated"
    assert admin_status_msg["data"]["status"] == "preparing"
    print(f"✓ Admin Received Sync Event: '{admin_status_msg['event']}' for Kanban board")

    # 9. Test Service Call Broadcast (Customer calls for Water)
    print("\n[STEP 8] Customer triggers Service Call (Water) for Table 3...")
    call_res = requests.post(
        f"{HTTP_URL}/api/tables/3/call",
        json={"call_type": "water"},
    )
    assert call_res.status_code == 201

    admin_call_msg = json.loads(await asyncio.wait_for(admin_ws.recv(), timeout=5.0))
    assert admin_call_msg["event"] == "service_call"
    assert admin_call_msg["data"]["call_type"] == "water"
    assert admin_call_msg["data"]["table_label"] == "T3"
    print(f"✓ Admin Received Service Call: Table {admin_call_msg['data']['table_label']} requested '{admin_call_msg['data']['call_type'].upper()}'")

    # Clean up sockets
    await customer_ws.close()
    await admin_ws.close()

    print("\n" + "=" * 75)
    print("🎉 ALL WEBSOCKET DISPATCH & RECONNECT TESTS PASSED SUCCESSFULLY!")
    print("=" * 75 + "\n")


if __name__ == "__main__":
    asyncio.run(run_ws_test())
