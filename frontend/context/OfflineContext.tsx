"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { safeStorage } from "@/lib/safeStorage";

export interface QueuedOfflineOrder {
  id: string; // client uuid
  timestamp: number;
  orderPayload: any;
  orderType: "dine_in" | "delivery";
  status: "pending" | "syncing" | "synced" | "failed";
  retryCount: number;
  error?: string;
}

interface OfflineContextType {
  isOnline: boolean;
  queuedOrders: QueuedOfflineOrder[];
  isSyncing: boolean;
  enqueueOrder: (orderPayload: any, orderType?: "dine_in" | "delivery") => Promise<string>;
  syncQueuedOrders: () => Promise<void>;
  removeQueuedOrder: (id: string) => void;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);
const STORAGE_KEY = "surya_offline_order_queue_v1";

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [queuedOrders, setQueuedOrders] = useState<QueuedOfflineOrder[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load queued orders from storage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);

      try {
        const stored = safeStorage.getItem(STORAGE_KEY);
        if (stored) {
          setQueuedOrders(JSON.parse(stored));
        }
      } catch (err) {
        console.error("Failed to parse offline order queue:", err);
      }

      const handleOnline = () => {
        console.log("[Network] Connection RESTORED - Online");
        setIsOnline(true);
      };

      const handleOffline = () => {
        console.log("[Network] Connection LOST - Offline mode activated");
        setIsOnline(false);
      };

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  // Save queue to storage whenever it changes
  useEffect(() => {
    safeStorage.setItem(STORAGE_KEY, JSON.stringify(queuedOrders));
  }, [queuedOrders]);

  const enqueueOrder = useCallback(async (orderPayload: any, orderType: "dine_in" | "delivery" = "dine_in") => {
    const queueId = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const queuedItem: QueuedOfflineOrder = {
      id: queueId,
      timestamp: Date.now(),
      orderPayload,
      orderType,
      status: "pending",
      retryCount: 0,
    };

    setQueuedOrders((prev) => [...prev, queuedItem]);
    return queueId;
  }, []);

  const removeQueuedOrder = useCallback((id: string) => {
    setQueuedOrders((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const syncQueuedOrders = useCallback(async () => {
    if (!isOnline || isSyncing || queuedOrders.length === 0) return;

    setIsSyncing(true);
    console.log(`[OfflineSync] Syncing ${queuedOrders.length} pending offline orders...`);

    const remainingQueue: QueuedOfflineOrder[] = [];

    for (const item of queuedOrders) {
      try {
        console.log(`[OfflineSync] Submitting queued order #${item.id}...`);
        await api.createOrder(item.orderPayload);
        console.log(`[OfflineSync] Successfully synced queued order #${item.id}!`);
      } catch (err: any) {
        console.error(`[OfflineSync] Failed to sync order #${item.id}:`, err);
        remainingQueue.push({
          ...item,
          retryCount: item.retryCount + 1,
          error: err?.message || "Sync failed",
        });
      }
    }

    setQueuedOrders(remainingQueue);
    setIsSyncing(false);
  }, [isOnline, isSyncing, queuedOrders]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && queuedOrders.length > 0 && !isSyncing) {
      const timer = setTimeout(() => {
        syncQueuedOrders();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, queuedOrders.length, isSyncing, syncQueuedOrders]);

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        queuedOrders,
        isSyncing,
        enqueueOrder,
        syncQueuedOrders,
        removeQueuedOrder,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error("useOffline must be used within an OfflineProvider");
  }
  return context;
}
