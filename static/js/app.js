// Main Application JavaScript

document.addEventListener('DOMContentLoaded', function() {
  lucide.createIcons();
  
  // Initialize plan management
  initializePlanManagement();

  // Initialize cache clearing functionality
  initializeCacheClearing();

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
        } else if (btn.dataset.go === 'productTypeSec') {
          loadProductTypes();
        } else if (btn.dataset.go === 'productSec') {
          loadProducts();
        } else if (btn.dataset.go === 'employeeSec') {
          loadEmployees();
        } else if (btn.dataset.go === 'vatSec') {
          loadVatRates();
        } else if (btn.dataset.go === 'billingSec') {
          // Check if initializeBillingSystem function exists
          if (typeof initializeBillingSystem === 'function') {
            initializeBillingSystem();
          } else {
            console.error('initializeBillingSystem function not found');
          }
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
    
    if (clearCacheBtn) {
      clearCacheBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to clear all app cache? This will remove all stored data and may require you to log in again.')) {
          try {
            // Set flag to prevent automatic reload from PWA manager
            window.isClearingCache = true;
            
            await clearAllCache();
            alert('Cache cleared successfully! The app will refresh in 3 seconds.');
            setTimeout(() => {
              window.location.reload();
            }, 3000);
          } catch (error) {
            console.error('Error clearing cache:', error);
            alert('Error clearing cache. Please try again.');
            // Reset flag on error
            window.isClearingCache = false;
          }
        }
      });
    }
  }

  async function clearAllCache() {
    console.log('Clearing all app cache...');
    
    // Clear localStorage
    try {
      localStorage.clear();
      console.log('localStorage cleared');
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }

    // Clear sessionStorage
    try {
      sessionStorage.clear();
      console.log('sessionStorage cleared');
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
        console.log('IndexedDB cleared');
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
        console.log('Service worker cache cleared');
      }
    } catch (error) {
      console.error('Error clearing service worker cache:', error);
    }

    // Unregister service worker
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(registration => registration.unregister())
        );
        console.log('Service worker unregistered');
      }
    } catch (error) {
      console.error('Error unregistering service worker:', error);
    }

    console.log('All cache cleared successfully');
  }
}); 