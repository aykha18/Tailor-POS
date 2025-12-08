/**
 * Mobile Billing Module for Tajir POS PWA
 * Provides touch-friendly billing interface optimized for mobile devices
 */

// Prevent multiple declarations
if (typeof window.MobileBilling === 'undefined') {
  window.MobileBilling = class MobileBilling {
  constructor() {
    // Add billing configuration first so defaults can use it
    this.billingConfig = {
        enable_trial_date: true,
        enable_delivery_date: true,
        enable_advance_payment: true,
        enable_customer_notes: true,
        enable_employee_assignment: true,
        default_delivery_days: 3,
        default_trial_days: 3
    };

    this.currentBill = {
      items: [],
      customer: null,
      total: 0,
      tax: 0,
      discount: 0,
      discountType: 'percentage', // 'percentage' or 'amount'
      discountValue: 0,
      finalTotal: 0,
      paymentMethod: null,
      deliveryDate: this.getDefaultDeliveryDate() // Add default delivery date
    };
    this.isInitialized = false;
    this.mobileNavigation = null;
    // Tracks if the user modified the mobile bill after opening
    this.mobileBillDirty = false;
    // Prevent duplicate notifications
    this.lastNotification = null;
    this.notificationTimeout = null;
    // Payment flow state
    this.paymentInProgress = false;
  }

  async init() {
    try {
  
      
      this.setupMobileBillingInterface();
      this.setupTouchGestures();
      this.setupMobileOptimizations();
      this.loadOfflineProducts();
      
      // Initialize VAT configuration
      this.initializeVatConfig();
      
      this.isInitialized = true;
      
      // Dispatch initialization event
      window.dispatchEvent(new CustomEvent('mobileBillingInitialized', {
        detail: { timestamp: Date.now() }
      }));
      
    } catch (error) {
      console.error('Mobile Billing: Initialization failed', error);
      throw error; // Re-throw to let caller know about the error
    }
  }

  setupMobileBillingInterface() {
    // Create mobile billing container
    const billingContainer = document.createElement('div');
    billingContainer.id = 'mobile-billing-container';
    billingContainer.className = 'container-mobile';
    billingContainer.innerHTML = `
      <div class="section-mobile">
        <div class="card-mobile">
          <div class="card-mobile-header">
            <h2 class="text-lg font-semibold">Quick Billing</h2>
            <button id="close-mobile-billing" class="text-gray-500 hover:text-gray-700">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <div class="card-mobile-body">
            <!-- Product Search -->
            <div class="search-mobile">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
              <input type="text" id="mobile-product-search" placeholder="Search products..." class="input-mobile">
              <button class="barcode-scan-btn" title="Scan Barcode">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V6a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1zm12 0h2a1 1 0 001-1V6a1 1 0 00-1-1h-2a1 1 0 00-1 1v1a1 1 0 001 1zM5 20h2a1 1 0 001-1v-1a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1z"></path>
                </svg>
              </button>
            </div>
            
            <!-- Product Grid -->
            <div id="mobile-product-grid" class="grid grid-cols-2 gap-4 mb-6">
              <!-- Products will be loaded here -->
            </div>
            
            <!-- Current Bill -->
            <div class="card-mobile">
              <div class="card-mobile-header">
                <h3 class="text-md font-semibold">Current Bill</h3>
                <button id="clear-mobile-bill" class="text-red-500 text-sm">Clear</button>
              </div>
              <div class="card-mobile-body">
                <!-- Customer Selection -->
                <div class="customer-selection">
                  <div class="customer-selection-header">
                    <h4>Customer</h4>
                    <button class="select-customer-btn" id="select-customer-btn">Select</button>
                  </div>
                  <div id="selected-customer-display" style="display: none;">
                    <div class="selected-customer">
                      <div class="customer-avatar" id="customer-avatar">👤</div>
                      <div class="customer-info">
                        <h5 id="customer-name">Customer Name</h5>
                        <p id="customer-phone">Phone Number</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- Discount Management -->
                <div class="discount-management">
                  <div class="discount-header">
                    <h4>Discount</h4>
                    <div class="discount-controls">
                      <input type="number" id="discount-input" class="discount-input" placeholder="0" min="0" step="0.01">
                      <div class="discount-type-selector">
                        <button class="discount-type-btn active" data-type="percentage">%</button>
                        <button class="discount-type-btn" data-type="amount">AED</button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div id="mobile-bill-items" class="list-mobile">
                  <!-- Bill items will be shown here -->
                </div>
                
                <!-- Enhanced Bill Summary -->
                <div class="bill-summary-payment">
                  <div class="payment-info">
                    <h4>Bill Summary</h4>
                    <div class="payment-method-display" id="payment-method-display" style="display: none;">
                      <span id="payment-method-icon">💳</span>
                      <span id="payment-method-text">Card</span>
                    </div>
                  </div>
                  <div class="bill-summary-row-mobile">
                    <span class="bill-summary-label">Subtotal:</span>
                    <span class="bill-summary-value" id="mobile-subtotal">0.00</span>
                  </div>
                  <div class="bill-summary-row-mobile" id="mobile-vat-summary-row">
                    <span class="bill-summary-label" id="mobile-vat-label">Tax (5%):</span>
                    <span class="bill-summary-value" id="mobile-tax-amount">0.00</span>
                  </div>
                  <div class="bill-summary-row-mobile">
                    <span class="bill-summary-label">Discount:</span>
                    <span class="bill-summary-value" id="mobile-discount-amount">0.00</span>
                  </div>
                  <div class="bill-summary-row-mobile">
                    <span class="bill-summary-label">Total:</span>
                    <span class="bill-summary-total" id="mobile-final-total">0.00</span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Action Buttons -->
            <div class="billing-actions-mobile">
              <button id="mobile-process-bill-btn" class="billing-action-btn primary">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Process Bill
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Add to body but hide initially
    billingContainer.style.display = 'none';
    
    document.body.appendChild(billingContainer);
    
    // Setup event listeners for mobile billing
    this.setupMobileBillingEvents();
  }

  setupEventListeners() {
    // Product search
    const searchInput = document.getElementById('product-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filterProducts(e.target.value);
      });
    }

    // Clear bill button
    const clearBtn = document.getElementById('clear-bill-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearBill();
      });
    }

    // Process bill button
    const processBtn = document.getElementById('process-bill-btn');
    if (processBtn) {
      processBtn.addEventListener('click', () => {
        this.processBill();
      });
    }
  }

  setupTouchGestures() {
    // Swipe to remove items from bill
    const billItems = document.getElementById('bill-items');
    if (billItems) {
      billItems.addEventListener('touchstart', (e) => {
        const item = e.target.closest('.list-item-mobile');
        if (item) {
          item.dataset.touchStart = e.touches[0].clientX;
        }
      });

      billItems.addEventListener('touchend', (e) => {
        const item = e.target.closest('.list-item-mobile');
        if (item && item.dataset.touchStart) {
          const touchEnd = e.changedTouches[0].clientX;
          const touchStart = parseInt(item.dataset.touchStart);
          const diff = touchStart - touchEnd;

          if (Math.abs(diff) > 50) {
            // Swipe detected - remove item
            this.removeItemFromBill(item.dataset.productId);
          }
        }
      });
    }
  }

  setupMobileBillingEvents() {
    const container = document.getElementById('mobile-billing-container');
    if (!container) return;

    // Close button
    const closeBtn = container.querySelector('#close-mobile-billing');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hideMobileBilling();
      });
    }

    // Product search
    const searchInput = container.querySelector('#mobile-product-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filterMobileProducts(e.target.value);
      });
    }

    // Barcode scan button
    const barcodeBtn = container.querySelector('.barcode-scan-btn');
    if (barcodeBtn) {
      barcodeBtn.addEventListener('click', () => {
        this.initiateBarcodeScan();
      });
    }

    // Clear bill button
    const clearBtn = container.querySelector('#clear-mobile-bill');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearMobileBill();
      });
    }

    // Process bill button
    const processBtn = container.querySelector('#mobile-process-bill-btn');
    if (processBtn) {
      processBtn.addEventListener('click', () => {
        // Check if button is disabled
        if (processBtn.disabled || processBtn.classList.contains('disabled')) {
          return;
        }
        
        // Check current button text to determine action
        if (processBtn.textContent === 'Select Customer') {
          this.showCustomerSelection();
        } else {
          this.initiateEnhancedPayment();
        }
      });
    }

    // Customer selection
    const selectCustomerBtn = container.querySelector('#select-customer-btn');
    if (selectCustomerBtn) {
      selectCustomerBtn.addEventListener('click', () => {
        this.showCustomerSelection();
      });
    }

    // Discount management
    const discountInput = container.querySelector('#discount-input');
    if (discountInput) {
      discountInput.addEventListener('input', (e) => {
        this.updateDiscount(e.target.value);
      });
    }

    // Discount type selector
    const discountTypeBtns = container.querySelectorAll('.discount-type-btn');
    discountTypeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.setDiscountType(btn.dataset.type);
      });
    });
  }

  showMobileBilling() {
    const container = document.getElementById('mobile-billing-container');
    if (container) {
      // Clean up any existing notifications first
      const existingNotifications = document.querySelectorAll('.mobile-notification');
      existingNotifications.forEach(notification => {
        notification.remove();
      });
      
      container.style.display = 'block';
      container.classList.add('fade-in-mobile');
      
      // Start with a clean bill when opening mobile billing
      this.clearMobileBill();
      
      // Load products if not already loaded
      this.loadMobileProducts();
      
      // Focus on search input
      const searchInput = container.querySelector('#mobile-product-search');
      if (searchInput) {
        setTimeout(() => searchInput.focus(), 300);
      }
      
      // Initialize button state
      this.updateProcessButtonState();
      
      // Load and apply billing configuration
      this.loadBillingConfiguration();
    }
  }

  hideMobileBilling() {
    const container = document.getElementById('mobile-billing-container');
    if (container) {
      // Sync mobile bill data to main billing system before hiding
      this.syncToMainBilling();
      
      // Clean up any existing notifications
      const existingNotifications = document.querySelectorAll('.mobile-notification');
      existingNotifications.forEach(notification => {
        notification.remove();
      });
      
      container.classList.add('slide-up-mobile');
      setTimeout(() => {
        container.style.display = 'none';
        container.classList.remove('slide-up-mobile');
      }, 300);
    }
  }

  // Sync mobile bill data to main billing system
  syncToMainBilling() {
    // Avoid duplicating when user didn't change anything
    if (!this.mobileBillDirty || this.currentBill.items.length === 0) {
  
      return;
    }
    
    try {
      
      
      // Get the main billing system's bill array
      const mainBill = window.bill || [];
      
      
      // Convert mobile bill items to main billing format
      const convertedItems = this.currentBill.items.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        price: item.price,
        discount: 0, // Default discount
        advance: 0, // Default advance
            vat_percent: window.getDefaultVatPercent ? window.getDefaultVatPercent() : 5, // Get VAT from config
    vat_amount: item.total * ((window.getDefaultVatPercent ? window.getDefaultVatPercent() : 5) / 100), // Calculate VAT
        subtotal: item.total, // Before discount
        total: item.total // After discount
      }));
      
      
      
      // Add items to main bill array
      convertedItems.forEach(item => {
        // Check if product already exists in main bill
        const existingIndex = mainBill.findIndex(billItem => 
          billItem.product_id === item.product_id
        );
        
        if (existingIndex !== -1) {
          // Update existing item quantity
          mainBill[existingIndex].quantity += item.quantity;
          mainBill[existingIndex].total = mainBill[existingIndex].quantity * mainBill[existingIndex].price;
          const vatPercent = window.getDefaultVatPercent ? window.getDefaultVatPercent() : 5;
        mainBill[existingIndex].vat_amount = mainBill[existingIndex].total * (vatPercent / 100);

        } else {
          // Add new item
          mainBill.push(item);

        }
      });
      
      
      
      // Update main billing display
      if (typeof window.renderBillTable === 'function') {
        window.renderBillTable();

      }
      if (typeof window.updateTotals === 'function') {
        window.updateTotals();

      }
      
      // Show success notification
      this.showMobileNotification(`${this.currentBill.items.length} items transferred to main billing`, 'success');
      
      // Reset dirty flag
      this.mobileBillDirty = false;
      
    } catch (error) {
      console.error('Error syncing mobile bill to main billing:', error);
      this.showMobileNotification('Failed to sync bill data', 'error');
    }
  }

  // Sync main billing data to mobile billing
  syncFromMainBilling() {
    try {
      const mainBill = window.bill || [];
      
      if (mainBill.length === 0) {
        // Clear mobile bill if main bill is empty
        this.currentBill.items = [];
        this.updateMobileBillDisplay();
        this.calculateMobileTotals();
        this.mobileBillDirty = false;

        return;
      }
      
      // Convert main bill items to mobile format
      const mobileItems = mainBill.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        price: item.price,
        quantity: item.quantity,
        total: item.total
      }));
      

      
      // Update mobile bill
      this.currentBill.items = mobileItems;
      this.updateMobileBillDisplay();
      this.calculateMobileTotals();
      // Just mirrored from main; not dirty yet
      this.mobileBillDirty = false;
      

      
    } catch (error) {
      console.error('Error syncing from main billing:', error);
    }
  }

  setupMobileOptimizations() {
    // Prevent zoom on input focus
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      input.addEventListener('focus', () => {
        input.style.fontSize = '16px';
      });
    });

    // Add touch feedback to buttons
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
      button.addEventListener('touchstart', () => {
        button.style.transform = 'scale(0.95)';
      });
      
      button.addEventListener('touchend', () => {
        button.style.transform = 'scale(1)';
      });
    });
  }

  async loadOfflineProducts() {
    try {
      // Load products from offline storage
      const products = window.offlineData?.products || [];
      this.displayProducts(products);
    } catch (error) {
      console.error('Mobile Billing: Failed to load products', error);
    }
  }

  async loadMobileProducts() {
    try {
      const response = await fetch('/api/products');
      const products = await response.json();
      this.displayMobileProducts(products);
    } catch (error) {
      console.error('Error loading mobile products:', error);
      this.showMobileNotification('Failed to load products', 'error');
    }
  }

  displayProducts(products) {
    const productGrid = document.getElementById('product-grid');
    if (!productGrid) return;

    productGrid.innerHTML = products.map(product => `
      <div class="card-mobile cursor-pointer" data-product-id="${product.product_id}">
        <div class="card-mobile-body text-center">
          <div class="text-lg font-semibold mb-2">${product.product_name}</div>
          <div class="text-sm text-gray-600 mb-2">${product.product_type || 'General'}</div>
          <div class="text-lg font-bold text-blue-600">AED ${product.price}</div>
          <button class="btn-primary-mobile w-full mt-2" onclick="window.TajirPWA.mobileBilling.addToBill(${product.product_id})">
            Add to Bill
          </button>
        </div>
      </div>
    `).join('');
  }

  displayMobileProducts(products) {
    const grid = document.getElementById('mobile-product-grid');
    if (!grid) return;

    grid.innerHTML = products.map(product => `
      <div class="product-card-mobile" data-product-id="${product.product_id}" data-product-name="${product.product_name}" data-product-price="${product.rate}">
        <div class="product-card-content">
          <div class="product-name">${product.product_name}</div>
          <div class="product-type">${product.type_name || ''}</div>
          <div class="product-price">AED ${product.rate}</div>
          <button class="add-to-bill-btn" onclick="window.TajirPWA.mobileBilling.addToMobileBill(${product.product_id})">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            Add
          </button>
        </div>
      </div>
    `).join('');

    // Add enhanced interactions
    this.setupEnhancedProductInteractions();
  }

  setupEnhancedProductInteractions() {
    const productCards = document.querySelectorAll('.product-card-mobile');
    
    productCards.forEach(card => {
      // Add haptic feedback on touch
      card.addEventListener('touchstart', () => {
        if (navigator.vibrate) {
          navigator.vibrate(10);
        }
      });

      // Add long press for product details
      let longPressTimer;
      
      card.addEventListener('touchstart', () => {
        longPressTimer = setTimeout(() => {
          this.showProductDetails(card);
        }, 500);
      });

      card.addEventListener('touchend', () => {
        clearTimeout(longPressTimer);
      });

      card.addEventListener('touchmove', () => {
        clearTimeout(longPressTimer);
      });
    });
  }

  showProductDetails(card) {
    const productId = card.dataset.productId;
    const productName = card.dataset.productName;
    const productPrice = card.dataset.productPrice;
    
    // Create a simple product details modal
    const modal = document.createElement('div');
    modal.className = 'product-details-modal';
    
    modal.innerHTML = `
      <div class="product-modal-content">
        <div class="modal-header">
          <h3>${productName}</h3>
          <button class="close-modal-btn">×</button>
        </div>
        <div class="product-modal-body">
          <div class="product-image-large">
            <div class="product-icon">📦</div>
          </div>
          <div class="product-details">
            <h4>${productName}</h4>
            <p class="product-price-large">AED ${productPrice}</p>
          </div>
        </div>
        <div class="product-modal-footer">
          <button class="add-to-bill-modal-btn">Add to Bill</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Setup modal interactions
    const closeBtn = modal.querySelector('.close-modal-btn');
    const addBtn = modal.querySelector('.add-to-bill-modal-btn');
    
    closeBtn.addEventListener('click', () => {
      modal.remove();
    });
    
    addBtn.addEventListener('click', () => {
      this.addToMobileBill(productId);
      modal.remove();
    });
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  filterProducts(searchTerm) {
    const products = window.offlineData?.products || [];
    const filtered = products.filter(product => 
      product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.product_type?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    this.displayProducts(filtered);
  }

  filterMobileProducts(searchTerm) {
    const productCards = document.querySelectorAll('.product-card-mobile');
    const searchLower = searchTerm.toLowerCase();

    productCards.forEach(card => {
      const productName = card.getAttribute('data-product-name').toLowerCase();
      const productType = card.querySelector('.product-type').textContent.toLowerCase();
      
      if (productName.includes(searchLower) || productType.includes(searchLower)) {
        card.style.display = 'block';
      } else {
        card.style.display = 'none';
      }
    });
  }

  addToBill(productId) {
    const products = window.offlineData?.products || [];
    const product = products.find(p => p.product_id === productId);
    
    if (!product) return;

    // Check if product already in bill
    const existingItem = this.currentBill.items.find(item => item.product_id === productId);
    
    if (existingItem) {
      existingItem.quantity += 1;
      existingItem.total = existingItem.quantity * existingItem.price;
    } else {
      this.currentBill.items.push({
        product_id: product.product_id,
        product_name: product.product_name,
        price: product.price,
        quantity: 1,
        total: product.price
      });
    }

    this.updateBillDisplay();
    this.calculateTotals();
    // Mark as modified
    this.mobileBillDirty = true;
    
    // Show success feedback
    this.showMobileNotification(`${product.product_name} added to bill`, 'success');
  }

  addToMobileBill(productId) {
    const productCard = document.querySelector(`[data-product-id="${productId}"]`);
    if (!productCard) return;

    const productName = productCard.getAttribute('data-product-name');
    const productPrice = parseFloat(productCard.getAttribute('data-product-price'));

    // Check if product already in bill
    const existingItem = this.currentBill.items.find(item => item.product_id === productId);
    
    if (existingItem) {
      existingItem.quantity += 1;
      existingItem.total = existingItem.quantity * existingItem.price;
    } else {
      this.currentBill.items.push({
        product_id: productId,
        product_name: productName,
        price: productPrice,
        quantity: 1,
        total: productPrice
      });
    }

    this.updateMobileBillDisplay();
    this.calculateMobileTotals();
    // Mark as modified
    this.mobileBillDirty = true;
    
    // Show success feedback
    this.showMobileNotification(`${productName} added to bill`, 'success');
    
    // Add visual feedback to the product card
    productCard.classList.add('added-to-bill');
    setTimeout(() => {
      productCard.classList.remove('added-to-bill');
    }, 1000);
  }

  removeItemFromBill(productId) {
    this.currentBill.items = this.currentBill.items.filter(item => item.product_id !== productId);
    this.updateBillDisplay();
    this.calculateTotals();
  }

  updateBillDisplay() {
    const billItems = document.getElementById('bill-items');
    if (!billItems) return;

    if (this.currentBill.items.length === 0) {
      billItems.innerHTML = '<div class="text-center text-gray-500 py-8">No items in bill</div>';
      return;
    }

    billItems.innerHTML = this.currentBill.items.map(item => `
      <div class="list-item-mobile" data-product-id="${item.product_id}">
        <div class="flex-1">
          <div class="font-semibold">${item.product_name}</div>
          <div class="text-sm text-gray-600">${item.price} x ${item.quantity}</div>
        </div>
        <div class="text-right">
          <div class="font-bold">${item.total.toFixed(2)}</div>
          <button class="text-red-500 text-sm" onclick="window.TajirPWA.mobileBilling.removeItemFromBill(${item.product_id})">
            Remove
          </button>
        </div>
      </div>
    `).join('');
  }

  updateMobileBillDisplay() {
    const billItems = document.getElementById('mobile-bill-items');
    if (!billItems) return;

    if (this.currentBill.items.length === 0) {
      billItems.innerHTML = `
        <div class="bill-empty-state">
          <div class="bill-empty-state-icon">📋</div>
          <div style="font-size: 16px; font-weight: 500; margin-bottom: 8px;">No items in bill</div>
          <div style="font-size: 14px; color: var(--md-on-surface-muted);">Add products to get started</div>
        </div>
      `;
      return;
    }

    billItems.innerHTML = this.currentBill.items.map(item => `
      <div class="bill-item-enhanced" data-product-id="${item.product_id}">
        <div>📦</div>
        <div>
          <div>${item.product_name}</div>
          <div>AED ${item.price} per unit</div>
        </div>
        <div>
          <button class="quantity-decrease" onclick="window.TajirPWA.mobileBilling.updateQuantity(${item.product_id}, -1)">-</button>
          <span>${item.quantity}</span>
          <button class="quantity-increase" onclick="window.TajirPWA.mobileBilling.updateQuantity(${item.product_id}, 1)">+</button>
        </div>
        <div>
          <div>AED ${item.total.toFixed(2)}</div>
          <button class="remove-item-btn" onclick="window.TajirPWA.mobileBilling.removeFromMobileBill(${item.product_id})">Remove</button>
        </div>
      </div>
    `).join('');
    
    // Update process button state
    this.updateProcessButtonState();
  }

  updateQuantity(productId, change) {
    const item = this.currentBill.items.find(item => item.product_id === productId);
    if (item) {
      const newQuantity = item.quantity + change;
      if (newQuantity > 0) {
        item.quantity = newQuantity;
        item.total = item.quantity * item.price;
        this.mobileBillDirty = true;
        this.updateMobileBillDisplay();
        this.calculateMobileTotals();
      } else if (newQuantity === 0) {
        this.removeFromMobileBill(productId);
      }
    }
  }

  removeFromMobileBill(productId) {
    this.currentBill.items = this.currentBill.items.filter(item => item.product_id !== productId);
    this.updateMobileBillDisplay();
    this.calculateMobileTotals();
    this.mobileBillDirty = true;
    this.showMobileNotification('Item removed from bill', 'info');
  }

  calculateTotals() {
    const includeVatInPrice = window.getIncludeVatInPrice ? window.getIncludeVatInPrice() : false;
    const vatPercent = window.getDefaultVatPercent ? window.getDefaultVatPercent() : 5;
    
    let subtotal, tax, finalTotal;
    
    if (includeVatInPrice) {
      // VAT is already included in item prices
      const totalWithVat = this.currentBill.items.reduce((sum, item) => sum + item.total, 0);
      subtotal = totalWithVat / (1 + vatPercent / 100); // Calculate subtotal without VAT
      tax = totalWithVat - subtotal; // VAT amount
      finalTotal = totalWithVat; // Final total is the same as total with VAT
    } else {
      // Traditional VAT calculation (VAT added on top)
      subtotal = this.currentBill.items.reduce((sum, item) => sum + item.total, 0);
      tax = subtotal * (vatPercent / 100);
      finalTotal = subtotal + tax;
    }
    
    const discount = this.currentBill.discount || 0;
    finalTotal = finalTotal - discount;

    this.currentBill.subtotal = subtotal;
    this.currentBill.tax = tax;
    this.currentBill.finalTotal = finalTotal;

    // Update display
    document.getElementById('subtotal').textContent = `${subtotal.toFixed(2)}`;
    document.getElementById('tax-amount').textContent = `${tax.toFixed(2)}`;
    document.getElementById('discount-amount').textContent = `${discount.toFixed(2)}`;
    document.getElementById('final-total').textContent = `${finalTotal.toFixed(2)}`;
  }

  calculateMobileTotals() {
    const includeVatInPrice = window.getIncludeVatInPrice ? window.getIncludeVatInPrice() : false;
    const vatPercent = window.getDefaultVatPercent ? window.getDefaultVatPercent() : 5;
    
    let subtotal, tax, finalTotal;
    
    if (includeVatInPrice) {
      // VAT is already included in item prices
      const totalWithVat = this.currentBill.items.reduce((sum, item) => sum + item.total, 0);
      subtotal = totalWithVat / (1 + vatPercent / 100); // Calculate subtotal without VAT
      tax = totalWithVat - subtotal; // VAT amount
      finalTotal = totalWithVat; // Final total is the same as total with VAT
    } else {
      // Traditional VAT calculation (VAT added on top)
      subtotal = this.currentBill.items.reduce((sum, item) => sum + item.total, 0);
      tax = subtotal * (vatPercent / 100);
      finalTotal = subtotal + tax;
    }
    
    const discount = this.currentBill.discount || 0;
    finalTotal = finalTotal - discount;

    this.currentBill.subtotal = subtotal;
    this.currentBill.tax = tax;
    this.currentBill.discount = discount;
    this.currentBill.finalTotal = finalTotal;

    // Update display
    document.getElementById('mobile-subtotal').textContent = `${subtotal.toFixed(2)}`;
    document.getElementById('mobile-tax-amount').textContent = `${tax.toFixed(2)}`;
    document.getElementById('mobile-discount-amount').textContent = `${discount.toFixed(2)}`;
    document.getElementById('mobile-final-total').textContent = `${finalTotal.toFixed(2)}`;
    
    // Update VAT label
    this.updateMobileVatLabel(vatPercent);
    
    // Update payment method display
    this.updatePaymentMethodDisplay();
    this.updateProcessButtonState();
  }
  
  // Update mobile VAT label
  updateMobileVatLabel(vatPercent) {
    const vatLabel = document.getElementById('mobile-vat-label');
    const vatSummaryRow = document.getElementById('mobile-vat-summary-row');
    
    if (vatLabel && vatSummaryRow) {
      vatLabel.textContent = `Tax (${vatPercent}%):`;
      
      // Check if VAT should be displayed based on configuration
      if (window.shouldDisplayVat && !window.shouldDisplayVat(vatPercent)) {
        vatSummaryRow.style.display = 'none';
      } else {
        vatSummaryRow.style.display = 'flex';
      }
    }
  }
  
  // Initialize VAT configuration
  initializeVatConfig() {
    const vatPercent = window.getDefaultVatPercent ? window.getDefaultVatPercent() : 5;
    this.updateMobileVatLabel(vatPercent);
  }

  clearBill() {
    this.currentBill = {
      items: [],
      customer: null,
      total: 0,
      tax: 0,
      discount: 0,
      finalTotal: 0
    };
    this.updateBillDisplay();
    this.calculateTotals();
    this.showMobileNotification('Bill cleared', 'info');
  }

  clearMobileBill() {
    this.currentBill = {
      items: [],
      customer: null,
      total: 0,
      tax: 0,
      discount: 0,
      discountType: 'percentage',
      discountValue: 0,
      finalTotal: 0,
      paymentMethod: null,
      deliveryDate: this.getDefaultDeliveryDate() // Reset to default delivery date
    };
    this.updateMobileBillDisplay();
    this.calculateMobileTotals();
    this.updateCustomerDisplay();
    this.updatePaymentMethodDisplay();
    this.updateProcessButtonState();
    this.mobileBillDirty = false;
    // Removed notification to prevent "Bill Cleared" message
  }

  async processBill() {
    if (this.currentBill.items.length === 0) {
      this.showMobileNotification('Please add items to the bill first', 'error');
      return;
    }

    try {
      // Save bill to offline storage
      const billData = {
        bill_id: Date.now(),
        items: this.currentBill.items,
        subtotal: this.currentBill.subtotal,
        tax: this.currentBill.tax,
        discount: this.currentBill.discount,
        final_total: this.currentBill.finalTotal,
        created_at: new Date().toISOString(),
        status: 'pending'
      };

      // Save to offline storage
      if (window.TajirPWA && window.TajirPWA.saveOfflineBill) {
        await window.TajirPWA.saveOfflineBill(billData);
      }

      // Show success message
      this.showMobileNotification('Bill processed successfully!', 'success');
      
      // Clear bill
      this.clearBill();
      
      // Print receipt (if printer available)
      this.printReceipt(billData);
      
    } catch (error) {
      console.error('Mobile Billing: Failed to process bill', error);
      this.showMobileNotification('Failed to process bill', 'error');
    }
  }

  async processMobileBill() {
    if (this.currentBill.items.length === 0) {
      this.showMobileNotification('Please add items to the bill first', 'error');
      return;
    }

    try {
      // Save bill to offline storage
      const billData = {
        bill_id: Date.now(), // Add the required bill_id for IndexedDB
        items: this.currentBill.items,
        subtotal: this.currentBill.subtotal,
        tax: this.currentBill.tax,
        total: this.currentBill.finalTotal,
        timestamp: Date.now(),
        status: 'pending'
      };

      // Save to offline storage
      if (window.TajirPWA && window.TajirPWA.offlineStorage) {
        await window.TajirPWA.offlineStorage.saveData('bills', billData);
      }

      // Show success message
      this.showMobileNotification('Bill processed successfully! Items transferred to main billing.', 'success');
      
      // Hide mobile billing interface first (this will sync data)
      this.hideMobileBilling();
      
    } catch (error) {
      console.error('Error processing mobile bill:', error);
      this.showMobileNotification('Failed to process bill', 'error');
    }
  }

  async printBill(billData) {
    try {
      // Check if we have a saved bill ID
      if (billData.bill_id) {
        // Use existing print endpoint
        const printUrl = `${window.location.origin}/api/bills/${billData.bill_id}/print`;
        window.open(printUrl, '_blank');
        // Don't show notification here as it will be handled by resetMobileBillingAfterSuccess
      } else {
        // For draft bills, show a message
        this.showMobileNotification('Please save the bill first to print', 'warning');
      }
    } catch (error) {
      console.error('Error printing bill:', error);
      this.showMobileNotification('Failed to print bill', 'error');
    }
  }

  async sendWhatsApp(billData) {
    try {
      const customerPhone = billData.customer?.phone || billData.customer_phone;
      
      if (!customerPhone) {
        this.showMobileNotification('Customer phone number is required for WhatsApp', 'warning');
        return;
      }

      // Check if we have a saved bill ID
      if (billData.bill_id) {
        // Use existing WhatsApp endpoint
        const whatsappResponse = await fetch(`/api/bills/${billData.bill_id}/whatsapp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: customerPhone,
            language: 'en'
          })
        });

                 if (whatsappResponse.ok) {
           const whatsappResult = await whatsappResponse.json();
           if (whatsappResult.success && whatsappResult.whatsapp_url) {
             window.open(whatsappResult.whatsapp_url, '_blank');
             // Don't show notification here as it will be handled by resetMobileBillingAfterSuccess
           } else {
             throw new Error('Failed to generate WhatsApp link');
           }
         } else {
           throw new Error('Failed to send WhatsApp');
         }
      } else {
        // For draft bills, create a WhatsApp message manually
        const customerName = billData.customer?.name || billData.customer_name || 'Customer';
        const totalAmount = billData.total_amount || '0';
        const billNumber = billData.bill_number || 'Draft';
        const billDate = billData.bill_date || new Date().toLocaleDateString();
        
        // Create detailed bill message
        let message = `*🧾 TAJIR POS - DRAFT BILL*\n\n`;
        message += `*Customer Details:*\n`;
        message += `• Name: ${customerName}\n`;
        if (customerPhone) message += `• Phone: ${customerPhone}\n`;
        
                 message += `\n*Bill Details:*\n`;
         message += `• Bill #: ${billNumber} (Draft)\n`;
         message += `• Date: ${billDate}\n`;
         message += `• Delivery: ${billData.delivery_date || this.currentBill.deliveryDate || 'N/A'}\n`;
         message += `• Subtotal: AED ${billData.subtotal?.toFixed(2) || '0.00'}\n`;
         message += `• Tax (5%): AED ${billData.tax?.toFixed(2) || '0.00'}\n`;
         message += `• Discount: AED ${billData.discount?.toFixed(2) || '0.00'}\n`;
         message += `• Total: AED ${totalAmount}\n\n`;
        
        // Add items details
        if (billData.items && billData.items.length > 0) {
          message += `*Items:*\n`;
          billData.items.forEach((item, index) => {
            message += `${index + 1}. ${item.product_name} - Qty: ${item.quantity} - Rate: AED ${item.price} - Total: AED ${item.total.toFixed(2)}\n`;
          });
          message += `\n`;
        }
        
        message += `*Note: This is a draft bill. Please save it in the POS system for permanent record.*`;
        
        // Encode the message for WhatsApp
        const encodedMessage = encodeURIComponent(message);
        
        // Construct WhatsApp URL
        const cleanPhone = customerPhone.replace(/\D/g, '');
        let phoneWithCode = cleanPhone;
        
        // Handle UAE phone numbers properly
        if (cleanPhone.length > 0) {
          if (cleanPhone.startsWith('971')) {
            phoneWithCode = cleanPhone;
          } else if (cleanPhone.startsWith('0')) {
            phoneWithCode = '971' + cleanPhone.substring(1);
          } else if (cleanPhone.length === 9) {
            phoneWithCode = '971' + cleanPhone;
          } else {
            phoneWithCode = '971' + cleanPhone;
          }
        }
        
                 const whatsappUrl = `https://wa.me/${phoneWithCode}?text=${encodedMessage}`;
         window.open(whatsappUrl, '_blank');
         // Don't show notification here as it will be handled by resetMobileBillingAfterSuccess
      }
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      this.showMobileNotification('Failed to send WhatsApp. Please try again.', 'error');
    }
  }

  generateReceiptHTML(billData) {
    return `
      <div style="font-family: monospace; max-width: 300px; margin: 0 auto;">
        <h2 style="text-align: center;">Tajir POS</h2>
        <hr>
        <div style="text-align: center;">Receipt</div>
        <div style="text-align: center;">${new Date().toLocaleString()}</div>
        <hr>
        ${billData.items.map(item => `
                     <div style="display: flex; justify-content: space-between; margin: 4px 0;">
             <span>${item.product_name}</span>
             <span>${item.total.toFixed(2)}</span>
           </div>
           <div style="font-size: 12px; color: #666;">
             ${item.quantity} x ${item.price}
           </div>
        `).join('')}
        <hr>
                 <div style="display: flex; justify-content: space-between;">
           <span>Subtotal:</span>
           <span>${billData.subtotal.toFixed(2)}</span>
         </div>
         <div style="display: flex; justify-content: space-between;">
           <span>Tax (5%):</span>
           <span>${billData.tax.toFixed(2)}</span>
         </div>
         <div style="display: flex; justify-content: space-between;">
           <span>Discount:</span>
           <span>${billData.discount.toFixed(2)}</span>
         </div>
        <hr>
                 <div style="display: flex; justify-content: space-between; font-weight: bold;">
           <span>Total:</span>
           <span>${billData.final_total.toFixed(2)}</span>
         </div>
        <hr>
        <div style="text-align: center; font-size: 12px;">
          Thank you for your business!
        </div>
      </div>
    `;
  }

  showReceiptModal(billData) {
    const receiptHTML = this.generateReceiptHTML(billData);
    
    if (window.TajirPWA && window.TajirPWA.mobileNavigation) {
      window.TajirPWA.mobileNavigation.showMobileModal(receiptHTML, {
        title: 'Receipt',
        confirmText: 'Print',
        showCancel: true
      });
    }
  }

  showMobileNotification(message, type = 'info') {
    // Prevent duplicate notifications by checking for existing ones
    const existingNotifications = document.querySelectorAll('.mobile-notification');
    existingNotifications.forEach(notification => {
      notification.remove();
    });

    // Debounce notifications to prevent rapid successive calls
    const notificationKey = `${message}-${type}`;
    if (this.lastNotification === notificationKey) {
      return; // Skip duplicate notification
    }

    // Clear any existing timeout
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }

    // Set debounce timeout
    this.notificationTimeout = setTimeout(() => {
      this.lastNotification = null;
    }, 1000);

    this.lastNotification = notificationKey;

    if (window.TajirPWA && window.TajirPWA.mobileNavigation) {
      window.TajirPWA.mobileNavigation.showMobileNotification(message, type);
    } else {
      // Create enhanced custom notification
      const notification = document.createElement('div');
      notification.className = `mobile-notification ${type}`;
      
      // Create enhanced icon based on type
      let icon = '';
      switch (type) {
        case 'success':
          icon = '✅';
          break;
        case 'error':
          icon = '❌';
          break;
        case 'warning':
          icon = '⚠️';
          break;
        default:
          icon = 'ℹ️';
      }
      
      notification.innerHTML = `
        <div>
          <span>${icon}</span>
          <span>${message}</span>
        </div>
      `;

      document.body.appendChild(notification);

      // Show notification with animation
      setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(-50%) translateY(0)';
      }, 100);

      // Hide and remove after 3 seconds
      setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(-50%) translateY(-20px)';
        setTimeout(() => {
          if (notification.parentElement) {
            notification.remove();
          }
        }, 300);
      }, 3000);
    }
  }

  // Method to get current bill data for external access
  getCurrentBill() {
    return this.currentBill;
  }

  // Method to set bill data from external source
  setCurrentBill(billData) {
    this.currentBill = billData;
    this.updateMobileBillDisplay();
    this.calculateMobileTotals();
  }

  // Method to manually trigger sync for testing
  testSync() {
    // Sync test completed
  }

  // Get bill total
  getBillTotal() {
    return this.currentBill.finalTotal;
  }

  // Check if bill has items
  hasItems() {
    return this.currentBill.items.length > 0;
  }

  // Barcode scanning functionality
  initiateBarcodeScan() {
    // Check if barcode scanner module is available
    if (window.TajirPWA && window.TajirPWA.barcodeScanner) {
      window.TajirPWA.barcodeScanner.startScan()
        .then(barcode => {
          this.searchByBarcode(barcode);
        })
        .catch(error => {
          this.showMobileNotification('Barcode scanning failed', 'error');
        });
    } else {
      // Fallback: show manual barcode input
      this.showBarcodeInputModal();
    }
  }

  searchByBarcode(barcode) {
    // Search for product by barcode
    const productCards = document.querySelectorAll('.product-card-mobile');
    let found = false;

    productCards.forEach(card => {
      const productBarcode = card.dataset.barcode;
      if (productBarcode === barcode) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('barcode-found');
        setTimeout(() => {
          card.classList.remove('barcode-found');
        }, 2000);
        found = true;
        this.showMobileNotification('Product found!', 'success');
      }
    });

    if (!found) {
      this.showMobileNotification('Product not found for this barcode', 'warning');
    }
  }

  showBarcodeInputModal() {
    const modal = document.createElement('div');
    modal.className = 'product-details-modal';
    
    modal.innerHTML = `
      <div class="product-modal-content">
        <div class="modal-header">
          <h3>Enter Barcode</h3>
          <button class="close-modal-btn">×</button>
        </div>
        <div class="product-modal-body">
          <input type="text" id="barcode-input" placeholder="Enter barcode number..." class="input-mobile" style="width: 100%; margin-bottom: 16px;">
        </div>
        <div class="product-modal-footer">
          <button class="add-to-bill-modal-btn" id="search-barcode-btn">Search</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const closeBtn = modal.querySelector('.close-modal-btn');
    const searchBtn = modal.querySelector('#search-barcode-btn');
    const barcodeInput = modal.querySelector('#barcode-input');
    
    closeBtn.addEventListener('click', () => {
      modal.remove();
    });
    
    searchBtn.addEventListener('click', () => {
      const barcode = barcodeInput.value.trim();
      if (barcode) {
        this.searchByBarcode(barcode);
        modal.remove();
      } else {
        this.showMobileNotification('Please enter a barcode', 'error');
      }
    });
    
    barcodeInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        searchBtn.click();
      }
    });
    
    // Focus on input
    setTimeout(() => {
      barcodeInput.focus();
    }, 100);
  }

  // ========================================
  // PHASE 3: ENHANCED PAYMENT FLOW METHODS
  // ========================================

  async initiateEnhancedPayment() {
    if (this.currentBill.items.length === 0) {
      this.showMobileNotification('Please add items to the bill first', 'error');
      return;
    }

    if (this.paymentInProgress) {
      return; // Prevent multiple payment attempts
    }

    // Check if customer is selected
    if (!this.currentBill.customer) {
      this.showMobileNotification('Please select a customer before proceeding to payment', 'error');
      this.showCustomerSelection();
      return;
    }

    await this.showPaymentMethodSelection();
  }

  async showPaymentMethodSelection() {
    // Ensure billing configuration is loaded first
    if (!this.billingConfig || !this.billingConfig.default_delivery_days) {
      await this.loadBillingConfiguration();
    }
    
    const modal = document.createElement('div');
    modal.className = 'payment-method-modal';
    modal.innerHTML = `
      <div class="payment-method-content">
        <div class="payment-method-header">
          <h3>Select Payment Method</h3>
          <button class="close-payment-modal">×</button>
        </div>
        <div class="payment-methods">
          <div class="payment-method-option" data-method="cash">
            <div class="payment-method-icon">💵</div>
            <div class="payment-method-info">
              <h4>Cash</h4>
              <p>Pay with cash</p>
            </div>
          </div>
          <div class="payment-method-option" data-method="card">
            <div class="payment-method-icon">💳</div>
            <div class="payment-method-info">
              <h4>Card</h4>
              <p>Credit/Debit card</p>
            </div>
          </div>
          <div class="payment-method-option" data-method="digital">
            <div class="payment-method-icon">📱</div>
            <div class="payment-method-info">
              <h4>Digital Payment</h4>
              <p>Apple Pay, Google Pay</p>
            </div>
          </div>
        </div>
        
        <div class="payment-options">
          <div class="trial-date-section">
            <label>Trial Date (Optional)</label>
            <input type="date" id="mobileTrialDate">
          </div>
          <div class="delivery-date-section">
            <label>Delivery Date</label>
            <input type="date" id="mobileDeliveryDate">
          </div>
          <div class="advance-payment-section">
            <label>Advance Payment (Optional)</label>
            <input type="number" id="mobileAdvancePayment" min="0" step="0.01" placeholder="0">
          </div>
          
          <div class="customer-notes-section">
            <label>Customer Notes (Optional)</label>
            <textarea id="mobileCustomerNotes" rows="2" placeholder="Any special instructions..."></textarea>
          </div>
          
          <div class="employee-assignment-section">
            <label>Assign to Employee (Optional)</label>
            <select id="mobileEmployee">
              <option value="">Select Employee</option>
            </select>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    this.setupPaymentMethodSelection(modal);
    
    // Apply billing configuration to payment modal
    this.applyPaymentConfiguration(modal);

    // Populate employees list if enabled
    if (this.billingConfig.enable_employee_assignment) {
      fetch('/api/employees')
        .then(res => res.json())
        .then(list => {
          const select = modal.querySelector('#mobileEmployee');
          if (select && Array.isArray(list)) {
            list.forEach(emp => {
              const opt = document.createElement('option');
              opt.value = emp.employee_id || emp.id || '';
              opt.textContent = emp.name || `#${opt.value}`;
              select.appendChild(opt);
            });
            // Preselect default employee if configured
            if (this.billingConfig.default_employee_id) {
              select.value = this.billingConfig.default_employee_id;
            }
          }
        })
        .catch((error) => {
          console.error('Error fetching employees:', error);
        });
    }

    // Pre-fill dates
    const trialInput = modal.querySelector('#mobileTrialDate');
    const deliveryInput = modal.querySelector('#mobileDeliveryDate');
    const defaultDeliveryDate = this.getDefaultDeliveryDate();
    const defaultTrialDate = this.getDefaultTrialDate();
    
    if (trialInput) {
      trialInput.value = defaultTrialDate;
    }
    if (deliveryInput) {
      deliveryInput.value = defaultDeliveryDate;
    }
    
    // Sync trial date with delivery date when delivery date changes
    if (deliveryInput && trialInput && this.billingConfig.enable_trial_date && this.billingConfig.enable_delivery_date) {
      deliveryInput.addEventListener('change', () => {
        trialInput.value = deliveryInput.value;
      });
    }
  }

  setupPaymentMethodSelection(modal) {
    const options = modal.querySelectorAll('.payment-method-option');
    
    options.forEach(option => {
      option.addEventListener('click', () => {
        const method = option.dataset.method;
        this.processPayment(method);
        modal.remove();
      });
    });

    const closeBtn = modal.querySelector('.close-payment-modal');
    closeBtn.addEventListener('click', () => {
      modal.remove();
    });

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  async processPayment(method) {
    
    try {
      this.paymentInProgress = true;
      this.currentBill.paymentMethod = method;
      
      // Collect values from configurable fields if they exist
      const advancePaymentInput = document.getElementById('mobileAdvancePayment');
      const customerNotesInput = document.getElementById('mobileCustomerNotes');
      const employeeSelect = document.getElementById('mobileEmployee');
      const trialInput = document.getElementById('mobileTrialDate');
      const deliveryInput = document.getElementById('mobileDeliveryDate');
      
      if (advancePaymentInput && this.billingConfig.enable_advance_payment) {
        this.currentBill.advancePayment = parseFloat(advancePaymentInput.value) || 0;
      }
      
      if (customerNotesInput && this.billingConfig.enable_customer_notes) {
        this.currentBill.customerNotes = customerNotesInput.value || '';
      }
      
      if (employeeSelect && this.billingConfig.enable_employee_assignment) {
        this.currentBill.employeeId = employeeSelect.value || null;
      }
      
      if (trialInput && this.billingConfig.enable_trial_date) {
        this.currentBill.trialDate = trialInput.value || this.getDefaultTrialDate();
      }
      
      if (deliveryInput && this.billingConfig.enable_delivery_date) {
        this.currentBill.deliveryDate = deliveryInput.value || this.getDefaultDeliveryDate();
      }
      
      this.showPaymentProgress();
      
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Process payment based on method
      switch (method) {
        case 'cash':
          await this.processCashPayment();
          break;
        case 'card':
          await this.processCardPayment();
          break;
        case 'digital':
          await this.processDigitalPayment();
          break;
      }
      
      // Save bill to database with complete details
      const savedBillData = await this.saveBillToDatabase(method);
      
      if (savedBillData) {
        this.showPaymentSuccess(savedBillData);
      } else {
        throw new Error('Failed to save bill to database');
      }
    } catch (error) {
      this.showPaymentError(error.message);
    } finally {
      this.paymentInProgress = false;
    }
  }

  showPaymentProgress() {
    const progressModal = document.createElement('div');
    progressModal.className = 'payment-progress-modal';
    progressModal.innerHTML = `
      <div class="payment-progress-content">
        <div class="payment-progress-spinner"></div>
        <h4>Processing Payment...</h4>
        <p>Please wait while we process your payment</p>
      </div>
    `;
    
    document.body.appendChild(progressModal);
  }

  hidePaymentProgress() {
    const progressModal = document.querySelector('.payment-progress-modal');
    if (progressModal) {
      progressModal.remove();
    }
  }

  showPaymentSuccess(billData) {
    this.hidePaymentProgress();
    
    // Store bill data for print and WhatsApp functionality
    this.lastProcessedBill = billData;
    
    const successModal = document.createElement('div');
    successModal.className = 'payment-success-modal';
    successModal.innerHTML = `
      <div class="payment-success-content">
        <div class="payment-success-icon">✅</div>
        <h4>Payment Successful!</h4>
        <p>Your bill has been created successfully</p>
        
        <!-- Bill Summary -->
        <div class="bill-summary-success">
          <div class="bill-info-row">
            <span class="bill-label">Customer:</span>
            <span class="bill-value">${billData.customer?.name || 'N/A'}</span>
          </div>
          <div class="bill-info-row">
            <span class="bill-label">Bill #:</span>
            <span class="bill-value">${billData.bill_number || 'N/A'}</span>
          </div>
          <div class="bill-info-row">
            <span class="bill-label">Subtotal:</span>
            <span class="bill-value">AED ${billData.subtotal?.toFixed(2) || '0.00'}</span>
          </div>
          <div class="bill-info-row">
            <span class="bill-label">Tax (5%):</span>
            <span class="bill-value">AED ${billData.tax?.toFixed(2) || '0.00'}</span>
          </div>
          <div class="bill-info-row">
            <span class="bill-label">Discount:</span>
            <span class="bill-value">AED ${billData.discount?.toFixed(2) || '0.00'}</span>
          </div>
          <div class="bill-info-row">
            <span class="bill-label">Total:</span>
            <span class="bill-value">AED ${billData.total_amount?.toFixed(2) || '0.00'}</span>
          </div>
          <div class="bill-info-row">
            <span class="bill-label">Payment:</span>
            <span class="bill-value">${billData.payment_method || 'N/A'}</span>
          </div>
                     <div class="bill-info-row">
             <span class="bill-label">Date:</span>
             <span class="bill-value">${billData.bill_date || 'N/A'}</span>
           </div>
           <div class="bill-info-row">
             <span class="bill-label">Delivery:</span>
             <span class="bill-value">${billData.delivery_date || this.currentBill.deliveryDate || 'N/A'}</span>
           </div>
        </div>
        
        <div class="payment-success-actions">
          <button class="print-receipt-btn" title="Print bill receipt">
            <span class="btn-icon">📄</span>
            <span class="btn-text">Print</span>
          </button>
          <button class="whatsapp-btn" title="Send bill via WhatsApp">
            <span class="btn-icon">📱</span>
            <span class="btn-text">WhatsApp</span>
          </button>
          <button class="new-bill-btn" title="Start a new bill">
            <span class="btn-icon">🆕</span>
            <span class="btn-text">New Bill</span>
          </button>
          <button class="close-success-btn" title="Close">
            <span class="btn-icon">✕</span>
            <span class="btn-text">Close</span>
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(successModal);
    this.setupEnhancedSuccessModal(successModal, billData);
  }

  setupEnhancedSuccessModal(modal, billData) {
    const printBtn = modal.querySelector('.print-receipt-btn');
    const whatsappBtn = modal.querySelector('.whatsapp-btn');
    const newBillBtn = modal.querySelector('.new-bill-btn');
    const closeBtn = modal.querySelector('.close-success-btn');
    
    printBtn.addEventListener('click', () => {
      this.printBill(billData);
      this.resetMobileBillingAfterSuccess();
      modal.remove();
    });
    
    whatsappBtn.addEventListener('click', () => {
      this.sendWhatsApp(billData);
      this.resetMobileBillingAfterSuccess();
      modal.remove();
    });
    
    newBillBtn.addEventListener('click', () => {
      this.startNewBill();
      modal.remove();
    });

    closeBtn.addEventListener('click', () => {
      this.resetMobileBillingAfterSuccess();
      modal.remove();
    });

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.resetMobileBillingAfterSuccess();
        modal.remove();
      }
    });
  }

  showPaymentError(message) {
    this.hidePaymentProgress();
    this.showMobileNotification(message || 'Payment failed', 'error');
  }

  async processCashPayment() {
    // Simulate cash payment processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.showMobileNotification('Cash payment processed', 'success');
  }

  async processCardPayment() {
    // Simulate card payment processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    this.showMobileNotification('Card payment processed', 'success');
  }

  async processDigitalPayment() {
    // Simulate digital payment processing
    await new Promise(resolve => setTimeout(resolve, 1200));
    this.showMobileNotification('Digital payment processed', 'success');
  }

  // Customer Selection Methods
  showCustomerSelection() {
    const modal = document.createElement('div');
    modal.className = 'product-details-modal';
    
    modal.innerHTML = `
      <div class="product-modal-content">
        <div class="modal-header">
          <h3>Select Customer</h3>
          <button class="close-modal-btn">×</button>
        </div>
        <div class="product-modal-body">
          <!-- Search Section -->
          <div class="customer-search-section">
            <input type="text" id="customer-search-input" placeholder="Search customers..." class="customer-search-input">
            <button id="add-new-customer-btn" class="add-new-customer-btn">+ Add New</button>
          </div>
          
          <!-- Customer List -->
          <div id="customer-list-container" class="customer-list-container">
            <div class="loading-customers">Loading customers...</div>
          </div>
          
                     <!-- Add New Customer Form (Hidden by default) -->
           <div id="add-customer-form" class="add-customer-form" style="display: none;">
             <h4>Add New Customer</h4>
             <div class="form-group">
               <label for="new-customer-name">Name *</label>
               <input type="text" id="new-customer-name" placeholder="Customer name" required>
             </div>
             <div class="form-group">
               <label for="new-customer-phone">Phone</label>
               <input type="tel" id="new-customer-phone" placeholder="+971 50 123 4567">
             </div>
             <div class="form-group">
               <label for="new-customer-city">City</label>
               <input type="text" id="new-customer-city" placeholder="Dubai, Abu Dhabi, etc.">
             </div>
             <div class="form-group">
               <label for="new-customer-area">Area</label>
               <input type="text" id="new-customer-area" placeholder="Deira, Bur Dubai, etc.">
             </div>
             <div class="form-group">
               <label for="new-customer-address">Address</label>
               <textarea id="new-customer-address" placeholder="Customer address"></textarea>
             </div>
             <div class="form-group">
               <label for="new-customer-type">Customer Type</label>
               <select id="new-customer-type">
                 <option value="Individual">Individual</option>
                 <option value="Business">Business</option>
               </select>
             </div>
             <div class="form-actions">
               <button id="save-customer-btn" class="save-customer-btn">Save Customer</button>
               <button id="cancel-add-customer-btn" class="cancel-add-customer-btn">Cancel</button>
             </div>
           </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    this.setupEnhancedCustomerSelection(modal);
  }

  setupEnhancedCustomerSelection(modal) {
    // Load customers and setup search
    this.loadAllCustomers(modal);
    this.setupCustomerSearch(modal);
    this.setupAddCustomerForm(modal);
    
    const closeBtn = modal.querySelector('.close-modal-btn');
    closeBtn.addEventListener('click', () => {
      modal.remove();
    });

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  async loadAllCustomers(modal) {
    try {
      const response = await fetch('/api/customers');
      const customers = await response.json();
      
      const container = modal.querySelector('#customer-list-container');
      this.renderCustomerList(container, customers, modal);
    } catch (error) {
      console.error('Error loading customers:', error);
      const container = modal.querySelector('#customer-list-container');
      container.innerHTML = '<div class="error-loading">Failed to load customers. Please try again.</div>';
    }
  }

  renderCustomerList(container, customers, modal) {
    if (customers.length === 0) {
      container.innerHTML = '<div class="no-customers">No customers found. Add a new customer to get started.</div>';
      return;
    }

        const customerHtml = customers.map(customer => `
                 <div class="customer-option" data-customer-id="${customer.customer_id}" data-customer-name="${customer.name || ''}" data-customer-phone="${customer.phone || ''}" data-customer-city="${customer.city || ''}" data-customer-area="${customer.area || ''}" data-customer-address="${customer.address || ''}">
        <div class="customer-avatar">${(customer.name || 'U').charAt(0).toUpperCase()}</div>
        <div class="customer-info">
            <h5>${customer.name || 'Unknown Customer'}</h5>
            <p>${customer.phone || 'No phone number'}</p>
            ${customer.address ? `<small>${customer.address}</small>` : ''}
        </div>
      </div>
    `).join('');

    container.innerHTML = customerHtml;
    
    // Add click handlers to customer options
    const customerOptions = container.querySelectorAll('.customer-option');
    customerOptions.forEach(option => {
             option.addEventListener('click', () => {
         const customerId = option.dataset.customerId;
         const customerName = option.dataset.customerName;
         const customerPhone = option.dataset.customerPhone;
         const customerCity = option.dataset.customerCity;
         const customerArea = option.dataset.customerArea;
         
         this.selectCustomer(customerId, customerName, customerPhone, customerCity, customerArea);
         modal.remove();
       });
    });
  }

  setupCustomerSearch(modal) {
    const searchInput = modal.querySelector('#customer-search-input');
    let searchTimeout;

    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.searchCustomers(e.target.value, modal);
      }, 300);
    });
  }

  async searchCustomers(query, modal) {
    try {
      const response = await fetch(`/api/customers?search=${encodeURIComponent(query)}`);
      const customers = await response.json();
      
      const container = modal.querySelector('#customer-list-container');
      this.renderCustomerList(container, customers, modal);
    } catch (error) {
      console.error('Error searching customers:', error);
    }
  }

  setupAddCustomerForm(modal) {
    const addNewBtn = modal.querySelector('#add-new-customer-btn');
    const addForm = modal.querySelector('#add-customer-form');
    const customerList = modal.querySelector('#customer-list-container');
    const searchSection = modal.querySelector('.customer-search-section');

    addNewBtn.addEventListener('click', () => {
      // Show form, hide list and search
      addForm.style.display = 'block';
      customerList.style.display = 'none';
      searchSection.style.display = 'none';
    });

    const cancelBtn = modal.querySelector('#cancel-add-customer-btn');
    cancelBtn.addEventListener('click', () => {
      // Hide form, show list and search
      addForm.style.display = 'none';
      customerList.style.display = 'block';
      searchSection.style.display = 'block';
      this.loadAllCustomers(modal);
    });

    const saveBtn = modal.querySelector('#save-customer-btn');
    saveBtn.addEventListener('click', () => {
      this.saveNewCustomer(modal);
    });
  }

  async saveNewCustomer(modal) {
    const nameInput = modal.querySelector('#new-customer-name');
    const phoneInput = modal.querySelector('#new-customer-phone');
    const cityInput = modal.querySelector('#new-customer-city');
    const areaInput = modal.querySelector('#new-customer-area');
    const addressInput = modal.querySelector('#new-customer-address');
    const typeInput = modal.querySelector('#new-customer-type');

    const customerData = {
      name: nameInput.value.trim(),
      phone: phoneInput.value.trim(),
      city: cityInput.value.trim(),
      area: areaInput.value.trim(),
      address: addressInput.value.trim(),
      customer_type: typeInput.value
    };

    if (!customerData.name) {
      this.showMobileNotification('Customer name is required', 'error');
      return;
    }

    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(customerData)
      });

             if (response.ok) {
         const newCustomer = await response.json();
         
         // Auto-select the newly created customer
         
                   // Auto-select the newly created customer
          // Handle different possible response structures
          const customerId = newCustomer.id || newCustomer.customer_id;
          const customerName = newCustomer.name || newCustomer.customer_name || customerData.name;
          const customerPhone = newCustomer.phone || newCustomer.mobile || customerData.phone;
          const customerCity = newCustomer.city || customerData.city || '';
          const customerArea = newCustomer.area || customerData.area || '';
          
          if (customerId && customerName) {
            this.selectCustomer(customerId, customerName, customerPhone, customerCity, customerArea);
            modal.remove();
            this.showMobileNotification('Customer added successfully', 'success');
          } else {
            this.showMobileNotification('Customer added but failed to select. Please select manually.', 'warning');
            modal.remove();
          }
       } else {
        const error = await response.json();
        this.showMobileNotification(error.error || 'Failed to add customer', 'error');
      }
    } catch (error) {
      console.error('Error adding customer:', error);
      this.showMobileNotification('Failed to add customer. Please try again.', 'error');
    }
  }

  selectCustomer(customerId, customerName, customerPhone, customerCity = '', customerArea = '') {
    // Ensure we have valid customer data
    if (!customerId || !customerName) {
      this.showMobileNotification('Invalid customer data', 'error');
      return;
    }
    
    this.currentBill.customer = {
      id: customerId,
      name: customerName || 'Unknown Customer',
      phone: customerPhone || '',
      city: customerCity || '',
      area: customerArea || ''
    };
    
    this.updateCustomerDisplay();
    this.updateProcessButtonState();
    this.showMobileNotification(`Customer selected: ${customerName}`, 'success');
  }

  updateCustomerDisplay() {
    const display = document.getElementById('selected-customer-display');
    const avatar = document.getElementById('customer-avatar');
    const name = document.getElementById('customer-name');
    const phone = document.getElementById('customer-phone');
    
    if (this.currentBill.customer && this.currentBill.customer.name) {
      display.style.display = 'block';
      avatar.textContent = (this.currentBill.customer.name || 'U').charAt(0).toUpperCase();
      name.textContent = this.currentBill.customer.name || 'Unknown Customer';
      phone.textContent = this.currentBill.customer.phone || 'No phone number';
    } else {
      display.style.display = 'none';
    }
  }

  // Discount Management Methods
  updateDiscount(value) {
    this.currentBill.discountValue = parseFloat(value) || 0;
    this.calculateMobileTotals();
    this.mobileBillDirty = true;
  }

  setDiscountType(type) {
    this.currentBill.discountType = type;
    
    // Update UI
    const buttons = document.querySelectorAll('.discount-type-btn');
    buttons.forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.type === type) {
        btn.classList.add('active');
      }
    });
    
    this.calculateMobileTotals();
    this.mobileBillDirty = true;
  }

  // Enhanced Total Calculation
  calculateMobileTotals() {
    const subtotal = this.currentBill.items.reduce((sum, item) => sum + item.total, 0);
    const vatPercent = window.getDefaultVatPercent ? window.getDefaultVatPercent() : 5;
    const tax = subtotal * (vatPercent / 100); // Calculate VAT based on config
    
    // Calculate discount
    let discount = 0;
    if (this.currentBill.discountType === 'percentage') {
      discount = subtotal * (this.currentBill.discountValue / 100);
    } else {
      discount = this.currentBill.discountValue;
    }
    
    const finalTotal = subtotal + tax - discount;

    this.currentBill.subtotal = subtotal;
    this.currentBill.tax = tax;
    this.currentBill.discount = discount;
    this.currentBill.finalTotal = finalTotal;

    // Update display
    document.getElementById('mobile-subtotal').textContent = `${subtotal.toFixed(2)}`;
    document.getElementById('mobile-tax-amount').textContent = `${tax.toFixed(2)}`;
    document.getElementById('mobile-discount-amount').textContent = `${discount.toFixed(2)}`;
    document.getElementById('mobile-final-total').textContent = `${finalTotal.toFixed(2)}`;
    
    // Update VAT label
    this.updateMobileVatLabel(vatPercent);
    
    // Update payment method display
    this.updatePaymentMethodDisplay();
    this.updateProcessButtonState();
  }

  updatePaymentMethodDisplay() {
    const display = document.getElementById('payment-method-display');
    const icon = document.getElementById('payment-method-icon');
    const text = document.getElementById('payment-method-text');
    
    if (this.currentBill.paymentMethod) {
      display.style.display = 'flex';
      
      switch (this.currentBill.paymentMethod) {
        case 'cash':
          icon.textContent = '💵';
          text.textContent = 'Cash';
          break;
        case 'card':
          icon.textContent = '💳';
          text.textContent = 'Card';
          break;
        case 'digital':
          icon.textContent = '📱';
          text.textContent = 'Digital';
          break;
      }
    } else {
      display.style.display = 'none';
    }
  }

  updateProcessButtonState() {
    const processBtn = document.getElementById('mobile-process-bill-btn');
    if (!processBtn) return;
    
    const hasItems = this.currentBill.items.length > 0;
    const hasCustomer = this.currentBill.customer;
    
    if (!hasItems) {
      processBtn.textContent = 'Add Items First';
      processBtn.disabled = true;
      processBtn.classList.add('disabled');
    } else if (!hasCustomer) {
      processBtn.textContent = 'Select Customer';
      processBtn.disabled = false;
      processBtn.classList.remove('disabled');
    } else {
      processBtn.textContent = 'Process Bill';
      processBtn.disabled = false;
      processBtn.classList.remove('disabled');
    }
  }

  printReceipt() {
    // Generate and print receipt
    const receiptData = {
      items: this.currentBill.items,
      subtotal: this.currentBill.subtotal,
      tax: this.currentBill.tax,
      discount: this.currentBill.discount,
      total: this.currentBill.finalTotal,
      customer: this.currentBill.customer,
      paymentMethod: this.currentBill.paymentMethod,
      timestamp: new Date().toISOString()
    };
    
    this.generateReceiptHTML(receiptData);
    this.showMobileNotification('Receipt printed successfully', 'success');
  }

  startNewBill() {
    this.clearMobileBill();
    this.showMobileNotification('New bill started', 'success');
  }

  // Get default delivery date (3 days from today)
  getDefaultDeliveryDate() {
    const today = new Date();
    const delivery = new Date();
    const defaultDays = this.billingConfig?.default_delivery_days || 3;
    delivery.setDate(today.getDate() + defaultDays);
    return delivery.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  getDefaultTrialDate() {
    // Trial date should be the same as delivery date
    return this.getDefaultDeliveryDate();
  }

  // Reset mobile billing after successful bill operations
  resetMobileBillingAfterSuccess() {
    // Clear the current bill
    this.clearMobileBill();
    
    // Reset payment progress state
    this.paymentInProgress = false;
    
    // Clear any existing notifications
    const existingNotifications = document.querySelectorAll('.mobile-notification');
    existingNotifications.forEach(notification => {
      notification.remove();
    });
    
    // Reset the process button state
    this.updateProcessButtonState();
    
    // Show success notification
    this.showMobileNotification('Bill completed successfully. Ready for next bill.', 'success');
  }

  // Save bill to database with complete details
  async saveBillToDatabase(paymentMethod) {
    try {
      // Check if we have items and customer
      if (this.currentBill.items.length === 0) {
        this.showMobileNotification('No items in bill to save', 'error');
        return null;
      }

      if (!this.currentBill.customer) {
        this.showMobileNotification('Customer information is required', 'error');
        return null;
      }

      // Generate bill number
      const timestamp = Date.now();
      const billNumber = `BILL-${timestamp}`;

      // Calculate totals
      const subtotal = this.currentBill.items.reduce((sum, item) => sum + item.total, 0);
      const vatPercent = window.getDefaultVatPercent ? window.getDefaultVatPercent() : 5;
      const tax = subtotal * (vatPercent / 100); // Calculate VAT based on config
      const discount = this.currentBill.discount || 0;
      const finalTotal = subtotal + tax - discount;

      // Prepare bill items in the format expected by the API
      const billItems = this.currentBill.items.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        rate: item.price,
        discount: 0, // No discount per item in mobile billing
        advance_paid: 0, // No advance per item in mobile billing
        total: item.total,
        vat_amount: item.total * (vatPercent / 100) // Calculate VAT per item based on config
      }));

             // Prepare bill data in the format expected by the API
       const billData = {
         bill: {
           bill_number: billNumber,
           customer_name: this.currentBill.customer.name,
           customer_phone: this.currentBill.customer.phone,
           customer_city: this.currentBill.customer.city || '',
           customer_area: this.currentBill.customer.area || '',
           customer_trn: '',
           customer_type: 'Individual',
           business_name: '',
           business_address: '',
           bill_date: new Date().toLocaleDateString(),
           delivery_date: this.billingConfig.enable_delivery_date ? (this.currentBill.deliveryDate || this.getDefaultDeliveryDate()) : '',
           trial_date: this.billingConfig.enable_trial_date ? (this.currentBill.trialDate || this.getDefaultTrialDate()) : '',
            advance_payment: this.billingConfig.enable_advance_payment ? (this.currentBill.advancePayment || 0) : 0,
            customer_notes: this.billingConfig.enable_customer_notes ? (this.currentBill.customerNotes || '') : '',
            employee_id: this.billingConfig.enable_employee_assignment ? (this.currentBill.employeeId || null) : null,
           master_id: null, // No master selection in mobile billing
           master_name: '',
           notes: '',
           subtotal: subtotal,
           discount: discount,
           vat_amount: tax,
           should_show_vat: window.shouldDisplayVat ? window.shouldDisplayVat(vatPercent) : true, // VAT display flag
           total_amount: finalTotal,
           advance_paid: 0, // No advance in mobile billing
           balance_amount: finalTotal,
           payment_method: paymentMethod
         },
         items: billItems
       };

      // Save bill to database
      const response = await fetch('/api/bills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(billData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save bill');
      }

      const result = await response.json();
      
             if (result.bill_id) {
         // Return complete bill data for success modal
         return {
           bill_id: result.bill_id,
           customer: this.currentBill.customer,
           bill_number: billNumber,
           total_amount: finalTotal,
           bill_date: new Date().toLocaleDateString(),
           delivery_date: this.billingConfig.enable_delivery_date ? (this.currentBill.deliveryDate || this.getDefaultDeliveryDate()) : '',
           items: this.currentBill.items,
           payment_method: paymentMethod,
           subtotal: subtotal,
           tax: tax,
           discount: discount
         };
       } else {
         throw new Error('No bill ID returned from server');
       }

    } catch (error) {
      console.error('Error saving bill to database:', error);
      this.showMobileNotification('Failed to save bill: ' + error.message, 'error');
      return null;
    }
  }

  // Load billing configuration from shop settings
  async loadBillingConfiguration() {
      try {
          const response = await fetch('/api/shop-settings/billing-config');
          const data = await response.json();
          
          if (data.success) {
              this.billingConfig = data.config;
              this.applyBillingConfiguration();
          }
      } catch (error) {
          console.error('Error loading billing configuration:', error);
          // Use default configuration
          this.applyBillingConfiguration();
      }
  }

    // Apply billing configuration to show/hide fields in mobile billing
  applyBillingConfiguration() {
    // This will be called when the mobile billing interface is shown
    // We'll apply the configuration in showMobileBilling and other relevant methods
  }
  
  // Apply billing configuration to payment modal
  applyPaymentConfiguration(modal) {
    // Trial Date field
    const trialSection = modal.querySelector('.trial-date-section');
    if (trialSection) {
      const shouldShow = this.billingConfig.enable_trial_date;
      trialSection.style.display = shouldShow ? '' : 'none';
    }
    
    // Delivery Date field
    const deliverySection = modal.querySelector('.delivery-date-section');
    if (deliverySection) {
      const shouldShow = this.billingConfig.enable_delivery_date;
      deliverySection.style.display = shouldShow ? '' : 'none';
    }
    // Advance Payment field
    const advancePaymentSection = modal.querySelector('.advance-payment-section');
    if (advancePaymentSection) {
      if (this.billingConfig.enable_advance_payment) {
        advancePaymentSection.style.display = '';
      } else {
        advancePaymentSection.style.display = 'none';
        // Clear advance payment if disabled
        const advanceInput = modal.querySelector('#mobileAdvancePayment');
        if (advanceInput) {
          advanceInput.value = '';
        }
      }
    }
    
    // Customer Notes field
    const customerNotesSection = modal.querySelector('.customer-notes-section');
    if (customerNotesSection) {
      if (this.billingConfig.enable_customer_notes) {
        customerNotesSection.style.display = '';
      } else {
        customerNotesSection.style.display = 'none';
        // Clear customer notes if disabled
        const notesInput = modal.querySelector('#mobileCustomerNotes');
        if (notesInput) {
          notesInput.value = '';
        }
      }
    }
    
    // Employee Assignment field
    const employeeSection = modal.querySelector('.employee-assignment-section');
    if (employeeSection) {
      if (this.billingConfig.enable_employee_assignment) {
        employeeSection.style.display = '';
      } else {
        employeeSection.style.display = 'none';
        // Clear employee assignment if disabled
        const employeeSelect = modal.querySelector('#mobileEmployee');
        if (employeeSelect) {
          employeeSelect.value = '';
        }
      }
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.MobileBilling;
}
} // Close the if (typeof window.MobileBilling === 'undefined') block 