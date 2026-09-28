"use client";

import React from "react";
import { UtensilsCrossed, RefreshCw } from "lucide-react";

export default function OrderError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      className="min-h-screen flex items-center justify-center p-6 bg-[#FAF7F2]"
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-3xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto mb-4 shadow-sm">
          <UtensilsCrossed className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-extrabold text-gray-900 mb-2">
          Menu couldn&apos;t load
        </h2>
        <p className="text-sm text-gray-500 mb-5 leading-relaxed">
          This can happen due to a temporary network issue or browser privacy
          settings. Tap below to try again.
        </p>
        <button
          onClick={() => {
            // Clear corrupted service worker caches
            if (typeof caches !== "undefined") {
              caches
                .keys()
                .then((names) => names.forEach((n) => caches.delete(n)));
            }
            reset();
          }}
          className="inline-flex items-center gap-2 px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl shadow-lg transition active:scale-95 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Try Again</span>
        </button>
      </div>
    </main>
  );
}
