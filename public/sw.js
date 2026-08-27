// Minimalist Service Worker for iNoU PWA
const CACHE_NAME = 'inou-mobile-v0.4.76';
const ASSETS = [
  '/m',
  '/mobile.html',
  '/mobile.css',
  '/mobile.js',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Pass through SSE and API endpoints directly to network
  if (e.request.url.includes('/api/') || e.request.url.includes('/events')) {
    return;
  }
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});
