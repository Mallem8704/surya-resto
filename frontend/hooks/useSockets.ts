"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { API_BASE } from "@/lib/api";

// Derive WebSocket URL from API_BASE
function getWsBase(): string {
    const envWs = process.env.NEXT_PUBLIC_WS_URL;
    if (envWs) return envWs;
    // Convert http(s) to ws(s)
    return API_BASE.replace(/^http/, "ws") + "/ws";
}

export interface SocketEvent {
    event: string;
    data?: any;
    message?: string;
    order_id?: number;
    outlet_id?: number;
}

/**
 * WebSocket hook for Customer Order Tracking (scoped to order_id).
 */
export function useOrderSocket(
    orderId: number | null | undefined,
    onStatusChange?: (orderData: any) => void
) {
    const [isConnected, setIsConnected] = useState(false);
    const [lastEvent, setLastEvent] = useState<SocketEvent | null>(null);
    const [error, setError] = useState<string | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(true);
    const onStatusChangeRef = useRef(onStatusChange);
    const backoffRef = useRef(1000);

    // Keep callback ref updated without triggering reconnect
    useEffect(() => { onStatusChangeRef.current = onStatusChange; }, [onStatusChange]);

    const connect = useCallback(() => {
        if (!orderId || !isMountedRef.current) return;

        try {
            const url = `${getWsBase()}?client_type=customer&order_id=${orderId}`;
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                if (!isMountedRef.current) { ws.close(); return; }
                console.log(`[WS:Order] Connected to order #${orderId}`);
                setIsConnected(true);
                setError(null);
                backoffRef.current = 1000; // Reset backoff on success
            };

            ws.onmessage = (event) => {
                try {
                    const parsed: SocketEvent = JSON.parse(event.data);
                    setLastEvent(parsed);
                    if (parsed.event === "order_status_updated" && parsed.data) {
                        onStatusChangeRef.current?.(parsed.data);
                    }
                } catch (err) {
                    console.error("[WS:Order] JSON Parse Error", err);
                }
            };

            ws.onerror = () => {
                setError("Connection error");
            };

            ws.onclose = () => {
                setIsConnected(false);
                if (!isMountedRef.current) return; // Don't reconnect if unmounted
                const delay = Math.min(backoffRef.current, 30000);
                backoffRef.current = delay * 1.5;
                reconnectTimeoutRef.current = setTimeout(connect, delay);
            };
        } catch (err: any) {
            setError(err.message || "Failed to initialize WebSocket");
        }
    }, [orderId]); // Only depends on orderId, NOT onStatusChange

    useEffect(() => {
        isMountedRef.current = true;
        connect();
        return () => {
            isMountedRef.current = false;
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            if (wsRef.current) {
                wsRef.current.onclose = null; // Prevent onclose from firing reconnect
                wsRef.current.close();
            }
        };
    }, [connect]);

    // Keep-alive heartbeat ping every 25 seconds
    useEffect(() => {
        if (!isConnected) return;
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
 * WebSocket hook for Admin Live Orders & Service Calls Dashboard.
 */
export function useAdminSocket(
    outletId: number = 1,
    onEvent?: (event: SocketEvent) => void
) {
    const [isConnected, setIsConnected] = useState(false);
    const [lastEvent, setLastEvent] = useState<SocketEvent | null>(null);
    const [error, setError] = useState<string | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(true);
    const onEventRef = useRef(onEvent);
    const backoffRef = useRef(1000);

    // Keep callback ref updated without triggering reconnect
    useEffect(() => { onEventRef.current = onEvent; }, [onEvent]);

    const connect = useCallback(() => {
        if (!isMountedRef.current) return;

        try {
            let url = `${getWsBase()}?client_type=admin&outlet_id=${outletId}`;
            // Attach JWT token for authenticated admin connections
            if (typeof window !== "undefined") {
                const token = localStorage.getItem("surya_token") || localStorage.getItem("teatime_token");
                if (token) url += `&token=${encodeURIComponent(token)}`;
            }
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                if (!isMountedRef.current) { ws.close(); return; }
                console.log(`[WS:Admin] Connected to outlet #${outletId}`);
                setIsConnected(true);
                setError(null);
                backoffRef.current = 1000;
            };

            ws.onmessage = (event) => {
                try {
                    const parsed: SocketEvent = JSON.parse(event.data);
                    setLastEvent(parsed);
                    onEventRef.current?.(parsed);
                } catch (err) {
                    console.error("[WS:Admin] JSON Parse Error", err);
                }
            };

            ws.onerror = () => {
                setError("Connection error");
            };

            ws.onclose = () => {
                setIsConnected(false);
                if (!isMountedRef.current) return;
                const delay = Math.min(backoffRef.current, 30000);
                backoffRef.current = delay * 1.5;
                reconnectTimeoutRef.current = setTimeout(connect, delay);
            };
        } catch (err: any) {
            setError(err.message || "Failed to initialize Admin WebSocket");
        }
    }, [outletId]); // Only depends on outletId, NOT onEvent

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
        };
    }, [connect]);

    // Keep-alive heartbeat ping every 25 seconds
    useEffect(() => {
        if (!isConnected) return;
        const pingInterval = setInterval(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send("ping");
            }
        }, 25000);
        return () => clearInterval(pingInterval);
    }, [isConnected]);

    return { isConnected, lastEvent, error };
}
