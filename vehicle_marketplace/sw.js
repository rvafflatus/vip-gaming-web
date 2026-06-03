const CACHE_NAME = 'mansoori-v3'; 
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './database.js',
  './manifest.json'
];

// 1. Install Service Worker and cache core shell assets safely
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting(); // Forces the waiting service worker to activate immediately
});

// 2. Activate event: Clears out all older versions of the cache automatically
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim(); // Immediately takes control of open tabs
});

// 3. Network-First Strategy: Always fetch real-time data first. If offline, use cache.
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request).catch(() => {
      return caches.match(e.request);
    })
  );
});