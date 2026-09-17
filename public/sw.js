// Minimal offline-first service worker.
// - Large immutable media (the Earth video + poster): cache-first
// - Map tiles (OSM/Esri): cache-first, filled in ahead of time by
//   src/lib/offlineMaps.js, but also opportunistically cached here as
//   the user pans around normally
// - Navigations and everything else (live alert data): network-first,
//   falling back to cache so the page still shows the LAST data it saw
//   rather than pretending it's live.
//
// Why navigations are NOT cache-first any more:
// the previous version answered every navigation from the cache
// permanently, so index.html — and therefore the hashed JS/CSS bundle
// filenames it points at — froze on whatever was cached at the very
// first visit. Any subsequent fix to the app (for example the
// background/stacking fix in index.css) would be invisible on a
// machine that had already loaded the site once, which reads as "the
// fix didn't work" when in fact the browser never fetched it. Bump
// CACHE_VERSION whenever shell assets change.
const CACHE_VERSION = "v2";
const SHELL_CACHE = `app-shell-${CACHE_VERSION}`;
const TILE_CACHE = `map-tiles-${CACHE_VERSION}`;
const TILE_HOSTS = ["tile.openstreetmap.org", "server.arcgisonline.com"];

// Only genuinely immutable, expensive assets belong here. index.html is
// deliberately absent so it is always revalidated against the network.
const MEDIA_ASSETS = [
  "/videos/earth-bg.mp4",
  "/videos/earth-bg.webm",
  "/videos/earth-bg-poster.jpg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(MEDIA_ASSETS))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Drop every cache from an older CACHE_VERSION, otherwise stale shell
  // entries survive forever and keep shipping the previous build.
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== TILE_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Map tiles: cache-first (tiles are immutable for our purposes)
  if (TILE_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.open(TILE_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const res = await fetch(event.request);
          if (res.ok) cache.put(event.request, res.clone());
          return res;
        } catch {
          return cached || Response.error();
        }
      })
    );
    return;
  }

  // Big immutable media: cache-first, so the Earth video doesn't get
  // re-downloaded (5 MB) on every visit.
  if (MEDIA_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
    return;
  }

  // Navigations: network-first so a new build is always picked up, with
  // a cache fallback so the app still opens offline.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(event.request, clone));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          return cached || caches.match("/index.html");
        })
    );
    return;
  }

  // Everything else: network-first, cache fallback.
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(SHELL_CACHE).then((c) => c.put(event.request, clone));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});

// Allows a "call" from a live incoming push, wired up in alertSystem.js
self.addEventListener("push", (event) => {
  const data = event.data
    ? event.data.json()
    : { title: "Rakshak Alert", body: "New alert issued." };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/assets/logo.svg",
      vibrate: [200, 100, 200, 100, 200],
      requireInteraction: true,
    })
  );
});
