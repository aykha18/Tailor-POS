// PWA Initialization - TEMPORARILY DISABLED
console.log('PWA initialization temporarily disabled');

// Comment out all PWA functionality
/*
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Initialize PWA Manager
    if (typeof PWAManager !== 'undefined') {
      window.pwaManager = new PWAManager();
      await window.pwaManager.init();
    }

    // Initialize Sync Manager
    if (typeof SyncManager !== 'undefined') {
      window.syncManager = new SyncManager();
      await window.syncManager.init();
      
      // Connect sync manager to PWA manager
      if (window.pwaManager) {
        window.pwaManager.setSyncManager(window.syncManager);
      }
    }

    console.log('PWA initialization completed');
  } catch (error) {
    console.error('PWA initialization failed:', error);
  }
});
*/ 