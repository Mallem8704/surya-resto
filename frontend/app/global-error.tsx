"use client";

import React from "react";

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
          <div style={{ fontSize: 48, marginBottom: 12 }}>🍽️</div>
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
            🔄 Reload Page
          </button>
        </div>
      </body>
    </html>
  );
}
