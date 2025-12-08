/**
 * Mobile Navigation Module for Tajir POS PWA
 * Provides touch-friendly navigation with bottom navigation bar and swipe gestures
 */

class MobileNavigation {
  constructor() {
    this.currentSection = 'dashboard';
    // Replace Customers with Employees; move Customers/Reports/Settings under More
    this.sections = ['dashboard', 'billing', 'products', 'employees', 'more'];
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchEndX = 0;
    this.touchEndY = 0;
    this.minSwipeDistance = 50;
    this.isInitialized = false;
  }

  handleResize() {
    // Handle resize events for mobile navigation
    const height = window.innerHeight;
    const width = window.innerWidth;
    
    if (height < width * 0.8) {
      // Keyboard is likely open
      document.body.classList.add('keyboard-open');
    } else {
      document.body.classList.remove('keyboard-open');
    }
    
    // Update active section on resize
    this.updateActiveSection();
  }

  async init() {
    try {
      // Check if we're on a mobile device
      if (!this.isMobile()) {
        console.log('Mobile Navigation: Not on mobile device, skipping initialization');
        return;
      }

      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve);
        });
      }

      this.createBottomNavigation();
      this.setupSwipeGestures();
      this.setupKeyboardHandling();
      this.setupTouchOptimizations();
      this.updateActiveSection();
      
      // Add resize listener to handle orientation changes
      window.addEventListener('resize', () => {
        this.handleResize();
      });
      
      console.log('Mobile Navigation: Initialized successfully');
      this.isInitialized = true;
    } catch (error) {
      console.error('Mobile Navigation: Initialization failed', error);
    }
  }

  createBottomNavigation() {
    // Remove existing mobile nav if present
    const existingNav = document.querySelector('.mobile-nav, #mobile-navigation-bar');
    if (existingNav) {
      existingNav.remove();
    }

    const nav = document.createElement('nav');
    nav.className = 'mobile-nav';
    nav.id = 'mobile-navigation-bar';
    nav.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(17, 24, 39, 0.95);
      backdrop-filter: blur(10px);
      border-top: 1px solid #374151;
      padding: 8px 0;
      z-index: 1000;
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
      display: flex;
      justify-content: space-around;
      align-items: center;
    `;
    
    nav.innerHTML = `
        <a href="#dashboard" class="mobile-nav-item" data-section="dashboard">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z"></path>
          </svg>
          <span>Dashboard</span>
        </a>
        <a href="#billing" class="mobile-nav-item" data-section="billing">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <span>Billing</span>
        </a>
        <a href="#products" class="mobile-nav-item" data-section="products">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
          </svg>
          <span>Products</span>
        </a>
        <a href="#employees" class="mobile-nav-item" data-section="employees">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
          </svg>
          <span>Employees</span>
        </a>
        <a href="#more" class="mobile-nav-item" data-section="more">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4z"></path>
          </svg>
          <span>More</span>
        </a>
    `;

    // Add click handlers
    nav.addEventListener('click', (e) => {
      const navItem = e.target.closest('.mobile-nav-item');
      if (navItem) {
        e.preventDefault();
        const section = navItem.dataset.section;
        this.navigateToSection(section);
      }
    });

    document.body.appendChild(nav);
    console.log('Mobile Navigation: Bottom navigation created');
  }

  setupSwipeGestures() {
    // Only add swipe gestures to the main content area, not to interactive elements
    const mainContent = document.querySelector('.mobile-container') || document.body;
    
    mainContent.addEventListener('touchstart', (e) => {
      // Don't handle swipes on interactive elements like tables, buttons, forms
      if (e.target.closest('table, button, input, select, textarea, .swipe-actions, .mobile-nav')) {
        return;
      }
      
      this.touchStartX = e.changedTouches[0].screenX;
      this.touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    mainContent.addEventListener('touchend', (e) => {
      // Don't handle swipes on interactive elements
      if (e.target.closest('table, button, input, select, textarea, .swipe-actions, .mobile-nav')) {
        return;
      }
      
      this.touchEndX = e.changedTouches[0].screenX;
      this.touchEndY = e.changedTouches[0].screenY;
      this.handleSwipe();
    }, { passive: true });
  }

  handleSwipe() {
    const deltaX = this.touchEndX - this.touchStartX;
    const deltaY = this.touchEndY - this.touchStartY;
    
    // Only handle horizontal swipes
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > this.minSwipeDistance) {
      const currentIndex = this.sections.indexOf(this.currentSection);
      
      console.log(`Mobile Navigation: Swipe detected - deltaX: ${deltaX}, currentSection: ${this.currentSection}`);
      
      if (deltaX > 0 && currentIndex > 0) {
        // Swipe right - go to previous section
        console.log(`Mobile Navigation: Swiping right to ${this.sections[currentIndex - 1]}`);
        this.navigateToSection(this.sections[currentIndex - 1]);
      } else if (deltaX < 0 && currentIndex < this.sections.length - 1) {
        // Swipe left - go to next section
        console.log(`Mobile Navigation: Swiping left to ${this.sections[currentIndex + 1]}`);
        this.navigateToSection(this.sections[currentIndex + 1]);
      }
    }
  }

  setupKeyboardHandling() {
    // Handle virtual keyboard
    const viewport = document.querySelector('meta[name=viewport]');
    if (viewport) {
      const originalContent = viewport.getAttribute('content');
      
      // Detect keyboard open/close
      const handleResize = () => {
        const height = window.innerHeight;
        const width = window.innerWidth;
        
        if (height < width * 0.8) {
          // Keyboard is likely open
          document.body.classList.add('keyboard-open');
        } else {
          document.body.classList.remove('keyboard-open');
        }
      };

      window.addEventListener('resize', handleResize);
      window.addEventListener('orientationchange', handleResize);
    }
  }

  setupTouchOptimizations() {
    // Add touch-action to scrollable elements
    const scrollableElements = document.querySelectorAll('.overflow-y-auto, .overflow-auto');
    scrollableElements.forEach(element => {
      element.style.touchAction = 'pan-y';
    });

    // Prevent zoom on double tap
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (event) => {
      const now = (new Date()).getTime();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    }, false);
  }

  navigateToSection(section) {
    if (this.sections.includes(section)) {
      this.currentSection = section;
      this.updateActiveSection();
      
      // Map section names to the app's navigation
      const sectionMap = {
        'dashboard': 'dashSec',
        'billing': 'billingSec',
        'products': 'productsSec',
        'employees': 'employeeSec'
      };
      
      const targetSection = sectionMap[section];
      if (section === 'more') {
        this.showMoreMenu();
        return;
      }
      if (targetSection) {
        // Use the existing app navigation
        const navButton = document.querySelector(`[data-go="${targetSection}"]`);
        if (navButton) {
          navButton.click();
          console.log(`Mobile Navigation: Navigated to ${section} (${targetSection})`);
        } else {
          console.warn(`Mobile Navigation: Navigation button for ${targetSection} not found`);
        }
      }
      
      // Trigger section change event
      window.dispatchEvent(new CustomEvent('sectionChanged', {
        detail: { section: section }
      }));
    }
  }

  showMoreMenu() {
    // Build lightweight bottom sheet with inline styles (no external CSS dependency)
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.5)';
    overlay.style.zIndex = '99999';

    const sheet = document.createElement('div');
    sheet.style.position = 'absolute';
    sheet.style.left = '0';
    sheet.style.right = '0';
    sheet.style.bottom = '0';
    sheet.style.background = '#111827'; // neutral-900
    sheet.style.borderTop = '1px solid #374151'; // neutral-700
    sheet.style.borderRadius = '12px 12px 0 0';
    sheet.style.padding = '16px';
    sheet.style.color = '#e5e7eb';

    sheet.innerHTML = `
      <div style="text-align:center;font-weight:600;margin-bottom:8px;">More</div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <button data-action="customers" style="padding:12px;border:1px solid #374151;border-radius:8px;background:#1f2937;color:#e5e7eb;text-align:left;">Customers</button>
        <button data-action="reports" style="padding:12px;border:1px solid #374151;border-radius:8px;background:#1f2937;color:#e5e7eb;text-align:left;">Reports</button>
        
        <button data-action="financial-insights" style="padding:12px;border:1px solid #374151;border-radius:8px;background:#1f2937;color:#e5e7eb;text-align:left;">Financial Insights</button>
        <button data-action="expenses" style="padding:12px;border:1px solid #374151;border-radius:8px;background:#1f2937;color:#e5e7eb;text-align:left;">Expenses</button>
        <button data-action="settings" style="padding:12px;border:1px solid #374151;border-radius:8px;background:#1f2937;color:#e5e7eb;text-align:left;">Shop Settings</button>
        <button data-action="product-types" style="padding:12px;border:1px solid #374151;border-radius:8px;background:#1f2937;color:#e5e7eb;text-align:left;">Product Types</button>
        <button data-action="clear-cache" style="padding:12px;border:1px solid #dc2626;border-radius:8px;background:#1f2937;color:#fca5a5;text-align:left;">
          <svg style="width:16px;height:16px;display:inline-block;margin-right:8px;vertical-align:middle;" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
          Clear Cache
        </button>
        <button data-action="close" style="padding:12px;border:1px solid #4b5563;border-radius:8px;background:#111827;color:#9ca3af;text-align:center;">Close</button>
      </div>
    `;

    overlay.appendChild(sheet);
    document.body.appendChild(overlay);

    const handleClose = () => {
      if (overlay && overlay.parentElement) overlay.parentElement.removeChild(overlay);
    };

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) handleClose();
    });

    sheet.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      if (action === 'close') { handleClose(); return; }
      const map = {
        customers: 'customerSec',
        reports: 'advancedReportsSec',
        
        'financial-insights': 'financial-insights',
        expenses: 'expenses',
        settings: 'shopSettingsSec',
        'product-types': 'productTypeSec'
      };
      
      if (action === 'clear-cache') {
        this.handleClearCache();
        handleClose();
        return;
      }
      
      const target = map[action];
      if (target) {
        if (target === 'expenses') {
          // Navigate to expenses page
          window.location.href = '/expenses';
        
        } else if (target === 'financial-insights') {
          // Navigate to financial insights page
          window.location.href = '/financial-insights';
        } else {
          const navButton = document.querySelector(`[data-go="${target}"]`);
          if (navButton) navButton.click();
        }
      }
      handleClose();
    });
  }

  updateActiveSection() {
    const navItems = document.querySelectorAll('.mobile-nav-item');
    navItems.forEach(item => {
      item.classList.remove('active');
      if (item.dataset.section === this.currentSection) {
        item.classList.add('active');
      }
    });
  }

  showSection(section) {
    // Hide all sections
    const sections = document.querySelectorAll('[data-section]');
    sections.forEach(s => {
      s.style.display = 'none';
    });

    // Show target section
    const targetSection = document.querySelector(`[data-section="${section}"]`);
    if (targetSection) {
      targetSection.style.display = 'block';
      targetSection.classList.add('fade-in-mobile');
    }

    // Update URL hash
    window.location.hash = section;
  }

  // Mobile-specific utility methods
  showMobileModal(content, options = {}) {
    const modal = document.createElement('div');
    modal.className = 'modal-mobile';
    modal.innerHTML = `
      <div class="modal-mobile-content">
        <div class="modal-mobile-header">
          <h3 class="text-lg font-semibold">${options.title || 'Action'}</h3>
        </div>
        <div class="modal-mobile-body">
          ${content}
        </div>
        <div class="modal-mobile-footer">
          ${options.showCancel ? '<button class="btn-secondary-mobile" onclick="this.closest(\'.modal-mobile\').remove()">Cancel</button>' : ''}
          ${options.confirmText ? `<button class="btn-primary-mobile" onclick="this.closest('.modal-mobile').dispatchEvent(new CustomEvent('confirm'))">${options.confirmText}</button>` : ''}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Auto-remove on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    return modal;
  }

  showMobileNotification(message, type = 'info', duration = 3000) {
    // Remove any existing notifications
    const existingNotifications = document.querySelectorAll('.mobile-notification');
    existingNotifications.forEach(notification => notification.remove());

    const notification = document.createElement('div');
    notification.className = `mobile-notification ${type}`;
    
    // Create icon based on type
    let icon = '';
    switch (type) {
      case 'success':
        icon = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
        break;
      case 'error':
        icon = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
        break;
      case 'warning':
        icon = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path></svg>';
        break;
      default:
        icon = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
    }
    
    notification.innerHTML = `
      ${icon}
      <span class="message">${message}</span>
    `;

    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);

    // Hide and remove
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (notification.parentElement) {
          notification.remove();
        }
      }, 300);
    }, duration);
  }

  async handleClearCache() {
    try {
      // Show confirmation dialog
      const confirmed = await this.showConfirmDialog('Are you sure you want to clear all app cache? This will remove all stored data and may require you to log in again.');
      
      if (!confirmed) {
        return;
      }

      // Show loading notification
      this.showMobileNotification('Clearing cache...', 'info');
      
      // Set clearing flag
      window.isClearingCache = true;
      
      // Clear all cache using existing function
      if (typeof clearAllCache === 'function') {
        await clearAllCache();
      } else {
        // Fallback cache clearing
        await this.clearAllCacheFallback();
      }
      
      // Show success message
      this.showMobileNotification('Cache cleared successfully! The app will refresh in 3 seconds.', 'success');
      
      // Reset clearing flag
      window.isClearingCache = false;
      
      // Refresh the app after 3 seconds
      setTimeout(() => {
        window.location.reload();
      }, 3000);
      
    } catch (error) {
      console.error('Error clearing cache:', error);
      this.showMobileNotification('Error clearing cache. Please try again.', 'error');
      window.isClearingCache = false;
    }
  }

  async clearAllCacheFallback() {
    // Clear localStorage
    localStorage.clear();
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Clear IndexedDB
    if ('indexedDB' in window) {
      const databases = await indexedDB.databases();
      for (const db of databases) {
        if (db.name) {
          indexedDB.deleteDatabase(db.name);
        }
      }
    }
    
    // Clear service worker cache
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        }
      } catch (error) {
        console.error('Error clearing service worker cache:', error);
      }
    }
  }

  async showConfirmDialog(message) {
    return new Promise((resolve) => {
      // Create confirmation dialog
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.background = 'rgba(0,0,0,0.5)';
      overlay.style.zIndex = '100001';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.padding = '20px';

      const dialog = document.createElement('div');
      dialog.style.background = '#1f2937';
      dialog.style.border = '1px solid #374151';
      dialog.style.borderRadius = '12px';
      dialog.style.padding = '20px';
      dialog.style.maxWidth = '90vw';
      dialog.style.width = '320px';
      dialog.style.color = '#e5e7eb';

      dialog.innerHTML = `
        <div style="margin-bottom:16px;font-weight:600;color:#fca5a5;">Clear Cache</div>
        <div style="margin-bottom:20px;line-height:1.5;">${message}</div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button id="cancel-cache" style="padding:8px 16px;border:1px solid #374151;border-radius:6px;background:#111827;color:#9ca3af;">Cancel</button>
          <button id="confirm-cache" style="padding:8px 16px;border:1px solid #dc2626;border-radius:6px;background:#dc2626;color:#ffffff;">Clear Cache</button>
        </div>
      `;

      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      const handleResult = (result) => {
        if (overlay.parentElement) {
          overlay.parentElement.removeChild(overlay);
        }
        resolve(result);
      };

      dialog.querySelector('#cancel-cache').addEventListener('click', () => handleResult(false));
      dialog.querySelector('#confirm-cache').addEventListener('click', () => handleResult(true));
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) handleResult(false);
      });
    });
  }

  // Mobile-optimized form handling
  setupMobileForm(formSelector) {
    const form = document.querySelector(formSelector);
    if (!form) return;

    // Add mobile classes
    form.classList.add('form-mobile');

    // Optimize inputs
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      input.classList.add('input-mobile');
      
      // Prevent zoom on iOS
      if (input.type === 'text' || input.type === 'email' || input.type === 'password') {
        input.style.fontSize = '16px';
      }
    });

    // Optimize buttons
    const buttons = form.querySelectorAll('button');
    buttons.forEach(button => {
      if (button.type === 'submit') {
        button.classList.add('btn-primary-mobile');
      } else {
        button.classList.add('btn-secondary-mobile');
      }
    });
  }

  // Mobile-optimized list handling
  setupMobileList(listSelector) {
    const list = document.querySelector(listSelector);
    if (!list) return;

    list.classList.add('list-mobile');
    
    const items = list.querySelectorAll('li, .list-item');
    items.forEach(item => {
      item.classList.add('list-item-mobile');
      
      // Add touch feedback
      item.addEventListener('touchstart', () => {
        item.style.transform = 'scale(0.98)';
      });
      
      item.addEventListener('touchend', () => {
        item.style.transform = 'scale(1)';
      });
    });
  }

  // Get current section
  getCurrentSection() {
    return this.currentSection;
  }

  // Check if running on mobile
  isMobile() {
    // More comprehensive mobile detection
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isMobileWidth = window.innerWidth <= 768;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    console.log('Mobile detection:', {
      userAgent: navigator.userAgent,
      isMobileDevice,
      isMobileWidth,
      isTouchDevice,
      windowWidth: window.innerWidth
    });
    
    return isMobileDevice || isMobileWidth || isTouchDevice;
  }

  // Check if running on tablet
  isTablet() {
    return window.innerWidth > 768 && window.innerWidth <= 1024;
  }

  // Check if running on desktop
  isDesktop() {
    return window.innerWidth > 1024;
  }

  // Get device orientation
  getOrientation() {
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
  }

  // Hide mobile navigation (for mobile billing V3)
  hideNavigation() {
    const mobileNav = document.getElementById('mobile-navigation-bar');
    if (mobileNav) {
      mobileNav.style.display = 'none';
      mobileNav.style.visibility = 'hidden';
      mobileNav.style.opacity = '0';
      mobileNav.style.zIndex = '-1';
      mobileNav.style.pointerEvents = 'none';
    }
  }

  // Show mobile navigation (for mobile billing V3)
  showNavigation() {
    const mobileNav = document.getElementById('mobile-navigation-bar');
    if (mobileNav) {
      mobileNav.style.display = '';
      mobileNav.style.visibility = '';
      mobileNav.style.opacity = '';
      mobileNav.style.zIndex = '';
      mobileNav.style.pointerEvents = '';
    }
  }

  // Manual initialization method
  static async initializeMobileNavigation() {
    const mobileNav = new MobileNavigation();
    await mobileNav.init();
    return mobileNav;
  }
}

// Make mobile navigation available globally
window.MobileNavigation = MobileNavigation;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MobileNavigation;
} 