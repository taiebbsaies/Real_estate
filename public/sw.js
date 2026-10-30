const CACHE_NAME = "homecheck-cache-v5";
const STATIC_ASSETS = [
  "/",
  "/login",
  "/signup",
  "/offline",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/icon-192x192-maskable.png",
  "/icons/icon-512x512-maskable.png",
  "/icons/apple-touch-icon.png",
];

// Install Event - Pre-cache core shell (tolerant : un échec unique n'empêche pas l'installation)
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.all([
          ...STATIC_ASSETS.map((asset) =>
            cache.add(new Request(asset, { cache: "reload" })).catch((error) => {
              console.warn("[SW] Precache failed for", asset, error);
            }),
          ),
          precacheOfflineAssets(cache),
        ]),
      )
      .then(() => self.skipWaiting())
  );
});

// Précache les chunks /_next/static (CSS/JS hashés) référencés par /offline
// pour que la page de fallback soit complète dès la première visite.
async function precacheOfflineAssets(cache) {
  try {
    const response = await fetch("/offline", { cache: "reload" });
    if (!response.ok) return;
    const html = await response.text();
    const assetUrls = [
      ...new Set(
        Array.from(html.matchAll(/\/_next\/static\/[^"'\\\s)]+/g), (match) => match[0]),
      ),
    ];
    await Promise.all(
      assetUrls.map((url) =>
        cache.add(new Request(url, { cache: "reload" })).catch((error) => {
          console.warn("[SW] Precache failed for", url, error);
        }),
      ),
    );
  } catch (error) {
    console.warn("[SW] Unable to precache /offline assets", error);
  }
}

// Activate Event - Clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Allow a controlled page to trigger activation of a waiting worker
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isCacheable(response) {
  return response !== undefined && response.status === 200 && response.type === "basic";
}

// Navigations HTML : network-first, fallback cache, puis /offline en dernier recours
async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (isCacheable(response)) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (await caches.match(request)) || caches.match("/offline");
  }
}

// Appels API : network-first, fallback cache, puis erreur JSON contrôlée (jamais de crash)
async function networkFirstApi(request) {
  try {
    const response = await fetch(request);
    if (isCacheable(response)) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response(
      JSON.stringify({
        error: "OFFLINE",
        message: "Données indisponibles hors ligne.",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

// Assets statiques immuables (chunks hashés, polices, icônes, images) : cache-first
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  try {
    const response = await fetch(request);
    if (isCacheable(response)) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return Response.error();
  }
}

// Fetch Event
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Navigations (requêtes HTML)
  if (event.request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(event.request));
    return;
  }

  // Appels API
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirstApi(event.request));
    return;
  }

  // Assets statiques et médias
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image") ||
    url.pathname.startsWith("/icons/") ||
    /\.(svg|png|jpe?g|gif|webp|avif|ico|woff2?)$/i.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Le reste (payloads RSC des navigations client, etc.) n'est pas intercepté :
  // en cas d'échec réseau, le router Next.js retombe sur une navigation complète,
  // prise en charge par la stratégie navigate ci-dessus (cache puis /offline).
});
