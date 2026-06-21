const CACHE_NAME = 'syncro-os-cache-v1.0.1';
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
  // Bypassing Firebase/Firestore requests from cache
  if (event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('firebase')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        // Fallback to network
        return fetch(event.request).catch(() => {
          // You could return an offline page here if needed
        });
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

// --- PWA Modern Features ---

// 1. Background Sync API
self.addEventListener('sync', event => {
  if (event.tag === 'syncro-data-sync') {
    event.waitUntil(
      // Implement logic to sync data to Firebase when online
      new Promise(resolve => {
        console.log('[Service Worker] Background Sync: Syncing offline data...');
        // Notify clients to perform sync or trigger sync logic here
        self.clients.matchAll().then(clients => {
          clients.forEach(client => client.postMessage({ type: 'BACKGROUND_SYNC' }));
        });
        resolve();
      })
    );
  }
});

// 2. Periodic Background Sync
self.addEventListener('periodicSync', event => {
  if (event.tag === 'syncro-periodic-sync') {
    event.waitUntil(
      new Promise(resolve => {
        console.log('[Service Worker] Periodic Sync: Refreshing data in background...');
        self.clients.matchAll().then(clients => {
          clients.forEach(client => client.postMessage({ type: 'PERIODIC_SYNC' }));
        });
        resolve();
      })
    );
  }
});

// 3. Web Push Notifications
self.addEventListener('push', event => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch(e) {
      payload = { title: 'Syncro OS', body: event.data.text() };
    }
  } else {
    payload = { title: 'Syncro OS', body: 'Ada pembaruan baru!' };
  }

  const options = {
    body: payload.body,
    icon: '/Syncro-OS/apps/admin-dashboard/assets/icons/icon-192-maskable.png',
    badge: '/Syncro-OS/apps/admin-dashboard/assets/icons/icon-192-maskable.png',
    data: payload.url || '/Syncro-OS/'
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      // If a window is already open, focus it
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === event.notification.data && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data);
      }
    })
  );
});
