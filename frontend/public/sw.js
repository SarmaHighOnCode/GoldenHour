// GoldenHour service worker — minimal offline app shell.
// Bump CACHE when the shell changes to evict the old one on activate.
const CACHE = 'goldenhour-v1';
const SHELL = ['/', '/index.html', '/favicon.svg', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Never touch non-GET (API writes) or cross-origin requests (backend API, fonts).
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  // Navigations: network-first so a fresh deploy is picked up; fall back to the
  // cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/index.html')));
    return;
  }

  // Same-origin static assets (content-hashed by Vite): cache-first.
  event.respondWith(caches.match(request).then((hit) => hit || fetch(request)));
});
