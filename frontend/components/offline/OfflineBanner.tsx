"use client";

import React from "react";
import { WifiOff, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import { useOffline } from "@/context/OfflineContext";

export function OfflineBanner() {
  const { isOnline, queuedOrders, isSyncing, syncQueuedOrders } = useOffline();

  if (isOnline && queuedOrders.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 max-w-md animate-in slide-in-from-bottom-5">
      {!isOnline ? (
        <div className="bg-amber-600/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl border border-amber-400/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-700/80 flex items-center justify-center shrink-0">
              <WifiOff className="w-4 h-4 text-amber-200 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-bold leading-tight">Offline Mode Active</p>
              <p className="text-[11px] text-amber-100">
                {queuedOrders.length > 0
                  ? `${queuedOrders.length} order(s) queued. Will auto-sync when online.`
                  : "You are offline. Orders will be saved safely."}
              </p>
            </div>
          </div>
        </div>
      ) : queuedOrders.length > 0 ? (
        <div className="bg-emerald-700/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl border border-emerald-400/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-800 flex items-center justify-center shrink-0">
              <RefreshCw className={`w-4 h-4 text-emerald-200 ${isSyncing ? "animate-spin" : ""}`} />
            </div>
            <div>
              <p className="text-xs font-bold leading-tight">Back Online — Syncing Queue</p>
              <p className="text-[11px] text-emerald-100">
                {isSyncing
                  ? `Syncing ${queuedOrders.length} queued order(s)...`
                  : `${queuedOrders.length} order(s) ready to submit.`}
              </p>
            </div>
          </div>
          <button
            onClick={syncQueuedOrders}
            disabled={isSyncing}
            className="px-3 py-1.5 rounded-xl bg-white text-emerald-900 font-extrabold text-xs hover:bg-emerald-50 transition cursor-pointer disabled:opacity-50"
          >
            {isSyncing ? "Syncing..." : "Sync Now"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
