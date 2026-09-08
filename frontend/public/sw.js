const CACHE_NAME = "surya-dineos-v3";
const STATIC_ASSETS = [
  "/",
  "/logo.png",
  "/manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => console.log("Cache addAll error:", err));
    })
  );
  // Immediately take control — don't wait for old SW to finish
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  // Claim all clients immediately so the new SW serves right away
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Pass through non-GET, API, and WebSocket requests to network
  if (event.request.method !== "GET" || url.pathname.startsWith("/api/") || url.pathname.startsWith("/ws")) {
    return;
  }

  // ── NETWORK-FIRST for HTML page navigations ───────────────────────
  // This ensures customers ALWAYS get the latest deployed version.
  // Only falls back to cache if the device is truly offline.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // Cache the fresh response for offline fallback
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return networkResponse;
        })
        .catch(() => {
          // Offline: try cache, otherwise return cached homepage
          return caches.match(event.request).then((cached) => cached || caches.match("/"));
        })
    );
    return;
  }

  // ── CACHE-FIRST for static assets (JS, CSS, images, fonts) ────────
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Asset not available offline — nothing to do
        return new Response("", { status: 408 });
      });
    })
  );
});
