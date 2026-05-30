const CACHE_NAME = 'mansoori-v1';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './database.js',
  './manifest.json'
];

// Install Service Worker and cache core shell assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Intercept fetch requests for lightning-fast loading
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request);
    })
  );
});