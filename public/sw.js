const CACHE_NAME = "aa-calculators-v3";

// Every calculator route, precached on install so the whole section works
// offline after the very first visit — without this, a page only became
// available offline after being fully loaded twice (once to register the
// worker, once more for the fetch handler to actually cache it).
const CALCULATOR_ROUTES = [
  "/calculators",
  "/calculators/airflow-conversion",
  "/calculators/corrosion-rate",
  "/calculators/hazard-level-quick",
  "/calculators/hydrostatic-test-pressure",
  "/calculators/mawp",
  "/calculators/minimum-wall-thickness",
  "/calculators/motor-electrical",
  "/calculators/pressure-conversion",
  "/calculators/pressure-equipment-hazard-level",
  "/calculators/pressure-vessel-volume",
  "/calculators/pv-value",
  "/calculators/solenoid-resistance",
  "/calculators/srv-set-pressure-verification",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const assetUrls = new Set();

      // Precache each page's HTML, and scrape its <script src> / <link
      // href> tags for the /_next/static chunks it needs — caching only
      // the HTML left pages that were never actually opened in a browser
      // with their markup present but no JS, since nothing had ever
      // requested (and thus cached) their page-specific chunk.
      await Promise.all(
        CALCULATOR_ROUTES.map(async (path) => {
          try {
            const response = await fetch(new Request(path, { headers: { Accept: "text/html" } }));
            const html = await response.clone().text();
            await cache.put(path, response);
            for (const match of html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)) {
              assetUrls.add(match[1]);
            }
          } catch {
            // Best-effort — one route failing to precache shouldn't stop
            // the rest from being cached.
          }
        })
      );

      await Promise.all(
        Array.from(assetUrls).map((url) =>
          fetch(url)
            .then((response) => cache.put(url, response))
            .catch(() => {})
        )
      );
    })
  );
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

  // Calculator pages: only handle real navigations (typing the URL,
  // reload, the installed icon). Next.js's client-side router fetches an
  // RSC payload — a different format — for in-app link clicks; caching
  // that under the same URL would later serve the wrong content to a
  // fresh navigation, so leave those to the network/router entirely.
  if (request.mode !== "navigate") return;

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
