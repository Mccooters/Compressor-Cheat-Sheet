const CACHE_NAME = "aa-calculators-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.add("/calculators")));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Only ever handle calculator pages and their static assets — never
  // intercept anything else, so this can't accidentally serve cached
  // content for sign-in-gated pages or API routes.
  const isCalculatorRoute = url.pathname.startsWith("/calculators");
  const isStaticAsset =
    url.pathname.startsWith("/_next/static") ||
    url.pathname.startsWith("/icon-") ||
    url.pathname === "/apple-touch-icon.png";
  if (url.origin !== self.location.origin || !(isCalculatorRoute || isStaticAsset)) {
    return;
  }

  if (isStaticAsset) {
    // Content-hashed filenames, immutable per build — cache-first is safe.
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            // waitUntil keeps the worker alive until the cache write
            // finishes — without it the browser can tear the worker down
            // right after respondWith resolves, before cache.put() lands.
            event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)));
            return response;
          })
      )
    );
    return;
  }

  // Calculator pages: network-first so a new deploy is picked up
  // immediately when online, falling back to the last cached copy offline.
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)));
        return response;
      })
      .catch(() => caches.match(request))
  );
});
