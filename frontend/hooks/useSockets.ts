"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { API_BASE } from "@/lib/api";
import { safeStorage } from "@/lib/safeStorage";

// Derive WebSocket URL from API_BASE or window location
function getWsBase(): string {
    const envWs = process.env.NEXT_PUBLIC_WS_URL;
    if (envWs) return envWs;
    if (typeof window !== "undefined") {
        if (!API_BASE) {
            const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
            return `${protocol}//${window.location.host}/ws`;
        }
        return API_BASE.replace(/^http/, "ws") + "/ws";
    }
    return "ws://127.0.0.1:8000/ws";
}

export interface SocketEvent {
    event: string;
    data?: any;
    message?: string;
    order_id?: number;
    outlet_id?: number;
}

function normalizeRealtimeEvent(rawType: string, payload: any): SocketEvent {
    let evt = rawType.toLowerCase();
    if (evt === "order_status_changed") evt = "order_status_updated";
    if (evt === "table_status_changed") evt = "table_updated";
    if (evt === "payment_confirmed") evt = "order_status_updated";

    return {
        event: evt,
        data: payload,
        message: typeof payload === "string" ? payload : undefined,
        order_id: payload?.id || payload?.order_id,
        outlet_id: payload?.outlet_id || 1,
    };
}

/**
 * WebSocket + SSE Fallback hook for Customer Order Tracking (scoped to order_id).
 */
export function useOrderSocket(
    orderId: number | null | undefined,
    onStatusChange?: (orderData: any) => void
) {
    const [isConnected, setIsConnected] = useState(false);
    const [lastEvent, setLastEvent] = useState<SocketEvent | null>(null);
    const [error, setError] = useState<string | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(true);
    const onStatusChangeRef = useRef(onStatusChange);
    const backoffRef = useRef(1000);

    // Keep callback ref updated without triggering reconnect
    useEffect(() => {
        onStatusChangeRef.current = onStatusChange;
    }, [onStatusChange]);

    const startSseFallback = useCallback(() => {
        if (!isMountedRef.current || eventSourceRef.current) return;
        try {
            if (process.env.NODE_ENV === "development") console.log("[OrderSocket] Initiating SSE fallback to /api/realtime");
            const es = new EventSource("/api/realtime");
            eventSourceRef.current = es;

            es.onopen = () => {
                if (!isMountedRef.current) { es.close(); return; }
                setIsConnected(true);
                setError(null);
            };

            es.onmessage = (e) => {
                try {
                    const parsed = JSON.parse(e.data);
                    if (parsed.type === "PING" || parsed.type === "CONNECTED") return;
                    const socketEvt = normalizeRealtimeEvent(parsed.type, parsed.payload);
                    setLastEvent(socketEvt);

                    if (
                        orderId &&
                        (socketEvt.order_id === orderId || socketEvt.data?.id === orderId) &&
                        (socketEvt.event.includes("order") || socketEvt.event.includes("status"))
                    ) {
                        onStatusChangeRef.current?.(socketEvt.data);
                    }
                } catch (err) {
                    // ignore malformed SSE
                }
            };

            es.onerror = () => {
                if (es.readyState === EventSource.CLOSED) {
                    setIsConnected(false);
                }
            };
        } catch (err: any) {
            console.error("[OrderSocket] SSE fallback error:", err);
        }
    }, [orderId]);

    const connect = useCallback(() => {
        if (!orderId || !isMountedRef.current) return;

        try {
            const url = `${getWsBase()}?client_type=customer&order_id=${orderId}`;
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                if (!isMountedRef.current) { ws.close(); return; }
                if (process.env.NODE_ENV === "development") console.log(`[WS:Order] Connected to order #${orderId}`);
                setIsConnected(true);
                setError(null);
                backoffRef.current = 1000;
            };

            ws.onmessage = (event) => {
                try {
                    const parsed: SocketEvent = JSON.parse(event.data);
                    if (parsed.event === "pong") return;
                    setLastEvent(parsed);
                    if (
                        (parsed.event === "order_status_updated" ||
                         parsed.event === "order_updated" ||
                         parsed.event === "order_created" ||
                         parsed.event === "order_voided") &&
                        parsed.data
                    ) {
                        onStatusChangeRef.current?.(parsed.data);
                    }
                } catch (err) {
                    console.error("[WS:Order] JSON Parse Error", err);
                }
            };

            ws.onerror = () => {
                setError("Connection error");
                // Activate SSE fallback immediately
                startSseFallback();
            };

            ws.onclose = (event: CloseEvent) => {
                setIsConnected(false);
                if (!isMountedRef.current) return;
                if (event.code === 1008) {
                    setError(event.reason || "Unauthorized or invalid order parameters");
                    return;
                }
                // If WS drops, activate SSE fallback
                startSseFallback();

                const baseDelay = Math.min(backoffRef.current, 30000);
                const delay = baseDelay + Math.floor(Math.random() * 500);
                backoffRef.current = Math.min(baseDelay * 1.5, 30000);
                if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = setTimeout(connect, delay);
            };
        } catch (err: any) {
            setError(err.message || "Failed to initialize WebSocket");
            startSseFallback();
        }
    }, [orderId, startSseFallback]);

    useEffect(() => {
        isMountedRef.current = true;
        connect();
        return () => {
            isMountedRef.current = false;
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            if (wsRef.current) {
                wsRef.current.onclose = null;
                wsRef.current.close();
            }
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        };
    }, [connect]);

    // Keep-alive heartbeat ping every 25 seconds for WebSocket
    useEffect(() => {
        if (!isConnected || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        const pingInterval = setInterval(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send("ping");
            }
        }, 25000);
        return () => clearInterval(pingInterval);
    }, [isConnected]);

    return { isConnected, lastEvent, error };
}

