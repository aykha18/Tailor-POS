const CACHE_NAME = 'tajir-pos-v1.0.1';
const STATIC_CACHE = 'tajir-static-v1.0.1';
const DYNAMIC_CACHE = 'tajir-dynamic-v1.0.1';

const STATIC_ASSETS = [
  '/',
  '/app',
  '/static/css/main.css',
  '/static/css/animations.css',
  '/static/css/mobile-enhancements.css',
  '/static/js/app.js',
  '/static/js/modules/billing-system.js',
  '/static/js/modules/customers.js',
  '/static/js/modules/products.js',
  '/static/js/modules/employees.js',
  '/static/js/modules/reports.js',
  '/static/js/modules/dashboard.js',
  '/static/js/modules/shop-settings.js',
  '/static/js/modules/vat.js',
  '/static/js/modules/plan-management.js',
  '/static/js/modules/product-types.js',
  '/static/js/modules/expenses.js',
  '/static/js/modules/mobile-navigation.js',
  '/templates/app.html',
  '/templates/expenses.html',
  '/static/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Service Worker: Caching static assets');
        // Cache assets one by one to handle missing files gracefully
        const cachePromises = STATIC_ASSETS.map(url => {
          return cache.add(url).catch(error => {
            console.warn('Service Worker: Failed to cache', url, error);
            // Continue with other assets even if one fails
            return Promise.resolve();
          });
        });
        return Promise.all(cachePromises);
      })
      .then(() => {
        console.log('Service Worker: Installation completed');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Installation failed', error);
        // Still try to skip waiting even if caching fails
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activation completed');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // API calls - network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Clone the response before using it
          const responseClone = response.clone();
          
          // Cache successful API responses
          if (response.ok) {
            caches.open(DYNAMIC_CACHE)
              .then(cache => cache.put(request, responseClone))
              .catch(error => {
                console.error('Service Worker: Failed to cache API response', error);
              });
          }
          
          return response;
        })
        .catch(error => {
          console.log('Service Worker: API fetch failed, serving from cache', request.url, error);
          return caches.match(request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Return a basic error response if no cache available
              return new Response('Network error', { status: 503, statusText: 'Service Unavailable' });
            });
        })
    );
    return;
  }
  
  // Route-based requests (like /expenses, /app) - network first, no caching
  if (url.pathname === '/expenses' || url.pathname === '/app' || url.pathname === '/') {
    event.respondWith(
      fetch(request)
        .catch(error => {
          console.error('Service Worker: Route fetch failed', request.url, error);
          // For routes, try to serve from cache as fallback
          return caches.match(request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Return a basic error response if no cache available
              return new Response('Network error', { status: 503, statusText: 'Service Unavailable' });
            });
        })
    );
    return;
  }
  
  // Static assets - cache first, network fallback
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          console.log('Service Worker: Serving from cache', request.url);
          return response;
        }
        
        console.log('Service Worker: Fetching from network', request.url);
        return fetch(request)
          .then(response => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response before caching
            const responseToCache = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then(cache => cache.put(request, responseToCache))
              .catch(error => {
                console.error('Service Worker: Failed to cache static asset', error);
              });
            
            return response;
          })
          .catch(error => {
            console.error('Service Worker: Fetch failed for static asset', request.url, error);
            // Return a basic error response
            return new Response('Network error', { status: 503, statusText: 'Service Unavailable' });
          });
      })
      .catch(error => {
        console.error('Service Worker: Cache match failed', request.url, error);
        // Return a basic error response
        return new Response('Cache error', { status: 503, statusText: 'Service Unavailable' });
      })
  );
});

// Background sync for offline data
self.addEventListener('sync', event => {
  console.log('Service Worker: Background sync triggered', event.tag);
  
  if (event.tag === 'sync-pending-data') {
    event.waitUntil(syncPendingData());
  }
});

// Push notification handling
self.addEventListener('push', event => {
  console.log('Service Worker: Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New notification from Tajir POS',
    icon: '/static/icons/icon-192.png',
    badge: '/static/icons/icon-72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View',
        icon: '/static/icons/icon-192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/static/icons/icon-192.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Tajir POS', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/app')
    );
  }
});

// Helper function to sync pending data
async function syncPendingData() {
  try {
    // This will be implemented with IndexedDB integration
    console.log('Service Worker: Syncing pending data...');
    
    // Get all clients
    const clients = await self.clients.matchAll();
    
    // Notify clients about sync
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETED',
        timestamp: Date.now()
      });
    });
  } catch (error) {
    console.error('Service Worker: Sync failed', error);
  }
}

// Message handling from main thread
self.addEventListener('message', event => {
  console.log('Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      version: CACHE_NAME,
      timestamp: Date.now()
    });
  }
}); 