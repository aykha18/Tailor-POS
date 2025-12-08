/**
 * Mobile Billing System V2 - Enhanced Implementation
 * Based on Mobile Billing Enhancement Plan
 */

class MobileBillingV2 {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 4;
    this.products = [];
    this.customers = [];
    this.vatRate = 5;
    this.availableCities = [];
    this.availableAreas = [];
    this.currentBill = {
      items: [],
      customer: null,
      subtotal: 0,
      discount: 0,
      discountAmount: 0,
      vat: 0,
      total: 0,
      advance: 0,
      balance: 0
    };
    this.lastProcessedBill = null;
    this.init();
  }

  async init() {
    console.log('MobileBillingV2: Initializing...');
    try {
      await this.loadData();
      this.createUI();
      this.bindEvents();
      this.showStep(1);
      console.log('MobileBillingV2: Initialization completed successfully');
    } catch (error) {
      console.error('MobileBillingV2: Error during initialization:', error);
    }
  }

  async loadData() {
    try {
      await Promise.all([
        this.loadProducts(),
        this.loadCustomers(),
        this.loadVatRate(),
        this.loadCities(),
        this.loadAreasForModal()
      ]);
    } catch (error) {
      console.error('MobileBillingV2: Error loading data:', error);
    }
  }

  createUI() {
    const container = document.createElement('div');
    container.className = 'mobile-billing-container-v2';
    container.style.display = 'none'; // Start hidden
    container.innerHTML = `
      <div class="mobile-billing-header">
        <h2>Mobile Billing</h2>
        <button class="close-btn" id="close-mobile-billing-v2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- Step Progress Bar -->
      <div class="step-progress">
        <div class="step-indicator active" data-step="1">
          <div class="step-number">1</div>
          <div class="step-label">Products</div>
        </div>
        <div class="step-indicator" data-step="2">
          <div class="step-number">2</div>
          <div class="step-label">Customer</div>
        </div>
        <div class="step-indicator" data-step="3">
          <div class="step-number">3</div>
          <div class="step-label">Summary</div>
        </div>
        <div class="step-indicator" data-step="4">
          <div class="step-number">4</div>
          <div class="step-label">Complete</div>
        </div>
      </div>

      <!-- Step Content -->
      <div class="step-content">
        <!-- Step 1: Select Products -->
        <div class="step-panel" id="step-1">
          <div class="step-header">
            <h3>Step 1: Select Products</h3>
            <p>Search and add products to your bill</p>
          </div>
          
          <div class="search-section">
            <div class="search-container">
              <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input type="text" class="product-search-input" placeholder="Search products..." id="product-search-input">
              <button class="barcode-scan-btn" id="barcode-scan-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
                  <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
                  <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
                  <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
                </svg>
              </button>
            </div>
          </div>

          <div class="product-section">
            <div class="mobile-product-grid-v2" id="mobile-product-grid-v2">
              <!-- Products will be loaded here -->
            </div>
          </div>

          <div class="selected-items-summary">
            <h4>Selected Items: <span id="selected-items-count">0</span></h4>
            <div class="selected-items-list" id="selected-items-list">
              <!-- Selected items will be shown here -->
            </div>
          </div>
        </div>

        <!-- Step 2: Add/Select Customer -->
        <div class="step-panel" id="step-2" style="display: none;">
          <div class="step-header">
            <h3>Step 2: Customer Information</h3>
            <p>Select existing customer or add a new one</p>
          </div>

          <div class="customer-selection-section">
            <div class="customer-search-section">
              <input type="text" class="customer-search-input" placeholder="Search customers..." id="customer-search-input">
              <button class="add-new-customer-btn" id="add-new-customer-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add New
              </button>
            </div>

            <div class="customer-list" id="customer-list">
              <!-- Customers will be loaded here -->
            </div>

            <div class="selected-customer-display" id="selected-customer-display" style="display: none;">
              <h4>Selected Customer:</h4>
              <div class="customer-info" id="selected-customer-info">
                <!-- Selected customer info will be shown here -->
              </div>
            </div>
          </div>
        </div>

        <!-- Step 3: Bill Summary -->
        <div class="step-panel" id="step-3" style="display: none;">
          <div class="step-header">
            <h3>Step 3: Bill Summary</h3>
            <p>Review and adjust bill details</p>
          </div>

          <div class="bill-summary" id="bill-summary">
            <!-- Bill summary will be generated here -->
          </div>
        </div>

        <!-- Step 4: Final Actions -->
        <div class="step-panel" id="step-4" style="display: none;">
          <div class="step-header">
            <h3>Step 4: Complete Bill</h3>
            <p>Process bill and choose actions</p>
          </div>

          <div class="final-actions" id="final-actions">
            <!-- Final actions will be shown here -->
          </div>
        </div>
      </div>

      <!-- Navigation Buttons -->
      <div class="step-navigation">
        <button class="nav-btn prev-btn" id="prev-btn" style="display: none;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15,18 9,12 15,6"></polyline>
          </svg>
          Previous
        </button>
        <button class="nav-btn next-btn" id="next-btn">
          Next
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9,18 15,12 9,6"></polyline>
          </svg>
        </button>
      </div>

      <!-- Modals -->
      <div class="customer-modal" id="customer-modal">
        <div class="customer-modal-content">
          <div class="customer-modal-header">
            <h3>Select Customer</h3>
            <button class="close-modal-btn" id="close-customer-modal">×</button>
          </div>
          <div class="customer-search-section">
            <input type="text" class="customer-search-input" placeholder="Search customers..." id="modal-customer-search">
            <button class="add-new-customer-btn" id="modal-add-new-customer-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add New
            </button>
          </div>
          <div class="customer-list" id="modal-customer-list">
            <!-- Customers will be loaded here -->
          </div>
        </div>
      </div>

      <div class="add-customer-modal" id="add-customer-modal">
        <div class="add-customer-modal-content">
          <div class="customer-modal-header">
            <h3>Add New Customer</h3>
            <button class="close-modal-btn" id="close-add-customer-modal">×</button>
          </div>
          <form class="add-customer-form" id="add-customer-form">
            <div class="form-group">
              <label for="customer-name">Name *</label>
              <input type="text" id="customer-name" name="name" required>
            </div>
            <div class="form-group">
              <label for="customer-mobile">Mobile *</label>
              <input type="tel" id="customer-mobile" name="mobile" required>
            </div>
            <div class="form-group">
              <label for="customer-city">City</label>
              <select id="customer-city" name="city">
                <option value="">Select City</option>
              </select>
            </div>
            <div class="form-group area-autocomplete-container">
              <label for="customer-area">Area</label>
              <input type="text" id="customer-area" name="area" placeholder="Type to search areas...">
              <div class="area-suggestions" id="area-suggestions"></div>
            </div>
            <div class="form-actions">
              <button type="button" class="cancel-btn" id="cancel-add-customer">Cancel</button>
              <button type="submit" class="submit-btn">Add Customer</button>
            </div>
          </form>
        </div>
      </div>

      <div class="payment-success-modal" id="payment-success-modal">
        <div class="payment-success-modal-content">
          <div class="success-header">
            <div class="success-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22,4 12,14.01 9,11.01"></polyline>
              </svg>
            </div>
            <h3>Bill Processed Successfully!</h3>
          </div>
          <div class="bill-details" id="success-bill-details">
            <!-- Bill details will be shown here -->
          </div>
          <div class="action-buttons">
            <button class="action-btn print-btn" id="print-bill-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6,9 6,2 18,2 18,9"></polyline>
                <path d="M6,18H4a2,2,0,0,1-2-2V11a2,2,0,0,1,2-2H20a2,2,0,0,1,2,2v5a2,2,0,0,1-2,2H18"></path>
                <polyline points="6,14 6,18 18,18 18,14"></polyline>
              </svg>
              Print Bill
            </button>
            <button class="action-btn whatsapp-btn" id="whatsapp-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              Share
            </button>
            <button class="action-btn new-bill-btn" id="new-bill-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              New Bill
            </button>
            <button class="action-btn" id="close-success-modal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              Close
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(container);
    this.container = container;
  }

  bindEvents() {
    // Set element references
    this.productGrid = document.getElementById('mobile-product-grid-v2');
    this.billSummary = document.getElementById('bill-summary');
    this.billItems = document.getElementById('mobile-bill-items-v2');
    
    // Close button
    document.getElementById('close-mobile-billing-v2').addEventListener('click', () => {
      this.hide();
    });

    // Navigation buttons
    document.getElementById('prev-btn').addEventListener('click', () => {
      this.previousStep();
    });

    document.getElementById('next-btn').addEventListener('click', () => {
      this.nextStep();
    });

    // Product search
    document.getElementById('product-search-input').addEventListener('input', (e) => {
      this.filterProducts(e.target.value);
    });

    // Customer search
    document.getElementById('customer-search-input').addEventListener('input', (e) => {
      this.filterCustomers(e.target.value);
    });

    // Add new customer buttons
    document.getElementById('add-new-customer-btn').addEventListener('click', () => {
      this.showAddCustomerModal();
    });

    document.getElementById('modal-add-new-customer-btn').addEventListener('click', () => {
      this.showAddCustomerModal();
    });

    // Modal close buttons
    document.getElementById('close-customer-modal').addEventListener('click', () => {
      this.hideCustomerModal();
    });

    document.getElementById('close-add-customer-modal').addEventListener('click', () => {
      this.hideAddCustomerModal();
    });

    document.getElementById('close-success-modal').addEventListener('click', () => {
      this.hidePaymentSuccessModal();
    });

    // Add customer form
    document.getElementById('add-customer-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.addNewCustomer();
    });

    // Success modal actions
    document.getElementById('print-bill-btn').addEventListener('click', () => {
      this.printBill();
    });

    document.getElementById('new-bill-btn').addEventListener('click', () => {
      this.startNewBill();
    });

    // City change for area autocomplete
    document.getElementById('customer-city').addEventListener('change', (e) => {
      this.onCityChange(e.target.value);
    });

    // Area input for autocomplete
    document.getElementById('customer-area').addEventListener('input', (e) => {
      this.filterAreasByInput(e.target.value);
    });
  }

  showStep(step) {
    this.currentStep = step;
    
    // Hide all step panels
    document.querySelectorAll('.step-panel').forEach(panel => {
      panel.style.display = 'none';
    });

    // Show current step panel
    document.getElementById(`step-${step}`).style.display = 'block';

    // Update step indicators
    document.querySelectorAll('.step-indicator').forEach((indicator, index) => {
      indicator.classList.remove('active', 'completed');
      if (index + 1 < step) {
        indicator.classList.add('completed');
      } else if (index + 1 === step) {
        indicator.classList.add('active');
      }
    });

    // Update navigation buttons
    this.updateNavigationButtons();

    // Load step-specific content
    this.loadStepContent(step);
  }

  loadStepContent(step) {
    switch (step) {
      case 1:
        console.log('MobileBillingV2: Loading Step 1 content');
        console.log('MobileBillingV2: Products available:', this.products.length);
        this.updateProductGrid(this.products);
        this.updateSelectedItemsDisplay();
        break;
      case 2:
        this.updateCustomerList(this.customers);
        this.updateSelectedCustomerDisplay();
        break;
      case 3:
        this.updateBillSummary();
        break;
      case 4:
        this.updateFinalActions();
        break;
    }
  }

  updateNavigationButtons() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    // Previous button
    if (this.currentStep === 1) {
      prevBtn.style.display = 'none';
    } else {
      prevBtn.style.display = 'flex';
    }

    // Next button
    if (this.currentStep === this.totalSteps) {
      nextBtn.textContent = 'Complete';
      nextBtn.onclick = () => this.processBill();
    } else {
      nextBtn.textContent = 'Next';
      nextBtn.onclick = () => this.nextStep();
    }
  }

  nextStep() {
    if (this.canProceedToNextStep()) {
      this.showStep(this.currentStep + 1);
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.showStep(this.currentStep - 1);
    }
  }

  canProceedToNextStep() {
    switch (this.currentStep) {
      case 1:
        if (this.currentBill.items.length === 0) {
          this.showNotification('Please add at least one product to continue', 'error');
          return false;
        }
        break;
      case 2:
        if (!this.currentBill.customer) {
          this.showNotification('Please select a customer to continue', 'error');
          return false;
        }
        break;
      case 3:
        // Always allow proceeding from summary to final step
        break;
    }
    return true;
  }

  updateSelectedItemsDisplay() {
    const countElement = document.getElementById('selected-items-count');
    const listElement = document.getElementById('selected-items-list');
    
    countElement.textContent = this.currentBill.items.length;
    
    if (this.currentBill.items.length === 0) {
      listElement.innerHTML = '<p class="empty-message">No items selected</p>';
    } else {
      listElement.innerHTML = this.currentBill.items.map(item => `
        <div class="selected-item">
          <span class="item-name">${item.name}</span>
          <span class="item-quantity">x${item.quantity}</span>
          <span class="item-total">AED ${item.total.toFixed(2)}</span>
        </div>
      `).join('');
    }
  }

  updateSelectedCustomerDisplay() {
    const displayElement = document.getElementById('selected-customer-display');
    const infoElement = document.getElementById('selected-customer-info');
    
    if (this.currentBill.customer) {
      displayElement.style.display = 'block';
      infoElement.innerHTML = `
        <div class="customer-details">
          <div class="customer-name">${this.currentBill.customer.name}</div>
          <div class="customer-phone">${this.currentBill.customer.mobile}</div>
          ${this.currentBill.customer.city ? `<div class="customer-location">${this.currentBill.customer.city}${this.currentBill.customer.area ? `, ${this.currentBill.customer.area}` : ''}</div>` : ''}
        </div>
      `;
    } else {
      displayElement.style.display = 'none';
    }
  }

  updateFinalActions() {
    const actionsElement = document.getElementById('final-actions');
    
    actionsElement.innerHTML = `
      <div class="final-bill-summary">
        <h4>Final Bill Summary</h4>
        <div class="bill-details">
          <div class="bill-row">
            <span>Customer:</span>
            <span>${this.currentBill.customer?.name || 'N/A'}</span>
          </div>
          <div class="bill-row">
            <span>Items:</span>
            <span>${this.currentBill.items.length}</span>
          </div>
          <div class="bill-row">
            <span>Subtotal:</span>
            <span>AED ${this.currentBill.subtotal.toFixed(2)}</span>
          </div>
          ${this.currentBill.discount > 0 ? `
            <div class="bill-row">
              <span>Discount (${this.currentBill.discount}%):</span>
              <span>-AED ${this.currentBill.discountAmount.toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="bill-row">
            <span>VAT (${this.vatRate}%):</span>
            <span>AED ${this.currentBill.vat.toFixed(2)}</span>
          </div>
          <div class="bill-row total">
            <span>Total:</span>
            <span>AED ${this.currentBill.total.toFixed(2)}</span>
          </div>
          ${this.currentBill.advance > 0 ? `
            <div class="bill-row">
              <span>Advance Paid:</span>
              <span>AED ${this.currentBill.advance.toFixed(2)}</span>
            </div>
            <div class="bill-row">
              <span>Balance:</span>
              <span>AED ${this.currentBill.balance.toFixed(2)}</span>
            </div>
          ` : ''}
        </div>
      </div>
      
      <div class="action-buttons">
        <button class="action-btn primary-btn" id="process-bill-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 12l2 2 4-4"></path>
            <path d="M21 12c-1 0-2-1-2-2s1-2 2-2 2 1 2 2-1 2-2 2z"></path>
            <path d="M3 12c1 0 2-1 2-2s-1-2-2-2-2 1-2 2 1 2 2 2z"></path>
          </svg>
          Process Bill
        </button>
      </div>
    `;

    // Bind process bill button
    document.getElementById('process-bill-btn').addEventListener('click', () => {
      this.processBill();
    });
  }

  /**
   * Load products from API
   */
  async loadProducts() {
    try {
      const response = await fetch('/api/products');
      if (response.ok) {
        const data = await response.json();
        console.log('MobileBillingV2: Raw products API response:', data);
        
        // Handle different response structures
        const productsArray = data.value || data || [];
        
        // Map PostgreSQL field names to expected format
        this.products = productsArray.map(product => ({
          id: product.product_id || product.id,
          name: product.product_name || product.name || 'Unknown Product',
          price: product.rate || product.price || 0,
          type: product.type_name || product.type || 'No Type',
          description: product.description || '',
          barcode: product.barcode,
          is_active: product.is_active
        }));
        console.log('MobileBillingV2: Loaded', this.products.length, 'products');
      } else {
        throw new Error('Failed to load products');
      }
    } catch (error) {
      console.error('MobileBillingV2: Error loading products:', error);
      this.products = [];
    }
  }

  /**
   * Load customers from API
   */
  async loadCustomers() {
    try {
      const response = await fetch('/api/customers');
      if (response.ok) {
        const data = await response.json();
        console.log('MobileBillingV2: Raw customers API response:', data);
        
        // Handle different response structures
        const customersArray = data.value || data || [];
        
        // Map PostgreSQL field names to expected format
        this.customers = customersArray.map(customer => ({
          id: customer.customer_id || customer.id,
          name: customer.name || 'Unknown Customer',
          mobile: customer.phone || customer.mobile || '',
          email: customer.email || '',
          address: customer.address || '',
          city: customer.city || '',
          area: customer.area || '',
          customer_type: customer.customer_type || 'Individual'
        }));
        console.log('MobileBillingV2: Loaded', this.customers.length, 'customers');
      } else {
        throw new Error('Failed to load customers');
      }
    } catch (error) {
      console.error('MobileBillingV2: Error loading customers:', error);
      this.customers = [];
    }
  }

  /**
   * Load VAT rate from API
   */
  async loadVatRate() {
    try {
      const response = await fetch('/api/vat-rates');
      if (response.ok) {
        const data = await response.json();
        console.log('MobileBillingV2: Raw VAT rates API response:', data);
        
        // Handle different response structures
        const vatRatesArray = data.value || data || [];
        
        if (vatRatesArray.length > 0) {
          this.vatRate = parseFloat(vatRatesArray[0].rate_percentage || vatRatesArray[0].rate || 0);
        }
        console.log('MobileBillingV2: Loaded VAT rate:', this.vatRate);
      }
    } catch (error) {
      console.error('MobileBillingV2: Error loading VAT rate:', error);
      this.vatRate = 0;
    }
  }

  /**
   * Load cities for the modal dropdown
   */
  async loadCities() {
    try {
      const citiesResponse = await fetch('/api/cities');
      if (citiesResponse.ok) {
        const citiesData = await citiesResponse.json();
        const citiesArray = citiesData.value || citiesData || [];
        const citySelect = document.getElementById('customer-city');
        
        if (citySelect) {
          citiesArray.forEach(city => {
            const option = document.createElement('option');
            option.value = city.city_name || city.name || city;
            option.textContent = city.city_name || city.name || city;
            citySelect.appendChild(option);
          });
        }
      }
    } catch (error) {
      console.error('MobileBillingV2: Error loading cities for modal:', error);
    }
  }

  /**
   * Load areas for the modal autocomplete
   */
  async loadAreasForModal() {
    try {
      const areasResponse = await fetch('/api/areas');
      if (areasResponse.ok) {
        const areasData = await areasResponse.json();
        const areasArray = areasData.value || areasData || [];
        const areaInput = document.getElementById('customer-area');
        const areaSuggestions = document.getElementById('area-suggestions');
        
        if (areaInput && areaSuggestions) {
          // Clear existing suggestions
          areaSuggestions.innerHTML = '';
          
          // Store areas for later filtering (no need to pre-populate all)
          this.availableAreas = areasArray;
          console.log('MobileBillingV2: Loaded', areasArray.length, 'areas for autocomplete');
        }
      }
    } catch (error) {
      console.error('MobileBillingV2: Error loading areas for modal:', error);
    }
  }

  /**
   * Filter products based on search term
   */
  filterProducts(searchTerm) {
    const filteredProducts = this.products.filter(product => {
      // Safely handle undefined/null properties
      const productName = (product.name || '').toLowerCase();
      const productType = (product.type || '').toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      
      return productName.includes(searchLower) || productType.includes(searchLower);
    });
    
    this.updateProductGrid(filteredProducts);
  }

  /**
   * Update the product grid display
   */
  updateProductGrid(products = this.products) {
    console.log('MobileBillingV2: updateProductGrid called');
    console.log('MobileBillingV2: productGrid element:', this.productGrid);
    console.log('MobileBillingV2: products to display:', products.length);
    
    if (!this.productGrid) {
      console.error('MobileBillingV2: productGrid element not found');
      return;
    }

    this.productGrid.innerHTML = products.map(product => `
      <div class="product-card-v2" data-product-id="${product.id}">
        <div class="product-info">
          <div class="product-name">${product.name || 'Unknown Product'}</div>
          <div class="product-type">${product.type || 'No Type'}</div>
          <div class="product-price">AED ${parseFloat(product.price || 0).toFixed(2)}</div>
        </div>
        <button class="add-to-bill-btn-v2" onclick="mobileBillingV2.addToBill(${product.id})">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"></path>
          </svg>
          Add
        </button>
      </div>
    `).join('');
  }

  /**
   * Add product to bill
   */
  addToBill(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    const existingItem = this.currentBill.items.find(item => item.product_id === productId);
    
    if (existingItem) {
      existingItem.quantity += 1;
      existingItem.total = existingItem.quantity * existingItem.price;
    } else {
      this.currentBill.items.push({
        product_id: product.id,
        name: product.name || 'Unknown Product',
        type: product.type || 'No Type',
        price: parseFloat(product.price || 0),
        quantity: 1,
        total: parseFloat(product.price || 0)
      });
    }

    this.updateSelectedItemsDisplay();
    this.showNotification(`${product.name || 'Product'} added to bill`, 'success');
  }

  /**
   * Remove item from bill
   */
  removeFromBill(index) {
    this.currentBill.items.splice(index, 1);
    this.updateSelectedItemsDisplay();
  }

  /**
   * Update item quantity
   */
  updateItemQuantity(index, newQuantity) {
    if (newQuantity <= 0) {
      this.removeFromBill(index);
      return;
    }

    const item = this.currentBill.items[index];
    item.quantity = newQuantity;
    item.total = item.quantity * item.price;
    
    this.updateSelectedItemsDisplay();
  }

  /**
   * Update bill display
   */
  updateBillDisplay() {
    this.updateBillItems();
    this.updateBillSummary();
    this.updateProcessButton();
  }

  /**
   * Update bill items display
   */
  updateBillItems() {
    if (!this.billItems) return;

    if (this.currentBill.items.length === 0) {
      this.billItems.innerHTML = '<div class="empty-bill">No items in bill</div>';
      return;
    }

    this.billItems.innerHTML = this.currentBill.items.map((item, index) => `
      <div class="bill-item-v2">
        <div class="item-info">
          <div class="item-name">${item.name || 'Unknown Product'}</div>
          <div class="item-type">${item.type || 'No Type'}</div>
          <div class="item-price">AED ${(item.price || 0).toFixed(2)}</div>
        </div>
        <div class="item-controls">
          <div class="quantity-controls">
            <button class="quantity-btn" onclick="mobileBillingV2.updateItemQuantity(${index}, ${(item.quantity || 1) - 1})">-</button>
            <span class="quantity">${item.quantity || 1}</span>
            <button class="quantity-btn" onclick="mobileBillingV2.updateItemQuantity(${index}, ${(item.quantity || 1) + 1})">+</button>
          </div>
          <div class="item-total">AED ${(item.total || 0).toFixed(2)}</div>
          <button class="remove-item-btn" onclick="mobileBillingV2.removeFromBill(${index})">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    `).join('');
  }

  /**
   * Update bill summary display
   */
  updateBillSummary() {
    if (!this.billSummary) return;

    const subtotal = this.currentBill.items.reduce((sum, item) => sum + (item.total || 0), 0);
    const discountPercent = this.currentBill.discount || 0;
    const discountAmount = (subtotal * discountPercent) / 100;
    const subtotalAfterDiscount = subtotal - discountAmount;
    const vat = (subtotalAfterDiscount * (this.vatRate / 100));
    const total = subtotalAfterDiscount + vat;
    const advance = this.currentBill.advance || 0;
    const balance = total - advance;

    // Update current bill totals
    this.currentBill.subtotal = subtotal;
    this.currentBill.discount = discountPercent;
    this.currentBill.discountAmount = discountAmount;
    this.currentBill.vat = vat;
    this.currentBill.total = total;
    this.currentBill.advance = advance;
    this.currentBill.balance = balance;

    this.billSummary.innerHTML = `
      <div class="bill-summary-header">
        <h3>Bill Summary</h3>
        <button class="clear-bill-btn" id="clear-bill-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          Clear
        </button>
      </div>
      
      <div class="bill-totals">
        <div class="total-row">
          <span>Subtotal:</span>
          <span>AED ${subtotal.toFixed(2)}</span>
        </div>
        
        <div class="discount-row">
          <span>Discount:</span>
          <div class="discount-input-container">
            <input type="number" 
                   id="discount-input" 
                   value="${discountPercent}" 
                   min="0" 
                   max="100" 
                   step="0.01" 
                   placeholder="0.00"
                   onchange="mobileBillingV2.updateDiscount(this.value)">
            <span class="currency">%</span>
          </div>
        </div>
        
        ${discountPercent > 0 ? `
          <div class="total-row">
            <span>Discount Amount:</span>
            <span>-AED ${discountAmount.toFixed(2)}</span>
          </div>
          <div class="total-row">
            <span>Subtotal after Discount:</span>
            <span>AED ${subtotalAfterDiscount.toFixed(2)}</span>
          </div>
        ` : ''}
        
        <div class="total-row">
          <span>VAT (${this.vatRate}%):</span>
          <span>AED ${vat.toFixed(2)}</span>
        </div>
        
        <div class="total-row total-amount">
          <span>Total:</span>
          <span>AED ${total.toFixed(2)}</span>
        </div>
        
        <div class="advance-row">
          <span>Advance Payment:</span>
          <div class="advance-input-container">
            <input type="number" 
                   id="advance-input" 
                   value="${advance}" 
                   min="0" 
                   max="${total}" 
                   step="0.01" 
                   placeholder="0.00"
                   onchange="mobileBillingV2.updateAdvance(this.value)">
            <span class="currency">AED</span>
          </div>
        </div>
        
        <div class="total-row balance-amount">
          <span>Balance:</span>
          <span class="${balance > 0 ? 'balance-due' : 'balance-paid'}">AED ${balance.toFixed(2)}</span>
        </div>
      </div>
      
      <button class="process-bill-btn" id="mobile-process-bill-btn-v2">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 12l2 2 4-4"></path>
          <path d="M21 12c-1 0-2-1-2-2s1-2 2-2 2 1 2 2-1 2-2 2z"></path>
          <path d="M3 12c1 0 2-1 2-2s-1-2-2-2-2 1-2 2 1 2 2 2z"></path>
        </svg>
        Process Bill
      </button>
    `;
  }

  /**
   * Update the process button state and text
   */
  updateProcessButton() {
    const processBtn = document.getElementById('mobile-process-bill-btn-v2');
    if (!processBtn) return;

    const hasCustomer = this.currentBill.customer !== null;
    const hasItems = this.currentBill.items.length > 0;

    if (!hasCustomer) {
      processBtn.textContent = 'Select Customer';
      processBtn.setAttribute('data-state', 'select-customer');
      processBtn.disabled = false;
    } else if (!hasItems) {
      processBtn.textContent = 'Add Items to Bill';
      processBtn.setAttribute('data-state', 'add-items');
      processBtn.disabled = true;
    } else {
      processBtn.textContent = 'Process Bill';
      processBtn.setAttribute('data-state', 'process-bill');
      processBtn.disabled = false;
    }
  }

  /**
   * Show customer selection modal
   */
  showCustomerModal() {
    // Create customer modal
    const modal = document.createElement('div');
    modal.className = 'customer-modal';
    modal.id = 'customer-modal-v2';
    modal.style.display = 'flex';
    
    modal.innerHTML = `
      <div class="customer-modal-content">
        <div class="customer-modal-header">
          <h3>Select Customer</h3>
          <button class="close-btn" onclick="this.closest('.customer-modal').remove()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div class="customer-search-section">
          <input type="text" id="customer-search-input" class="customer-search-input" placeholder="Search customers...">
          <button class="add-new-customer-btn" onclick="mobileBillingV2.showAddCustomerModal()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14"></path>
            </svg>
            Add New
          </button>
        </div>
        
        <div class="customer-list" id="customer-list-v2">
          ${this.customers.map(customer => `
            <div class="customer-item" onclick="mobileBillingV2.selectCustomer(${customer.id})">
              <div class="customer-details">
                <div class="customer-name">${customer.name}</div>
                <div class="customer-phone">${customer.mobile || 'No phone'}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Setup customer search
    const searchInput = document.getElementById('customer-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filterCustomers(e.target.value);
      });
      searchInput.focus();
    }
  }

  /**
   * Filter customers based on search term
   */
  filterCustomers(searchTerm) {
    const customerList = document.getElementById('customer-list-v2');
    if (!customerList) return;
    
    const filteredCustomers = this.customers.filter(customer => {
      // Safely handle undefined/null properties
      const customerName = (customer.name || '').toLowerCase();
      const customerMobile = (customer.mobile || '').toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      
      return customerName.includes(searchLower) || customerMobile.includes(searchLower);
    });
    
    customerList.innerHTML = filteredCustomers.map(customer => `
      <div class="customer-item" onclick="mobileBillingV2.selectCustomer(${customer.id})">
        <div class="customer-details">
          <div class="customer-name">${customer.name || 'Unknown'}</div>
          <div class="customer-phone">${customer.mobile || 'No phone'}</div>
        </div>
      </div>
    `).join('');
  }

  /**
   * Select a customer
   */
  selectCustomer(customerId) {
    console.log('MobileBillingV2: Selecting customer with ID:', customerId);
    console.log('MobileBillingV2: Available customers:', this.customers);
    
    const customer = this.customers.find(c => c.id === customerId);
    console.log('MobileBillingV2: Found customer:', customer);
    
    if (!customer) {
      console.error('MobileBillingV2: Customer not found with ID:', customerId);
      this.showNotification('Customer not found', 'error');
      return;
    }
    
    this.currentBill.customer = customer;
    console.log('MobileBillingV2: Set current bill customer:', this.currentBill.customer);
    
    const customerNameElement = document.getElementById('selected-customer-name');
    if (customerNameElement) {
      customerNameElement.textContent = customer.name || 'Unknown Customer';
    }
    
    // Close modal
    const modal = document.getElementById('customer-modal-v2');
    if (modal) {
      modal.remove();
    }
    
    this.updateProcessButton();
    this.showNotification(`Customer ${customer.name || 'Unknown Customer'} selected`, 'success');
  }

  /**
   * Show add customer modal
   */
  showAddCustomerModal() {
    // Close customer selection modal first
    const customerModal = document.getElementById('customer-modal-v2');
    if (customerModal) {
      customerModal.remove();
    }
    
    // Create add customer modal
    const modal = document.createElement('div');
    modal.className = 'add-customer-modal';
    modal.id = 'add-customer-modal-v2';
    modal.style.display = 'flex';
    
    modal.innerHTML = `
      <div class="add-customer-modal-content">
        <div class="customer-modal-header">
          <h3>Add New Customer</h3>
          <button class="close-btn" onclick="this.closest('.add-customer-modal').remove()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <form class="add-customer-form" onsubmit="event.preventDefault(); mobileBillingV2.addNewCustomer();">
          <div class="form-group">
            <label for="new-customer-name">Customer Name *</label>
            <input type="text" id="new-customer-name" required placeholder="Enter customer name">
          </div>
          
          <div class="form-group">
            <label for="new-customer-mobile">Mobile Number</label>
            <input type="tel" id="new-customer-mobile" placeholder="Enter mobile number">
          </div>
          
          <div class="form-group">
            <label for="new-customer-city">City</label>
            <select id="new-customer-city" onchange="mobileBillingV2.onCityChange()">
              <option value="">Select City</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="new-customer-area">Area</label>
            <div class="area-autocomplete-container">
              <input type="text" id="new-customer-area" placeholder="Start typing area name..." autocomplete="off">
              <div id="area-suggestions" class="area-suggestions"></div>
            </div>
          </div>
          
          <div class="form-actions">
            <button type="button" class="cancel-btn" onclick="this.closest('.add-customer-modal').remove()">Cancel</button>
            <button type="submit" class="submit-btn">Add Customer</button>
          </div>
        </form>
      </div>
    `;
    
    // Add to container
    this.container.appendChild(modal);
    
    // Load cities and areas
    this.loadCitiesForModal();
    this.loadAreasForModal();
    
    // Setup area autocomplete
    this.setupAreaAutocomplete();
  }

  /**
   * Handle city selection change
   */
  onCityChange(value) {
    const citySelect = document.getElementById('new-customer-city');
    const areaInput = document.getElementById('new-customer-area');
    const areaSuggestions = document.getElementById('area-suggestions');
    
    if (citySelect && areaInput && areaSuggestions) {
      // Clear area input and suggestions when city changes
      areaInput.value = '';
      areaSuggestions.innerHTML = '';
      areaSuggestions.style.display = 'none';
    }
  }

  /**
   * Filter areas based on the input value
   */
  async filterAreasByInput(inputValue) {
    const areaInput = document.getElementById('new-customer-area');
    const areaSuggestions = document.getElementById('area-suggestions');

    if (!areaInput || !areaSuggestions || !this.availableAreas) {
      return;
    }

    // Clear existing suggestions
    areaSuggestions.innerHTML = '';

    // Filter areas by input text (simple string matching)
    const filteredAreas = this.availableAreas.filter(area => {
      const areaName = (area || '').toLowerCase();
      const inputLower = inputValue.toLowerCase();
      
      return !inputValue || areaName.includes(inputLower);
    });

    // Limit to first 10 suggestions for better UX
    const limitedAreas = filteredAreas.slice(0, 10);

    // Add filtered areas to suggestions
    limitedAreas.forEach(area => {
      const suggestion = document.createElement('div');
      suggestion.className = 'area-suggestion';
      suggestion.textContent = area;
      suggestion.addEventListener('click', () => {
        areaInput.value = suggestion.textContent;
        areaSuggestions.innerHTML = ''; // Clear suggestions after selection
        areaSuggestions.style.display = 'none';
      });
      areaSuggestions.appendChild(suggestion);
    });

    // Show/hide suggestions container
    if (limitedAreas.length > 0 && inputValue) {
      areaSuggestions.style.display = 'block';
    } else {
      areaSuggestions.style.display = 'none';
    }
  }

  /**
   * Add new customer
   */
  async addNewCustomer() {
    const name = document.getElementById('new-customer-name').value.trim();
    const mobile = document.getElementById('new-customer-mobile').value.trim();
    const city = document.getElementById('new-customer-city').value.trim();
    const area = document.getElementById('new-customer-area').value.trim();
    
    if (!name) {
      this.showNotification('Customer name is required', 'error');
      return;
    }
    
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          phone: mobile, // API expects 'phone' not 'mobile'
          city,
          area
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        this.showNotification('Customer added successfully!', 'success');
        
        // Close modal
        const modal = document.getElementById('add-customer-modal-v2');
        if (modal) {
          modal.remove();
        }
        
        // Refresh customers list
        await this.loadCustomers();
        
        // If we're in customer selection mode, select the new customer
        if (this.currentBill.customer === null) {
          this.selectCustomer(result.id);
        }
      } else {
        const errorData = await response.json();
        this.showNotification(errorData.error || 'Failed to add customer', 'error');
      }
    } catch (error) {
      console.error('MobileBillingV2: Error adding customer:', error);
      this.showNotification('Failed to add customer. Please try again.', 'error');
    }
  }

  /**
   * Process the bill
   */
  async processBill() {
    console.log('MobileBillingV2: Processing bill...');
    console.log('MobileBillingV2: Current bill state:', this.currentBill);
    
    if (!this.currentBill.customer) {
      console.error('MobileBillingV2: No customer selected');
      this.showNotification('Please select a customer first', 'error');
      return;
    }

    if (this.currentBill.items.length === 0) {
      console.error('MobileBillingV2: No items in bill');
      this.showNotification('Please add items to the bill', 'error');
      return;
    }

    console.log('MobileBillingV2: Customer selected:', this.currentBill.customer);
    console.log('MobileBillingV2: Items in bill:', this.currentBill.items);

    try {
      // Get billing configuration
      const configResponse = await fetch('/api/shop-settings/billing-config');
      const configData = await configResponse.json();
      const billingConfig = configData.config;

      // Get next bill number
      const billNumberResponse = await fetch('/api/next-bill-number');
      const billNumberData = await billNumberResponse.json();
      const billNumber = billNumberData.bill_number;

      // Get current date
      const today = new Date().toISOString().split('T')[0];
      
      // Calculate delivery date based on config
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + (billingConfig.default_delivery_days || 3));
      const deliveryDateStr = deliveryDate.toISOString().split('T')[0];

      // Calculate trial date based on config
      const trialDate = new Date();
      trialDate.setDate(trialDate.getDate() + (billingConfig.default_trial_days || 3));
      const trialDateStr = trialDate.toISOString().split('T')[0];

      // Prepare bill data with null checks
      const billData = {
        bill: {
          bill_number: billNumber,
          customer_name: this.currentBill.customer.name || 'Unknown Customer',
          customer_phone: this.currentBill.customer.mobile || '',
          customer_city: this.currentBill.customer.city || '',
          customer_area: this.currentBill.customer.area || '',
          customer_type: 'Individual',
          bill_date: today,
          delivery_date: billingConfig.enable_delivery_date ? deliveryDateStr : null,
          trial_date: billingConfig.enable_trial_date ? trialDateStr : null,
          payment_method: 'Cash',
          subtotal: this.currentBill.subtotal,
          discount_amount: this.currentBill.discountAmount || 0,
          vat_amount: this.currentBill.vat,
          total_amount: this.currentBill.total,
          advance_paid: this.currentBill.advance || 0,
          balance_amount: this.currentBill.balance || 0,
          notes: '',
          master_id: null // Will be set to default employee if available
        },
        items: this.currentBill.items.map(item => ({
          product_id: item.product_id,
          product_name: item.name || 'Unknown Product',
          rate: item.price || 0,
          quantity: item.quantity || 1,
          discount: 0, // Individual item discount (not implemented yet)
          total: item.total || 0
        }))
      };

      console.log('MobileBillingV2: Sending bill data:', billData);

      // Send bill to API
      const response = await fetch('/api/bills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(billData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('MobileBillingV2: Bill processed successfully:', result);
        this.showNotification('Bill processed successfully!', 'success');
        
        // Store the processed bill for success modal
        this.lastProcessedBill = {
          bill_number: billNumber,
          total: this.currentBill.total,
          customer_name: this.currentBill.customer.name || 'Unknown Customer'
        };

        // Show success modal
        this.showPaymentSuccessModal();
        
        // Clear the current bill
        this.clearBill();
      } else {
        const errorData = await response.json();
        console.error('MobileBillingV2: Bill processing failed:', errorData);
        this.showNotification(errorData.error || 'Failed to process bill', 'error');
      }
    } catch (error) {
      console.error('MobileBillingV2: Error processing bill:', error);
      this.showNotification('Failed to process bill. Please try again.', 'error');
    }
  }

  /**
   * Clear the current bill
   */
  clearBill() {
    this.currentBill = {
      customer: null,
      items: [],
      subtotal: 0,
      vat: 0,
      discount: 0,
      total: 0,
      advance: 0,
      balance: 0
    };
    
    this.updateSelectedItemsDisplay();
    this.showNotification('Bill cleared', 'success');
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `mobile-notification-v2 ${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-message">${message}</span>
        <button class="notification-close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `;

    // Add to container
    this.container.appendChild(notification);

    // Show notification
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);

    // Auto hide after 3 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);

    // Close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    });
  }

  /**
   * Cleanup event listeners
   */
  cleanup() {
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners.clear();
  }

  /**
   * Show payment success modal
   */
  showPaymentSuccessModal() {
    if (!this.lastProcessedBill) return;

    const modal = document.createElement('div');
    modal.className = 'payment-success-modal';
    modal.id = 'payment-success-modal-v2';
    modal.style.display = 'flex';
    
    modal.innerHTML = `
      <div class="payment-success-modal-content">
        <div class="success-header">
          <div class="success-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22,4 12,14.01 9,11.01"></polyline>
            </svg>
          </div>
          <h3>Bill Processed Successfully!</h3>
        </div>
        
        <div class="bill-details">
          <div class="bill-info">
            <span class="bill-number">Bill #${this.lastProcessedBill.bill_number}</span>
            <span class="bill-total">AED ${this.lastProcessedBill.total.toFixed(2)}</span>
          </div>
          <div class="customer-info">
            <div class="customer-name">${this.lastProcessedBill.customer_name}</div>
          </div>
        </div>
        
        <div class="action-buttons">
          <button class="action-btn print-btn" onclick="mobileBillingV2.printBill()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6,9 6,2 18,2 18,9"></polyline>
              <path d="M6,18H4a2,2,0,0,1-2-2V11a2,2,0,0,1,2-2H20a2,2,0,0,1,2,2v5a2,2,0,0,1-2,2H18"></path>
            </svg>
            Print Bill
          </button>
          <button class="action-btn whatsapp-btn" onclick="mobileBillingV2.shareBill()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            Share
          </button>
          <button class="action-btn new-bill-btn" onclick="mobileBillingV2.startNewBill()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            New Bill
          </button>
          <button class="action-btn" onclick="mobileBillingV2.closeSuccessModal()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            Close
          </button>
        </div>
      </div>
    `;
    
    // Add to container
    this.container.appendChild(modal);
  }

  /**
   * Print bill
   */
  printBill() {
    if (!this.lastProcessedBill) {
      this.showNotification('No bill to print', 'error');
      return;
    }

    // Create a print-friendly bill content
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bill #${this.lastProcessedBill.bill_number}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .bill-header { text-align: center; margin-bottom: 30px; }
          .bill-title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .bill-number { font-size: 18px; color: #666; }
          .bill-details { margin-bottom: 30px; }
          .customer-info { margin-bottom: 20px; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .items-table th { background-color: #f5f5f5; }
          .bill-summary { text-align: right; margin-top: 20px; }
          .summary-row { margin: 8px 0; }
          .total { font-size: 18px; font-weight: bold; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="bill-header">
          <div class="bill-title">Tajir Pro</div>
          <div class="bill-number">Bill #${this.lastProcessedBill.bill_number}</div>
          <div>Professional Business Management</div>
        </div>
        
        <div class="bill-details">
          <div class="customer-info">
            <strong>Customer:</strong> ${this.lastProcessedBill.customer_name}<br>
            <strong>Date:</strong> ${new Date().toLocaleDateString()}<br>
            <strong>Time:</strong> ${new Date().toLocaleTimeString()}
          </div>
        </div>
        
        <table class="items-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Type</th>
              <th>Price</th>
              <th>Qty</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${this.currentBill.items.map(item => `
              <tr>
                <td>${item.name || 'Unknown Product'}</td>
                <td>${item.type || 'No Type'}</td>
                <td>AED ${(item.price || 0).toFixed(2)}</td>
                <td>${item.quantity || 1}</td>
                <td>AED ${(item.total || 0).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="bill-summary">
          <div class="summary-row">
            <strong>Subtotal:</strong> AED ${this.currentBill.subtotal.toFixed(2)}
          </div>
          ${this.currentBill.discount > 0 ? `
            <div class="summary-row">
              <strong>Discount:</strong> -AED ${this.currentBill.discountAmount.toFixed(2)}
            </div>
            <div class="summary-row">
              <strong>Subtotal after Discount:</strong> AED ${(this.currentBill.subtotal - this.currentBill.discountAmount).toFixed(2)}
            </div>
          ` : ''}
          <div class="summary-row">
            <strong>VAT (${this.vatRate}%):</strong> AED ${this.currentBill.vat.toFixed(2)}
          </div>
          <div class="summary-row total">
            <strong>Total:</strong> AED ${this.currentBill.total.toFixed(2)}
          </div>
          ${this.currentBill.advance > 0 ? `
            <div class="summary-row">
              <strong>Advance Payment:</strong> AED ${this.currentBill.advance.toFixed(2)}
            </div>
            <div class="summary-row total">
              <strong>Balance:</strong> AED ${this.currentBill.balance.toFixed(2)}
            </div>
          ` : ''}
        </div>
        
        <div class="footer">
          <p>Thank you for your business!</p>
          <p>Generated by Tajir Pro - Professional Business Management</p>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() {
              window.close();
            }, 1000);
          };
        </script>
      </body>
      </html>
    `;

    // Open print window
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
  }

  /**
   * Share bill
   */
  shareBill() {
    this.showNotification('Share functionality coming soon', 'info');
  }

  /**
   * Start new bill
   */
  startNewBill() {
    this.closeSuccessModal();
    this.clearBill();
    this.showNotification('New bill started', 'success');
  }

  /**
   * Close success modal
   */
  closeSuccessModal() {
    const modal = document.getElementById('payment-success-modal-v2');
    if (modal) {
      modal.remove();
    }
  }

  /**
   * Update discount value
   */
  updateDiscount(value) {
    const discountPercent = parseFloat(value) || 0;
    const subtotal = this.currentBill.items.reduce((sum, item) => sum + (item.total || 0), 0);
    
    // Ensure discount doesn't exceed subtotal
    if (discountPercent > 100) { // Assuming max discount is 100%
      this.showNotification('Discount cannot exceed 100%', 'error');
      this.currentBill.discount = 100;
    } else {
      this.currentBill.discount = discountPercent;
    }
    
    this.updateSelectedItemsDisplay();
  }

  /**
   * Update advance payment value
   */
  updateAdvance(value) {
    const advance = parseFloat(value) || 0;
    const subtotal = this.currentBill.items.reduce((sum, item) => sum + (item.total || 0), 0);
    const discountPercent = this.currentBill.discount || 0;
    const discountAmount = (subtotal * discountPercent) / 100;
    const subtotalAfterDiscount = subtotal - discountAmount;
    const vat = (subtotalAfterDiscount * (this.vatRate / 100));
    const total = subtotalAfterDiscount + vat;
    
    // Ensure advance doesn't exceed total
    if (advance > total) {
      this.showNotification('Advance payment cannot exceed total amount', 'error');
      this.currentBill.advance = total;
    } else {
      this.currentBill.advance = advance;
    }
    
    this.updateSelectedItemsDisplay();
  }

  /**
   * Show mobile billing interface
   */
  show() {
    console.log('MobileBillingV2: Showing interface...');
    
    if (this.container) {
      this.container.style.display = 'block';
      this.container.classList.add('fade-in');
      this.container.classList.remove('fade-out');
      
      // Reset to step 1
      this.showStep(1);
      
      // Clear any previous bill
      this.clearBill();
      
      console.log('MobileBillingV2: Interface shown successfully');
    } else {
      console.error('MobileBillingV2: Container not found');
    }
  }

  /**
   * Hide mobile billing interface
   */
  hide() {
    console.log('MobileBillingV2: Hiding interface...');
    if (this.container) {
      this.container.classList.add('fade-out');
      this.container.classList.remove('fade-in');
      
      // Hide after animation
      setTimeout(() => {
        this.container.style.display = 'none';
        console.log('MobileBillingV2: Interface hidden successfully');
      }, 300);
    } else {
      console.error('MobileBillingV2: Container not found');
    }
  }
}

// Global instance
window.mobileBillingV2 = new MobileBillingV2();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.mobileBillingV2.init();
});

// Also initialize if DOM is already loaded
if (document.readyState === 'loading') {
  // DOM is still loading, wait for DOMContentLoaded
} else {
  // DOM is already loaded, initialize immediately
  window.mobileBillingV2.init();
}
