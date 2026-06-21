const CACHE_NAME = 'syncro-os-cache-v1';
const urlsToCache = [
  '/Syncro-OS/',
  '/Syncro-OS/index.html',
  '/Syncro-OS/apps/admin-dashboard/index.html',
  '/Syncro-OS/apps/admin-dashboard/manifest.json',
  '/Syncro-OS/apps/admin-dashboard/css/style.css',
  '/Syncro-OS/apps/admin-dashboard/js/app.js',
  '/Syncro-OS/apps/admin-dashboard/assets/icons/icon-192.png',
  '/Syncro-OS/apps/admin-dashboard/assets/icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
