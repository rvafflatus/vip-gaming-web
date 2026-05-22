const CACHE_NAME = 'vehicle-bazaar-v2'; // Upgraded cache version
const ASSETS = [
  './index.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// 1. Install Event: Cache essential shell UI resources instantly
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 PWA Offline Assets Cached Successfully');
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting()) // Forces immediate activation
  );
});

// 2. Activate Event: Clean up legacy caches so data never glitches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('🗑️ Clearing old cache version:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event Interceptor: Network-First Strategy for Live Supabase Data Sync
self.addEventListener('fetch', (e) => {
  // Let the browser handle standard Supabase POST/INSERT calls normally 
  if (e.request.method !== 'GET') {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // If network request is successful, clone and update cache dynamically
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // If network goes offline (e.g., weak signal), serve cached fallback UI shell
        return caches.match(e.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fallback handle for missing image files when disconnected
          if (e.request.headers.get('accept').includes('image')) {
            return new Response('<svg role="img" aria-label="Offline" xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%23ccc" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>', { headers: { 'Content-Type': 'image/svg+xml' } });
          }
        });
      })
  );
});