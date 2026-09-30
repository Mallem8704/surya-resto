"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { safeStorage } from "@/lib/safeStorage";

export interface QueuedOfflineOrder {
  id: string; // client uuid / queueId
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
const FALLBACK_STORAGE_KEY = "surya_offline_order_queue_v1";
const DB_NAME = "surya_pos_offline_db";
const STORE_NAME = "offline_order_queue";
const DB_VERSION = 1;

// ==========================================
// INDEXEDDB STORAGE ADAPTER WITH FALLBACK
// ==========================================

function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      return reject(new Error("IndexedDB not supported"));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB"));
  });
}

async function idbGetAllOrders(): Promise<QueuedOfflineOrder[]> {
  try {
    const db = await openIndexedDB();
    return await new Promise<QueuedOfflineOrder[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Graceful fallback to safeStorage / localStorage
    try {
      const stored = safeStorage.getItem(FALLBACK_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
}

async function idbPutOrder(order: QueuedOfflineOrder): Promise<void> {
  try {
    const db = await openIndexedDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(order);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Ignored: Fallback state sync handles safeStorage
  }
}

async function idbDeleteOrder(id: string): Promise<void> {
  try {
    const db = await openIndexedDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Ignored: Fallback state sync handles safeStorage
  }
}

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [queuedOrders, setQueuedOrders] = useState<QueuedOfflineOrder[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);

  // Load queued orders from IndexedDB on initial mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);

      idbGetAllOrders().then((orders) => {
        setQueuedOrders(orders);
      });

      const handleOnline = () => {
        if (process.env.NODE_ENV === "development") console.log("[Network] Connection RESTORED - Online");
        setIsOnline(true);
      };

      const handleOffline = () => {
        if (process.env.NODE_ENV === "development") console.log("[Network] Connection LOST - Offline mode activated");
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

  // Mirror queue to safeStorage as secondary fallback
  useEffect(() => {
    safeStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(queuedOrders));
  }, [queuedOrders]);

  const enqueueOrder = useCallback(async (orderPayload: any, orderType: "dine_in" | "delivery" = "dine_in") => {
    const queueId = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Ensure strict idempotency key is embedded so replaying never produces duplicates
    const payloadWithIdempotency = {
      ...orderPayload,
      idempotency_key: orderPayload.idempotency_key || queueId,
    };

    const queuedItem: QueuedOfflineOrder = {
      id: queueId,
      timestamp: Date.now(),
      orderPayload: payloadWithIdempotency,
      orderType,
      status: "pending",
      retryCount: 0,
    };

    await idbPutOrder(queuedItem);
    setQueuedOrders((prev) => [...prev, queuedItem]);
    return queueId;
  }, []);

  const removeQueuedOrder = useCallback(async (id: string) => {
    await idbDeleteOrder(id);
    setQueuedOrders((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const syncQueuedOrders = useCallback(async () => {
    if (!isOnline || isSyncingRef.current) return;

    // Retrieve freshest items from IndexedDB
    const allItems = await idbGetAllOrders();
    const pendingItems = allItems.filter((o) => o.status !== "synced" && (o.retryCount || 0) < 5);
    if (pendingItems.length === 0) return;

    isSyncingRef.current = true;
    setIsSyncing(true);

    if (process.env.NODE_ENV === "development") {
      console.log(`[OfflineSync] Syncing ${pendingItems.length} pending offline orders from IndexedDB...`);
    }

    for (const item of pendingItems) {
      try {
        if (process.env.NODE_ENV === "development") {
          console.log(`[OfflineSync] Submitting queued order #${item.id}...`);
        }
        await api.createOrder(item.orderPayload);
        if (process.env.NODE_ENV === "development") {
          console.log(`[OfflineSync] Successfully synced queued order #${item.id}!`);
        }

        // Successfully synced: delete from IndexedDB and update state non-destructively
        await idbDeleteOrder(item.id);
        setQueuedOrders((prev) => prev.filter((o) => o.id !== item.id));
      } catch (err: any) {
        console.error(`[OfflineSync] Failed to sync order #${item.id}:`, err);
        const nextRetry = (item.retryCount || 0) + 1;
        const failedItem: QueuedOfflineOrder = {
          ...item,
          retryCount: nextRetry,
          status: nextRetry >= 5 ? "failed" : "pending",
          error: err?.message || "Sync failed",
        };
        await idbPutOrder(failedItem);
        setQueuedOrders((prev) => prev.map((o) => (o.id === item.id ? failedItem : o)));
      }
    }

    isSyncingRef.current = false;
    setIsSyncing(false);
  }, [isOnline]);

  // Auto-sync when coming back online
  useEffect(() => {
    const hasPending = queuedOrders.some((o) => o.status === "pending" && (o.retryCount || 0) < 5);
    if (isOnline && hasPending && !isSyncing) {
      const timer = setTimeout(() => {
        syncQueuedOrders();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, queuedOrders, isSyncing, syncQueuedOrders]);

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
