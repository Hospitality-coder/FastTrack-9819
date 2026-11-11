/* FastTrack service worker — app shell cache, network-first for navigation, never caches /api. */
const VERSION = "fasttrack-v1";
const SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/favicon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Navigations: network first, fall back to cached shell when offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((cache) => cache.put("/", copy)).catch(() => undefined);
          return res;
        })
        .catch(() => caches.match("/")),
    );
    return;
  }

  // Static assets: stale-while-revalidate.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok && (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/fonts/") || url.pathname.startsWith("/images/"))) {
            const copy = res.clone();
            caches.open(VERSION).then((cache) => cache.put(req, copy)).catch(() => undefined);
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
