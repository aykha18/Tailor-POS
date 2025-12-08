class PWAManager {
  constructor() {
    this.swRegistration = null;
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.syncManager = null;
  }

  async init() {
    try {
      await this.registerServiceWorker();
      this.setupInstallPrompt();
      this.setupEventListeners();
      this.checkInstallationStatus();
      
      console.log('PWA Manager: Initialized successfully');
    } catch (error) {
      console.error('PWA Manager: Initialization failed', error);
    }
  }

  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.warn('PWA Manager: Service Worker not supported');
      return;
    }

    // TEMPORARILY DISABLED - Will re-enable after cache issues are resolved
    console.log('PWA Manager: Service Worker registration temporarily disabled');
    return;

    try {
      // Unregister any existing service workers first
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let registration of registrations) {
        await registration.unregister();
        console.log('PWA Manager: Unregistered old service worker:', registration.scope);
      }
      
      this.swRegistration = await navigator.serviceWorker.register('/sw.js?v=1.0.8', {
        scope: '/'
      });

      console.log('PWA Manager: Service Worker registered', this.swRegistration);

      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;
      console.log('PWA Manager: Service Worker is ready');

      // Handle updates
      this.swRegistration.addEventListener('updatefound', () => {
        const newWorker = this.swRegistration.installing;
        console.log('PWA Manager: Service Worker update found');

        newWorker.addEventListener('statechange', () => {
          console.log('PWA Manager: Service Worker state changed to:', newWorker.state);
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            this.showUpdateNotification();
          }
        });
      });

      // Handle controller change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('PWA Manager: Service Worker controller changed');
        // Don't reload if we're in the middle of clearing cache
        if (!window.isClearingCache) {
          window.location.reload();
        } else {
          console.log('PWA Manager: Skipping reload during cache clear');
        }
      });

      // Check for updates periodically
      setInterval(() => {
        this.swRegistration.update();
      }, 60000); // Check every minute

    } catch (error) {
      console.error('PWA Manager: Service Worker registration failed', error);
    }
  }

  async forceUpdateServiceWorker() {
    if (this.swRegistration) {
      console.log('PWA Manager: Forcing service worker update...');
      try {
        await this.swRegistration.update();
        console.log('PWA Manager: Service worker update triggered');
      } catch (error) {
        console.error('PWA Manager: Failed to force update service worker', error);
      }
    }
  }

  // Manual method to re-enable Service Worker after cache issues are resolved
  async reEnableServiceWorker() {
    console.log('PWA Manager: Re-enabling Service Worker...');
    
    // First unregister all existing service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let registration of registrations) {
        await registration.unregister();
        console.log('PWA Manager: Unregistered service worker:', registration.scope);
      }
    }
    
    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (let name of cacheNames) {
        await caches.delete(name);
        console.log('PWA Manager: Deleted cache:', name);
      }
    }
    
    // Now register the new service worker
    try {
      this.swRegistration = await navigator.serviceWorker.register('/sw.js?v=1.0.8', {
        scope: '/'
      });
      console.log('PWA Manager: Service Worker re-enabled successfully');
      return true;
    } catch (error) {
      console.error('PWA Manager: Failed to re-enable Service Worker', error);
      return false;
    }
  }

  setupInstallPrompt() {
    // Check if app is already installed
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      console.log('PWA Manager: App is already running in standalone mode');
      this.isInstalled = true;
      return;
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('PWA Manager: Install prompt triggered');
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallButton();
    });

    window.addEventListener('appinstalled', (e) => {
      console.log('PWA Manager: App installed');
      this.isInstalled = true;
      this.hideInstallButton();
      this.deferredPrompt = null;
    });

    // Debug: Check why install prompt might not be available
    setTimeout(() => {
      this.debugInstallCriteria();
      
      // Show manual install button if no deferred prompt
      if (!this.deferredPrompt && !this.isInstalled) {
        console.log('PWA Manager: No install prompt available, showing manual install button');
        this.showManualInstallButton();
      }
    }, 2000);
  }

  debugInstallCriteria() {
    console.log('PWA Manager: Debugging install criteria...');
    
    // Check if service worker is registered
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      console.log('✅ Service Worker: Active');
    } else {
      console.log('❌ Service Worker: Not active');
    }
    
    // Check if manifest is accessible
    fetch('/static/manifest.json')
      .then(response => response.json())
      .then(manifest => {
        console.log('✅ Manifest: Valid', manifest.name);
        
        // Check required manifest fields
        const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons'];
        const missingFields = requiredFields.filter(field => !manifest[field]);
        
        if (missingFields.length === 0) {
          console.log('✅ Manifest: All required fields present');
        } else {
          console.log('❌ Manifest: Missing fields:', missingFields);
        }
      })
      .catch(error => {
        console.log('❌ Manifest: Not accessible', error);
      });
    
    // Check if running on HTTPS or localhost
    if (location.protocol === 'https:' || location.hostname === 'localhost') {
      console.log('✅ Protocol: HTTPS or localhost');
    } else {
      console.log('❌ Protocol: Not HTTPS (required for PWA)');
    }
    
    // Check if app is already installed
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      console.log('✅ App: Already running in standalone mode');
    } else {
      console.log('ℹ️ App: Not in standalone mode (can be installed)');
    }
  }

  setupEventListeners() {
    // Sync completed event
    window.addEventListener('syncCompleted', (event) => {
      console.log('PWA Manager: Sync completed', event.detail);
      this.showSyncNotification();
    });

    // Online/offline status
    window.addEventListener('online', () => {
      this.showOnlineNotification();
    });

    window.addEventListener('offline', () => {
      this.showOfflineNotification();
    });
  }

  async checkInstallationStatus() {
    // Check multiple indicators of installation
    const isStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    const isMinimalUI = window.matchMedia && window.matchMedia('(display-mode: minimal-ui)').matches;
    const isFullscreen = window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches;
    
    // Check if running as installed app
    if (isStandalone || isMinimalUI || isFullscreen) {
      this.isInstalled = true;
      console.log('PWA Manager: App is running in installed mode');
    }
    
    // Also check if there's a deferred prompt (means installable but not installed)
    if (this.deferredPrompt) {
      this.isInstalled = false;
      console.log('PWA Manager: Install prompt available - app not installed');
    }
  }

  async promptInstall() {
    if (!this.deferredPrompt) {
      console.log('PWA Manager: No install prompt available');
      return false;
    }

    try {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      
      console.log('PWA Manager: Install prompt outcome:', outcome);
      
      this.deferredPrompt = null;
      this.hideInstallButton();
      
      return outcome === 'accepted';
    } catch (error) {
      console.error('PWA Manager: Install prompt failed', error);
      return false;
    }
  }

  showInstallButton() {
    // Create install button if it doesn't exist
    if (!document.getElementById('pwa-install-btn')) {
      const installBtn = document.createElement('button');
      installBtn.id = 'pwa-install-btn';
      installBtn.className = 'fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 hover:bg-blue-700 transition-colors';
      installBtn.innerHTML = `
        <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
        </svg>
        Install App
      `;
      
      installBtn.addEventListener('click', () => this.promptInstall());
      document.body.appendChild(installBtn);
    }
  }

  showManualInstallButton() {
    // Show manual install button even without deferred prompt
    if (!document.getElementById('pwa-manual-install-btn')) {
      const manualInstallBtn = document.createElement('button');
      manualInstallBtn.id = 'pwa-manual-install-btn';
      manualInstallBtn.className = 'fixed bottom-4 left-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 hover:bg-green-700 transition-colors';
      manualInstallBtn.innerHTML = `
        <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
        </svg>
        Add to Home Screen
      `;
      
      manualInstallBtn.addEventListener('click', () => this.showInstallInstructions());
      document.body.appendChild(manualInstallBtn);
    }
  }

  showInstallInstructions() {
    const instructions = document.createElement('div');
    instructions.id = 'pwa-install-instructions';
    instructions.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    instructions.innerHTML = `
      <div class="bg-white p-6 rounded-lg max-w-md mx-4">
        <h3 class="text-lg font-bold mb-4">Install Tajir POS</h3>
        <div class="text-sm text-gray-700 mb-4">
          <p class="mb-2"><strong>Chrome/Edge:</strong></p>
          <p class="mb-2">1. Click the install icon (📱) in the address bar</p>
          <p class="mb-2">2. Or go to Menu → More tools → Create shortcut</p>
          
          <p class="mb-2 mt-4"><strong>Safari (iOS):</strong></p>
          <p class="mb-2">1. Tap the Share button (📤)</p>
          <p class="mb-2">2. Tap "Add to Home Screen"</p>
          
          <p class="mb-2 mt-4"><strong>Firefox:</strong></p>
          <p class="mb-2">1. Click the menu button (☰)</p>
          <p class="mb-2">2. Click "Install App"</p>
        </div>
        <button class="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" onclick="this.parentElement.parentElement.remove()">
          Got it!
        </button>
      </div>
    `;
    
    document.body.appendChild(instructions);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (instructions.parentElement) {
        instructions.remove();
      }
    }, 10000);
  }

  hideInstallButton() {
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) {
      installBtn.remove();
    }
  }

  showUpdateNotification() {
    // Create update notification
    const updateNotification = document.createElement('div');
    updateNotification.id = 'pwa-update-notification';
    updateNotification.className = 'fixed top-4 right-4 bg-yellow-500 text-white px-4 py-3 rounded-lg shadow-lg z-50 max-w-sm';
    updateNotification.innerHTML = `
      <div class="flex items-center">
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span class="flex-1">New version available</span>
        <button class="ml-2 text-white hover:text-gray-200" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
      <button class="mt-2 w-full bg-yellow-600 hover:bg-yellow-700 px-3 py-1 rounded text-sm transition-colors" onclick="window.location.reload()">
        Update Now
      </button>
    `;
    
    document.body.appendChild(updateNotification);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (updateNotification.parentElement) {
        updateNotification.remove();
      }
    }, 10000);
  }

  showSyncNotification() {
    this.showToast('Data synchronized successfully', 'success');
  }

  showOnlineNotification() {
    this.showToast('Connection restored', 'success');
  }

  showOfflineNotification() {
    this.showToast('Working offline', 'warning');
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 max-w-sm transition-all duration-300 transform translate-x-full`;
    
    const colors = {
      success: 'bg-green-500 text-white',
      warning: 'bg-yellow-500 text-white',
      error: 'bg-red-500 text-white',
      info: 'bg-blue-500 text-white'
    };
    
    toast.className += ` ${colors[type] || colors.info}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
      toast.classList.remove('translate-x-full');
    }, 100);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      toast.classList.add('translate-x-full');
      setTimeout(() => {
        if (toast.parentElement) {
          toast.remove();
        }
      }, 300);
    }, 3000);
  }

  async getPWAStatus() {
    const status = {
      isInstalled: this.isInstalled,
      isOnline: navigator.onLine,
      hasServiceWorker: 'serviceWorker' in navigator,
      hasPushSupport: 'PushManager' in window,
      hasBackgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
      displayMode: this.getDisplayMode()
    };

    if (this.syncManager) {
      const syncStatus = await this.syncManager.getSyncStatus();
      Object.assign(status, syncStatus);
    }

    return status;
  }

  getDisplayMode() {
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      return 'standalone';
    } else if (window.matchMedia && window.matchMedia('(display-mode: minimal-ui)').matches) {
      return 'minimal-ui';
    } else if (window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches) {
      return 'fullscreen';
    } else {
      return 'browser';
    }
  }

  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      console.warn('PWA Manager: Notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      console.warn('PWA Manager: Notification permission denied');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('PWA Manager: Failed to request notification permission', error);
      return false;
    }
  }

  async showNotification(title, options = {}) {
    if (!('Notification' in window)) {
      console.warn('PWA Manager: Notifications not supported');
      return false;
    }

    // Request permission if not granted
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('PWA Manager: Notification permission denied');
        return false;
      }
    }

    if (Notification.permission !== 'granted') {
      console.warn('PWA Manager: No notification permission');
      return false;
    }

    const defaultOptions = {
      icon: '/static/icons/icon-192.png',
      badge: '/static/icons/icon-72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now()
      }
    };

    const notificationOptions = { ...defaultOptions, ...options };

    try {
      const notification = new Notification(title, notificationOptions);
      
      notification.addEventListener('click', () => {
        window.focus();
        notification.close();
      });

      return true;
    } catch (error) {
      console.error('PWA Manager: Failed to show notification', error);
      return false;
    }
  }

  setSyncManager(syncManager) {
    this.syncManager = syncManager;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PWAManager;
} 

// Global function to re-enable Service Worker (call from browser console)
window.reEnableServiceWorker = async function() {
  if (window.pwaManager) {
    return await window.pwaManager.reEnableServiceWorker();
  } else {
    console.error('PWA Manager not initialized');
    return false;
  }
};

// Global function to check Service Worker status
window.checkServiceWorkerStatus = function() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      console.log('Current Service Worker registrations:', registrations);
      registrations.forEach(reg => {
        console.log('Scope:', reg.scope, 'Active:', reg.active, 'Installing:', reg.installing, 'Waiting:', reg.waiting);
      });
    });
  } else {
    console.log('Service Worker not supported');
  }
}; 