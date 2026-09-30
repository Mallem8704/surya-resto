"use client";

import React from "react";
import { UtensilsCrossed, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#faf7f2",
          color: "#1a1a1a",
          padding: "24px",
        }}
      >
        <div style={{ textAlign: "center" as const, maxWidth: 400 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#fee2e2",
              border: "1px solid #fecaca",
              color: "#c0392b",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px auto",
            }}
          >
            <UtensilsCrossed size={32} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
            Oops! Something went wrong
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "#666",
              marginBottom: 20,
              lineHeight: 1.5,
            }}
          >
            Our menu is refreshing. Please tap the button below to reload.
          </p>
          <button
            onClick={() => {
              // Clear any corrupted caches
              if (typeof caches !== "undefined") {
                caches
                  .keys()
                  .then((names) => names.forEach((n) => caches.delete(n)));
              }
              window.location.reload();
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "12px 32px",
              fontSize: 14,
              fontWeight: 700,
              color: "#fff",
              background: "#c0392b",
              border: "none",
              borderRadius: 12,
              cursor: "pointer",
            }}
          >
            <RefreshCw size={16} />
            <span>Reload Page</span>
          </button>
        </div>
      </body>
    </html>
  );
}
