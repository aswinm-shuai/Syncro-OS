const CACHE_NAME = 'syncro-static-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/layout.css',
  '/css/dashboard.css',
  '/css/table.css',
  '/css/modal.css',
  '/css/forms.css',
  '/js/app.js',
  '/js/dashboard.js',
  '/js/products.js',
  '/js/inventory.js',
  '/js/hpp.js',
  '/js/orders.js',
  '/js/purchases.js',
  '/js/reports.js',
  '/js/customers.js',
  '/js/settings.js',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Catch errors silently if some assets are missing
      return cache.addAll(STATIC_ASSETS).catch(err => console.warn('Cache error:', err));
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Jangan cache API, Firestore, Firebase Auth, Analytics, dll
  if (
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('cloudinary.com') ||
    url.hostname.includes('gstatic.com') ||
    url.protocol.startsWith('chrome-extension')
  ) {
    return; // biarkan browser handle secara default (network only)
  }

  // Hanya proses metode GET
  if (event.request.method !== 'GET') return;

  // Cache-first strategy untuk file statis
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse; // Return dari cache jika ada
        }
        // Fetch dari network jika tidak ada di cache
        return fetch(event.request).then((networkResponse) => {
          // Validasi response sebelum cache (hanya HTTP 200 dan type basic)
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          
          return networkResponse;
        }).catch(() => {
          // Optional: Handle offline fallback here
        });
      })
    );
  }
});
