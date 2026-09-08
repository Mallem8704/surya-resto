"use client";

import React from "react";

export default function OrderError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      className="min-h-screen flex items-center justify-center p-6"
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        background: "#faf7f2",
      }}
    >
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-3">🍽️</div>
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
          className="px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl shadow-lg transition"
        >
          🔄 Try Again
        </button>
      </div>
    </main>
  );
}
