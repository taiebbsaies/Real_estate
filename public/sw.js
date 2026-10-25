const CACHE_NAME = "homecheck-static-v3";
const OFFLINE_URL = "/offline.html";

// Only public, non-personalised assets are pre-cached. Authenticated pages
// (dashboard, profile, budget) are deliberately never stored in the cache.
const STATIC_ASSETS = [
  OFFLINE_URL,
  "/manifest.json",
  "/icons/icon-192x192.svg",
  "/icons/icon-512x512.svg",
];

// Install Event - pre-cache the public shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(
        STATIC_ASSETS.map(async (asset) => {
          try {
            await cache.add(asset);
          } catch {
            // A single missing asset must not block service worker install.
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

// Activate Event - remove caches from older versions, including the previous
// v2 cache that stored authenticated complaint pages.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(?:svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|css|js)$/i.test(
      url.pathname,
    )
  );
}

async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) return cachedResponse;

  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}

// Fetch Event
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations are network-only. On failure, show the public offline page
  // instead of a cached authenticated page from another session.
  if (event.request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(event.request);
        } catch {
          const offlineResponse = await caches.match(OFFLINE_URL);
          if (offlineResponse) return offlineResponse;

          return new Response(
            "<!doctype html><html lang='fr'><meta charset='utf-8'><title>Hors ligne</title><body style='font-family:sans-serif;padding:32px'><h1>Hors ligne</h1><p>Réessayez lorsque la connexion sera revenue.</p></body></html>",
            {
              status: 503,
              headers: { "Content-Type": "text/html; charset=utf-8" },
            },
          );
        }
      })(),
    );
    return;
  }

  // Public static assets can be served from cache.
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(event.request));
  }
});

// Message Event - allow a waiting worker to take over immediately
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
