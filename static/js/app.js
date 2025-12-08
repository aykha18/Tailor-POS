// Main Application JavaScript
// Global log silencer for production
(() => {
  try {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const isProd = /railway|tajirtech|tajir\.up\.railway\.app|up\.railway\.app/i.test(hostname);
    if (isProd && typeof console !== 'undefined') {
      const originalError = console.error ? console.error.bind(console) : () => {};
      // Silence noisy logs in production, keep errors
      console.log = () => {};
      console.info = () => {};
      console.debug = () => {};
      console.warn = () => {};
      console.error = originalError;
    }
  } catch (_) {
    // fail safe: do nothing
  }
})();

document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 DOM Content Loaded');
  console.log('📦 Available modules:', {
    loadProductTypes: typeof window.loadProductTypes,
    setupProductTypeFormHandler: typeof window.setupProductTypeFormHandler,
    setupProductTypeListHandlers: typeof window.setupProductTypeListHandlers
  });
  
  // Reset cache clearing flag on page load
  window.isClearingCache = false;
  
  // Safe lucide icon creation with fallback
  try {
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    } else {
      console.warn('Lucide library not available, using fallback icons');
    }
  } catch (lucideError) {
    console.warn('Error creating lucide icons:', lucideError);
  }
  
  // Custom confirmation dialog function
  window.showConfirmDialog = function(message) {
    return new Promise((resolve) => {
      // Create modal overlay
      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      overlay.id = 'confirmDialogOverlay';
      
      // Create dialog
      const dialog = document.createElement('div');
      dialog.className = 'bg-neutral-800 border border-neutral-700 rounded-lg p-6 max-w-md mx-4 shadow-xl';
      
      // Create content
      dialog.innerHTML = `
        <div class="flex items-start mb-4">
          <div class="flex-shrink-0">
            <svg class="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
          <div class="ml-3 flex-1">
            <h3 class="text-lg font-medium text-white">Confirm Action</h3>
            <p class="mt-2 text-sm text-neutral-300">${message}</p>
          </div>
        </div>
        <div class="flex justify-end space-x-3">
          <button id="confirmCancel" class="px-4 py-2 text-sm font-medium text-neutral-300 bg-neutral-700 border border-neutral-600 rounded-md hover:bg-neutral-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            Cancel
          </button>
          <button id="confirmOk" class="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
            OK
          </button>
        </div>
      `;
      
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);
      
      // Add event listeners
      const okBtn = document.getElementById('confirmOk');
      const cancelBtn = document.getElementById('confirmCancel');
      
      const cleanup = () => {
        document.body.removeChild(overlay);
      };
      
      okBtn.addEventListener('click', () => {
        cleanup();
        resolve(true);
      });
      
      cancelBtn.addEventListener('click', () => {
        cleanup();
        resolve(false);
      });
      
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          cleanup();
          resolve(false);
        }
      });
      
      // Focus on OK button for keyboard navigation
      okBtn.focus();
      
      // Handle Escape key
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          cleanup();
          resolve(false);
          document.removeEventListener('keydown', handleEscape);
        }
      };
      document.addEventListener('keydown', handleEscape);
    });
  };
  
  // Initialize plan management
  initializePlanManagement();

  // Initialize cache clearing functionality
  initializeCacheClearing();

  // Product Tab Switching Function
  window.switchProductTab = function(tab) {
    console.log('🔄 Switching to product tab:', tab);
    // Update tab button states
    const typesTab = document.getElementById('productTypesTab');
    const productsTab = document.getElementById('productsTab');
    const typesContent = document.getElementById('productTypesContent');
    const productsContent = document.getElementById('productsContent');
    
    if (!typesTab || !productsTab || !typesContent || !productsContent) {
      console.error('❌ Product tab elements not found');
      return;
    }
    
    if (tab === 'types') {
      // Show Product Types tab
      typesTab.classList.add('active', 'text-white', 'border-indigo-500');
      typesTab.classList.remove('text-neutral-400', 'border-transparent');
      productsTab.classList.remove('active', 'text-white', 'border-indigo-500');
      productsTab.classList.add('text-neutral-400', 'border-transparent');
      
      typesContent.classList.remove('hidden');
      productsContent.classList.add('hidden');
      
      // Load product types if not already loaded
      if (window.loadProductTypes) {
        console.log('📦 Loading product types...');
        loadProductTypes();
      } else {
        console.warn('⚠️ loadProductTypes function not available');
      }
    } else if (tab === 'products') {
      // Show Products tab
      productsTab.classList.add('active', 'text-white', 'border-indigo-500');
      productsTab.classList.remove('text-neutral-400', 'border-transparent');
      typesTab.classList.remove('active', 'text-white', 'border-indigo-500');
      typesTab.classList.add('text-neutral-400', 'border-transparent');
      
      productsContent.classList.remove('hidden');
      typesContent.classList.add('hidden');
      
      // Load products if not already loaded
      if (window.loadProducts) {
        console.log('📦 Loading products...');
        loadProducts();
      } else {
        console.warn('⚠️ loadProducts function not available');
      }
    }
  };

  // Shop Settings Tab Switching Function (VAT optional)
  window.switchShopSettingsTab = function(tab) {

    // Collect available tab buttons
    const shopInfoTab = document.getElementById('tabShopInfo');
    const billingConfigTab = document.getElementById('tabBillingConfig');
    const vatTab = document.getElementById('tabVAT'); // optional

    // Collect available content containers
    const shopInfoContent = document.getElementById('shopInfoTabContent');
    const billingConfigContent = document.getElementById('billingConfigTabContent');
    const vatContent = document.getElementById('vatTabContent'); // optional

    const tabButtons = [shopInfoTab, billingConfigTab, vatTab].filter(Boolean);
    const tabContents = [shopInfoContent, billingConfigContent, vatContent].filter(Boolean);

    if (!shopInfoTab || !billingConfigTab || !shopInfoContent || !billingConfigContent) {
      console.error('❌ Required Shop Settings tab elements not found');
      return;
    }

    // Reset all visible tabs to inactive state
    tabButtons.forEach(tabBtn => {
      tabBtn.classList.remove('bg-neutral-700', 'text-white', 'border-neutral-600');
      tabBtn.classList.add('bg-transparent', 'text-neutral-300', 'border-neutral-600/40');
    });

    // Hide all available content and add contents class to prevent layout issues
    tabContents.forEach(content => {
      content.classList.add('hidden', 'contents');
    });

    // Activate selected tab
    if (tab === 'shopInfo') {
      shopInfoTab.classList.add('bg-neutral-700', 'text-white', 'border-neutral-600');
      shopInfoTab.classList.remove('bg-transparent', 'text-neutral-300', 'border-neutral-600/40');
      shopInfoContent.classList.remove('hidden', 'contents');
    } else if (tab === 'billingConfig') {
      billingConfigTab.classList.add('bg-neutral-700', 'text-white', 'border-neutral-600');
      billingConfigTab.classList.remove('bg-transparent', 'text-neutral-300', 'border-neutral-600/40');
      billingConfigContent.classList.remove('hidden', 'contents');
    } else if (tab === 'vat' && vatTab && vatContent) {
      // Only handle VAT if present
      vatTab.classList.add('bg-neutral-700', 'text-white', 'border-neutral-600');
      vatTab.classList.remove('bg-transparent', 'text-neutral-300', 'border-neutral-600/40');
      vatContent.classList.remove('hidden', 'contents');

      if (window.loadVatRates) {
        console.log('📦 Loading VAT rates...');
        loadVatRates();
      }
    }
  };

  // Navigation functionality
  const navBtns = document.querySelectorAll('.nav-btn');
  const pages = document.querySelectorAll('.page');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Check if button is disabled
      if (btn.disabled) {
        return; // Don't process disabled buttons
      }
      
      // Remove active class from all buttons
      navBtns.forEach(b => b.classList.remove('bg-neutral-700', 'ring-2', 'ring-indigo-500/60'));
      // Add active class to clicked button
      btn.classList.add('bg-neutral-700', 'ring-2', 'ring-indigo-500/60');

      // Hide all pages
      pages.forEach(p => p.classList.add('hidden'));

      // Show target page
      const targetPage = document.getElementById(btn.dataset.go);
      if (targetPage) {
        targetPage.classList.remove('hidden');
        // Update page title
        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) {
          const h3 = targetPage.querySelector('h3');
          if (h3) {
            pageTitle.textContent = h3.textContent;
          } else {
            // Fallback: use button text or derive from section ID
            pageTitle.textContent = btn.textContent.trim() || btn.dataset.go.replace('Sec', '').replace(/([A-Z])/g, ' $1').trim();
          }
        }
        
        // Load data for specific sections
        if (btn.dataset.go === 'customerSec') {
          loadCustomers();
        } else if (btn.dataset.go === 'productsSec') {
          console.log('🔄 Loading unified products section...');
          // Show the products section and default to product types tab
          switchProductTab('types');
        } else if (btn.dataset.go === 'employeeSec') {
          loadEmployees();
        } else if (btn.dataset.go === 'vatSec') {
          loadVatRates();
        } else if (btn.dataset.go === 'billingSec') {
          initializeBillingSystem();
        } else if (btn.dataset.go === 'dashSec') {
          // Dashboard will be loaded when accessed
          if (window.createRevenueChart) {
            createRevenueChart();
            createRegionsChart();
            createTrendingProductsChart();
            createRepeatedCustomersChart();
            createEmployeeBarChart();
            createEmployeePieChart();
          }
        } else if (btn.dataset.go === 'advancedReportsSec') {
          initializeReports();
        } else if (btn.dataset.go === 'shopSettingsSec') {
          // Ensure the section is visible
          if (targetPage) {
            targetPage.classList.remove('hidden');
          }
          // Check if initializeShopSettings function exists
          if (typeof initializeShopSettings === 'function') {
            initializeShopSettings();
          } else {
            console.error('initializeShopSettings function not found');
          }
        }
      }
    });
  });

  // Cache clearing functionality
  function initializeCacheClearing() {
    const clearCacheBtn = document.getElementById('clearCacheBtn');
    
    if (clearCacheBtn && !clearCacheBtn.hasAttribute('data-cache-initialized')) {
      // Mark as initialized to prevent duplicate event listeners
      clearCacheBtn.setAttribute('data-cache-initialized', 'true');
      
      clearCacheBtn.addEventListener('click', async () => {
        // Show confirmation dialog using custom notification
        const confirmed = await showConfirmDialog('Are you sure you want to clear all app cache? This will remove all stored data and may require you to log in again.');
        
        if (confirmed) {
          try {
            // Set a flag to prevent double refresh
            window.isClearingCache = true;
            
            // Add a small delay to ensure the flag is set before any service worker events
            await new Promise(resolve => setTimeout(resolve, 100));
            
            await clearAllCache();
            
            // Show success notification
            if (window.showSimpleToast) {
              window.showSimpleToast('Cache cleared successfully! The app will refresh in 3 seconds.', 'success');
            } else {
              // Fallback to mobile notification if available
              if (window.TajirPWA && window.TajirPWA.mobileNavigation) {
                window.TajirPWA.mobileNavigation.showMobileNotification('Cache cleared successfully! The app will refresh in 3 seconds.', 'success');
              }
            }
            
            setTimeout(() => {
              // Reset the flag before reloading
              window.isClearingCache = false;
              window.location.reload();
            }, 3000);
          } catch (error) {
            console.error('Error clearing cache:', error);
            
            // Show error notification
            if (window.showSimpleToast) {
              window.showSimpleToast('Error clearing cache. Please try again.', 'error');
            } else {
              // Fallback to mobile notification if available
              if (window.TajirPWA && window.TajirPWA.mobileNavigation) {
                window.TajirPWA.mobileNavigation.showMobileNotification('Error clearing cache. Please try again.', 'error');
              }
            }
            window.isClearingCache = false;
          }
        }
      });
    }
  }

  async function clearAllCache() {
    // Clear localStorage
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }

    // Clear sessionStorage
    try {
      sessionStorage.clear();
    } catch (error) {
      console.error('Error clearing sessionStorage:', error);
    }

    // Clear IndexedDB (if OfflineStorage is available)
    try {
      if (window.TajirPWA && window.TajirPWA.offlineStorage) {
        const stores = ['customers', 'products', 'bills', 'pending_sync', 'settings'];
        for (const storeName of stores) {
          await window.TajirPWA.offlineStorage.clearStore(storeName);
        }
      }
    } catch (error) {
      console.error('Error clearing IndexedDB:', error);
    }

    // Clear service worker cache
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
    } catch (error) {
      console.error('Error clearing service worker cache:', error);
    }

    // Unregister service worker (skip during manual cache clear to prevent double refresh)
    try {
      if ('serviceWorker' in navigator) {
        if (window.isClearingCache) {
          // Skip during manual cache clear
        } else {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(
            registrations.map(registration => registration.unregister())
          );
        }
      }
    } catch (error) {
      console.error('Error unregistering service worker:', error);
    }
  }

  // Navigation function for Upcoming Features
  window.navigateToUpcomingFeatures = function() {
    // Navigate to upcoming features section
    const upcomingFeaturesSec = document.getElementById('upcomingFeaturesSec');
    if (upcomingFeaturesSec) {
      upcomingFeaturesSec.scrollIntoView({ behavior: 'smooth' });
    } else {
      // If section doesn't exist, show a notification
      if (window.showSimpleToast) {
        window.showSimpleToast('Upcoming Features section not found', 'info');
      }
    }
  };

  // Initialize Shop Settings tab functionality
  function initializeShopSettingsTabs() {
    
    // Shop Settings tab event listeners
    const shopInfoTab = document.getElementById('tabShopInfo');
    const billingConfigTab = document.getElementById('tabBillingConfig');
    const vatTab = document.getElementById('tabVAT');
    
    // Tab elements found
    
    if (shopInfoTab) {
      shopInfoTab.addEventListener('click', () => {
        // Shop Info tab clicked
        switchShopSettingsTab('shopInfo');
      });
    }
    if (billingConfigTab) {
      billingConfigTab.addEventListener('click', () => {
        // Billing Config tab clicked
        switchShopSettingsTab('billingConfig');
      });
    }
    if (vatTab) {
      vatTab.addEventListener('click', () => {
        // VAT tab clicked
        switchShopSettingsTab('vat');
      });
    }
    
    // Shop Settings tabs initialized
  }

  // Call initialization when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeShopSettingsTabs);
  } else {
    initializeShopSettingsTabs();
  }

  // Also initialize when Shop Settings section is shown
  document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'tabVAT') {
      console.log('🎯 VAT tab clicked via event delegation');
      setTimeout(() => {
        if (typeof switchShopSettingsTab === 'function') {
          switchShopSettingsTab('vat');
        } else {
          console.error('❌ switchShopSettingsTab function not available');
        }
      }, 100);
    }
  });

  // Initialize VAT configuration
  try {
    if (typeof initVatConfig === 'function') {
      initVatConfig();
      console.log('✓ VAT configuration initialized');
    } else {
      console.error('❌ initVatConfig function not available');
    }
  } catch (error) {
    console.error('❌ Error initializing VAT configuration:', error);
  }

  // Initialize VAT change listeners
  try {
    if (typeof attachVatChangeListeners === 'function') {
      attachVatChangeListeners();
      console.log('✓ VAT change listeners attached');
    } else {
      console.error('❌ attachVatChangeListeners function not available');
    }
  } catch (error) {
    console.error('❌ Error attaching VAT change listeners:', error);
  }
}); 