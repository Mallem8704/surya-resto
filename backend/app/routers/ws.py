import asyncio
import json
import logging
from typing import Dict, Set, Optional, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

logger = logging.getLogger("teatime_ws")
router = APIRouter(tags=["WebSockets"])


class ConnectionManager:
    """Manages active WebSocket connections for Admin Dashboards and Customer Order Trackers."""

    def __init__(self):
        # Admin sockets keyed by outlet_id: outlet_id -> Set[WebSocket]
        self.admin_connections: Dict[int, Set[WebSocket]] = {}
        # Customer sockets keyed by order_id: order_id -> Set[WebSocket]
        self.order_connections: Dict[int, Set[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect_admin(self, websocket: WebSocket, outlet_id: int = 1):
        """Register an admin dashboard connection."""
        await websocket.accept()
        async with self._lock:
            if outlet_id not in self.admin_connections:
                self.admin_connections[outlet_id] = set()
            self.admin_connections[outlet_id].add(websocket)
        logger.info(f"[WS] Admin connected for outlet {outlet_id}. Total: {len(self.admin_connections.get(outlet_id, set()))}")

    async def disconnect_admin(self, websocket: WebSocket, outlet_id: int = 1):
        """Unregister an admin dashboard connection."""
        async with self._lock:
            if outlet_id in self.admin_connections and websocket in self.admin_connections[outlet_id]:
                self.admin_connections[outlet_id].remove(websocket)
        logger.info(f"[WS] Admin disconnected for outlet {outlet_id}")

    async def connect_order(self, websocket: WebSocket, order_id: int):
        """Register a customer order tracking connection scoped to a single order_id."""
        await websocket.accept()
        async with self._lock:
            if order_id not in self.order_connections:
                self.order_connections[order_id] = set()
            self.order_connections[order_id].add(websocket)
        logger.info(f"[WS] Customer connected for order {order_id}. Total: {len(self.order_connections.get(order_id, set()))}")

    async def disconnect_order(self, websocket: WebSocket, order_id: int):
        """Unregister a customer order tracking connection."""
        async with self._lock:
            if order_id in self.order_connections and websocket in self.order_connections[order_id]:
                self.order_connections[order_id].remove(websocket)
                if not self.order_connections[order_id]:
                    del self.order_connections[order_id]
        logger.info(f"[WS] Customer disconnected for order {order_id}")

    async def broadcast_to_admin(self, outlet_id: int, event_type: str, data: Any):
        """Broadcast live event to all connected admin dashboards for the given outlet."""
        message = json.dumps({"event": event_type, "data": data})
        targets = []
        async with self._lock:
            if outlet_id in self.admin_connections:
                targets = list(self.admin_connections[outlet_id])

        async def send_safe(ws):
            try:
                await ws.send_text(message)
            except Exception as e:
                logger.warning(f"[WS] Failed sending to admin socket: {e}")
                await self.disconnect_admin(ws, outlet_id)

        if targets:
            await asyncio.gather(*(send_safe(ws) for ws in targets), return_exceptions=True)

    async def broadcast_to_order(self, order_id: int, event_type: str, data: Any, outlet_id: int = 1):
        """Broadcast live status update to customer tracking connections and admin boards."""
        message = json.dumps({"event": event_type, "data": data})

        # 1. Notify specific customer order connections
        customer_targets = []
        async with self._lock:
            if order_id in self.order_connections:
                customer_targets = list(self.order_connections[order_id])

        for ws in customer_targets:
            try:
                await ws.send_text(message)
            except Exception as e:
                logger.warning(f"[WS] Failed sending to customer socket for order {order_id}: {e}")
                await self.disconnect_order(ws, order_id)

        # 2. Also notify admins so live Kanban board stays synchronized
        await self.broadcast_to_admin(outlet_id=outlet_id, event_type=event_type, data=data)

    async def broadcast_service_call(self, outlet_id: int, data: Any):
        """Broadcast service calls (waiter, bill, water) to admin dashboard."""
        await self.broadcast_to_admin(outlet_id=outlet_id, event_type="service_call", data=data)


# Global singleton connection manager
manager = ConnectionManager()


# ==========================================
# WEBSOCKET ROUTE
# ==========================================

@router.websocket("/ws")
@router.websocket("/api/ws")
async def websocket_hub(
    websocket: WebSocket,
    client_type: str = Query("admin", description="'admin' or 'customer'"),
    order_id: Optional[int] = Query(None, description="Order ID required for customer tracking"),
    outlet_id: int = Query(1, description="Outlet ID"),
    token: Optional[str] = Query(None, description="Admin auth token"),
):
    """Unified WebSocket endpoint for live admin Kanban and customer order tracking."""
    client_type_clean = client_type.strip().lower()

    if client_type_clean == "customer":
        if not order_id:
            await websocket.close(code=1008, reason="Missing order_id for customer connection")
            return
        await manager.connect_order(websocket, order_id)
        try:
            # Send initial welcome confirmation
            await websocket.send_text(json.dumps({
                "event": "connected",
                "message": f"Connected to live updates for Order #{order_id}",
                "order_id": order_id,
            }))
            while True:
                data = await websocket.receive_text()
                # Respond to client ping / heartbeat
                if data == "ping":
                    await websocket.send_text(json.dumps({"event": "pong"}))
        except WebSocketDisconnect:
            await manager.disconnect_order(websocket, order_id)
        except Exception:
            await manager.disconnect_order(websocket, order_id)

    else:
        # Admin connection
        import os
        is_production = os.getenv("ENVIRONMENT", "development") == "production"
        if token:
            from app.routers.auth import decode_access_token
            user_data = decode_access_token(token)
            if not user_data:
                await websocket.close(code=1008, reason="Invalid admin token")
                return
            # Allow owner to inspect any outlet_id passed in query; restrict staff to their assigned outlet
            if user_data.get("role") != "owner":
                outlet_id = user_data.get("outlet_id", outlet_id)
        elif is_production:
            await websocket.close(code=1008, reason="Missing admin token")
            return
            
        await manager.connect_admin(websocket, outlet_id)
        try:
            await websocket.send_text(json.dumps({
                "event": "connected",
                "message": f"Admin live stream connected for Outlet #{outlet_id}",
                "outlet_id": outlet_id,
            }))
            while True:
                data = await websocket.receive_text()
                if data == "ping":
                    await websocket.send_text(json.dumps({"event": "pong"}))
        except WebSocketDisconnect:
            await manager.disconnect_admin(websocket, outlet_id)
        except Exception:
            await manager.disconnect_admin(websocket, outlet_id)
