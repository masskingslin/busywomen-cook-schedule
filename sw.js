// Minimal service worker: just enough to make the app installable (a
// required condition for the browser's install prompt) and to let it open
// offline after the first visit. It does not try to be a full offline cache
// strategy for every asset — that's a reasonable next step, not required
// for "Install App" to work.
const CACHE_NAME = 'busywomen-cook-schedule-v3';
const CORE_ASSETS = [
  './',
  './index.html',
  './css/styles.css?v=3',
  './js/data.js?v=3',
  './js/app.js?v=3',
  './manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => cached);
    })
  );
});
