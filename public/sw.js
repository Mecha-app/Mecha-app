/**
 * MECHA service worker (PWA install pass, 2026-11-20).
 *
 * ONE job: make the site installable (Add to Home Screen) and keep
 * the install assets themselves fast. It is deliberately ALMOST
 * inert:
 *
 *   - It answers ONLY the static install assets listed below,
 *     cache-first (they are versioned by deploy and tiny).
 *   - Every other request — every page, every /api call, every
 *     auth/session route, every diagnosis stream — is left
 *     COMPLETELY alone: no respondWith, no cache, the browser's
 *     default network path runs exactly as if no worker existed.
 *
 * There is no offline mode and no page cache by design: a stale
 * diagnosis flow is worse than no worker at all. If the static
 * list ever grows, keep it to immutable brand assets only.
 */
const CACHE = "mecha-static-v1";
const STATIC_URLS = [
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/apple-touch-icon.png",
  "/favicon.svg",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(STATIC_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Anything that is not a listed static asset falls through to
  // the network untouched — /api, auth, pages, all of it.
  if (!STATIC_URLS.includes(url.pathname)) return;
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        }),
    ),
  );
});
