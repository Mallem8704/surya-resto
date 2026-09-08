"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdminSocket, SocketEvent } from "@/hooks/useSockets";
import { useOutlet } from "@/context/OutletContext";
import { api } from "@/lib/api";

import { soundManager } from "@/lib/sound";

/**
 * Shared hook for admin pages that need live WebSocket state.
 * Scoped dynamically to the selected branch / outlet.
 */
export function useAdminLiveState() {
    const { outlet } = useOutlet();
    const [pendingServiceCalls, setPendingServiceCalls] = useState<any[]>([]);

    // Fetch initial pending service calls whenever selected branch changes
    useEffect(() => {
        api.getServiceCalls("pending", outlet?.id)
            .then((calls: any[]) => setPendingServiceCalls(calls))
            .catch(() => {});
    }, [outlet?.id]);

    const handleWsEvent = useCallback((event: SocketEvent) => {
        if (event.event === "service_call" && event.data) {
            setPendingServiceCalls((prev) => {
                if (prev.some((c) => c.id === event.data.id)) return prev;
                return [...prev, event.data];
            });
        } else if (event.event === "service_call_attended" && event.data) {
            setPendingServiceCalls((prev) => prev.filter((c) => c.id !== event.data.id));
        } else if (event.event === "order_status_updated" && event.data) {
            if (event.data.payment_status === "paid" && event.data.total_paise) {
                const totalRs = Math.round(event.data.total_paise / 100);
                soundManager.playPaymentSoundbox(totalRs, event.data.payment_method?.toUpperCase() || "UPI", event.data.table_label);
            }
        }
    }, []);

    const { isConnected: wsConnected } = useAdminSocket(outlet?.id || 1, handleWsEvent);

    const handleAttendServiceCall = useCallback(async (id: number) => {
        try {
            await api.attendServiceCall(id);
            setPendingServiceCalls((prev) => prev.filter((c) => c.id !== id));
        } catch (err) {
            console.error("Failed to attend service call", err);
        }
    }, []);

    return {
        wsConnected,
        pendingServiceCalls,
        handleAttendServiceCall,
    };
}
