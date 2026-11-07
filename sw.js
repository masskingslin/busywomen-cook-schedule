// Minimal service worker: just enough to make the app installable (a
// required condition for the browser's install prompt) and to let it open
// offline after the first visit. It does not try to be a full offline cache
// strategy for every asset — that's a reasonable next step, not required
// for "Install App" to work.
const CACHE_NAME = 'busywomen-cook-schedule-v5';
const CORE_ASSETS = [
  './',
  './index.html',
  './css/styles.css?v=5',
  './js/i18n.js?v=1',
  './js/data.js?v=5',
  './js/app.js?v=5',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
  // No self.skipWaiting() here on purpose: a tab with the old app.js still
  // running shouldn't suddenly have its network requests intercepted by a
  // new worker mid-session. The new worker sits in "waiting" until the page
  // explicitly asks for it (see the SKIP_WAITING message handler below),
  // which app.js triggers only after the person taps an "update available"
  // prompt.
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
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