/**
 * WebSocket + SSE Fallback hook for Admin Live Orders & Service Calls Dashboard.
 */
export function useAdminSocket(
    outletId: number = 1,
    onEvent?: (event: SocketEvent) => void
) {
    const [isConnected, setIsConnected] = useState(false);
    const [lastEvent, setLastEvent] = useState<SocketEvent | null>(null);
    const [error, setError] = useState<string | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(true);
    const onEventRef = useRef(onEvent);
    const backoffRef = useRef(1000);

    // Keep callback ref updated without triggering reconnect
    useEffect(() => {
        onEventRef.current = onEvent;
    }, [onEvent]);

    const startSseFallback = useCallback(() => {
        if (!isMountedRef.current || eventSourceRef.current) return;
        try {
            if (process.env.NODE_ENV === "development") console.log("[AdminSocket] Initiating SSE fallback to /api/realtime");
            const es = new EventSource("/api/realtime");
            eventSourceRef.current = es;

            es.onopen = () => {
                if (!isMountedRef.current) { es.close(); return; }
                setIsConnected(true);
                setError(null);
            };

            es.onmessage = (e) => {
                try {
                    const parsed = JSON.parse(e.data);
                    if (parsed.type === "PING" || parsed.type === "CONNECTED") return;
                    const socketEvt = normalizeRealtimeEvent(parsed.type, parsed.payload);
                    setLastEvent(socketEvt);
                    onEventRef.current?.(socketEvt);
                } catch (err) {
                    // ignore malformed SSE
                }
            };

            es.onerror = () => {
                if (es.readyState === EventSource.CLOSED) {
                    setIsConnected(false);
                }
            };
        } catch (err: any) {
            console.error("[AdminSocket] SSE fallback error:", err);
        }
    }, []);

    const connect = useCallback(() => {
        if (!isMountedRef.current) return;

        try {
            let url = `${getWsBase()}?client_type=admin&outlet_id=${outletId}`;
            if (typeof window !== "undefined") {
                const token = safeStorage.getItem("surya_token");
                if (token) url += `&token=${encodeURIComponent(token)}`;
            }
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                if (!isMountedRef.current) { ws.close(); return; }
                if (process.env.NODE_ENV === "development") console.log(`[WS:Admin] Connected to outlet #${outletId}`);
                setIsConnected(true);
                setError(null);
                backoffRef.current = 1000;
            };

            ws.onmessage = (event) => {
                try {
                    const parsed: SocketEvent = JSON.parse(event.data);
                    if (parsed.event === "pong") return;
                    setLastEvent(parsed);
                    onEventRef.current?.(parsed);
                } catch (err) {
                    console.error("[WS:Admin] JSON Parse Error", err);
                }
            };

            ws.onerror = () => {
                setError("Connection error");
                startSseFallback();
            };

            ws.onclose = (event: CloseEvent) => {
                setIsConnected(false);
                if (!isMountedRef.current) return;
                if (event.code === 1008) {
                    setError(event.reason || "Unauthorized: invalid or missing admin token");
                    if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin") && !window.location.pathname.includes("/admin/login")) {
                        safeStorage.removeItem("surya_token");
                        safeStorage.removeItem("surya_user");
                        window.location.href = "/admin/login?reason=session_expired";
                    }
                    return;
                }
                startSseFallback();

                const baseDelay = Math.min(backoffRef.current, 30000);
                const delay = baseDelay + Math.floor(Math.random() * 500);
                backoffRef.current = Math.min(baseDelay * 1.5, 30000);
                if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = setTimeout(connect, delay);
            };
        } catch (err: any) {
            setError(err.message || "Failed to initialize Admin WebSocket");
            startSseFallback();
        }
    }, [outletId, startSseFallback]);

    useEffect(() => {
        isMountedRef.current = true;
        connect();
        return () => {
            isMountedRef.current = false;
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            if (wsRef.current) {
                wsRef.current.onclose = null;
                wsRef.current.close();
            }
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        };
    }, [connect]);

    // Keep-alive heartbeat ping every 25 seconds for WebSocket
    useEffect(() => {
        if (!isConnected || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        const pingInterval = setInterval(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send("ping");
            }
        }, 25000);
        return () => clearInterval(pingInterval);
    }, [isConnected]);

    return { isConnected, lastEvent, error };
}
