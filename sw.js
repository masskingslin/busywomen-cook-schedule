// Bumping CACHE_NAME invalidates old caches on next visit — do this whenever
// core files change.
const CACHE_NAME = "busywomen-cook-v22";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./css/fonts.css",
  "./js/data.js",
  "./js/recipes.js",
  "./js/app.js",
  "./manifest.json",
  "./robots.txt",
  "./sitemap.xml",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./fonts/plus-jakarta-sans-latin-400-normal.woff2",
  "./fonts/plus-jakarta-sans-latin-500-normal.woff2",
  "./fonts/plus-jakarta-sans-latin-600-normal.woff2",
  "./fonts/plus-jakarta-sans-latin-700-normal.woff2",
  "./fonts/playfair-display-latin-600-normal.woff2",
  "./fonts/playfair-display-latin-400-italic.woff2"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for everything, falling back to the cache when offline, so
// installed users always get the latest JS/CSS/data when they have a connection.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      return response;
    }).catch(() =>
      caches.match(request).then((cached) => cached || (request.mode === "navigate" ? caches.match("./index.html") : undefined))
    )
  );
});
