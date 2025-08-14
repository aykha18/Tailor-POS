// Clear Service Worker Cache Script
// Run this in the browser console to clear service worker cache

console.log('🧹 Clearing Service Worker Cache...');

// Clear all caches
caches.keys().then(cacheNames => {
  return Promise.all(
    cacheNames.map(cacheName => {
      console.log('🗑️ Deleting cache:', cacheName);
      return caches.delete(cacheName);
    })
  );
}).then(() => {
  console.log('✅ All caches cleared');
  
  // Unregister service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        console.log('🔄 Unregistering service worker:', registration);
        registration.unregister();
      });
    }).then(() => {
      console.log('✅ Service worker unregistered');
      console.log('🔄 Please refresh the page to re-register the service worker');
    });
  }
}).catch(error => {
  console.error('❌ Error clearing cache:', error);
});
