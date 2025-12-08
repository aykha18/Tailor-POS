// Mobile Screens Module - Handles mobile-specific functionality for Products, Customers, and Shop Settings

class MobileScreens {
  constructor() {
    this.isMobile = window.innerWidth <= 768;
    this.currentView = 'table'; // 'table' or 'cards'
    this.init();
  }

  init() {
    if (!this.isMobile) return;
    
    this.setupMobileViews();
    this.setupTouchOptimizations();
    this.setupMobileForms();
    this.setupMobileSearch();
    this.setupMobileActions();
    
    // Wait for customer data to be loaded before setting up view toggles
    this.waitForCustomerData();
  }
  
  waitForCustomerData() {
    // Check if customer table has data
    const customerTable = document.getElementById('customerTable');
    if (customerTable) {
      const tbody = customerTable.querySelector('tbody');
      if (tbody && tbody.children.length > 0) {
        console.log('Customer data already loaded, setting up view toggles');
        this.setupViewTogglesAfterDataLoad();
      } else {
        console.log('Waiting for customer data to load...');
        // Wait for customer data to be loaded
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
              const tbody = customerTable.querySelector('tbody');
              if (tbody && tbody.children.length > 0) {
                console.log('Customer data loaded, setting up view toggles');
                observer.disconnect();
                this.setupViewTogglesAfterDataLoad();
              }
            }
          });
        });
        
        observer.observe(customerTable.querySelector('tbody'), {
          childList: true,
          subtree: true
        });
      }
    }
  }
  
  setupViewTogglesAfterDataLoad() {
    // Re-setup view toggles after data is loaded
    this.addMobileViewToggles();
  }

  setupMobileViews() {
    // Add mobile view toggle buttons
    this.addMobileViewToggles();
  }

  addMobileViewToggles() {
    console.log('Adding mobile view toggles...');
    
    // Add view toggle for Products screen
    const productSection = document.getElementById('productSec');
    if (productSection) {
      console.log('Found product section, adding toggle');
      const toggleButton = this.createViewToggleButton('product');
      const header = productSection.querySelector('h3');
      if (header) {
        header.parentNode.insertBefore(toggleButton, header.nextSibling);
      }
    } else {
      console.log('Product section not found');
    }

    // Add view toggle for Customers screen
    const customerSection = document.getElementById('customerSec');
    if (customerSection) {
      console.log('Found customer section, adding toggle');
      const toggleButton = this.createViewToggleButton('customer');
      const header = customerSection.querySelector('h3');
      if (header) {
        header.parentNode.insertBefore(toggleButton, header.nextSibling);
      }
    } else {
      console.log('Customer section not found');
    }

    // Add view toggle for Employees screen
    const employeeSection = document.getElementById('employeeSec');
    if (employeeSection) {
      console.log('Found employee section, adding toggle');
      const toggleButton = this.createViewToggleButton('employee');
      const header = employeeSection.querySelector('h3');
      if (header) {
        header.parentNode.insertBefore(toggleButton, header.nextSibling);
      }
    } else {
      console.log('Employee section not found');
    }

    // VAT section moved to Shop Settings as a tab
  }

  createViewToggleButton(type) {
    const button = document.createElement('button');
    button.className = 'mobile-view-toggle bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg px-3 py-1 text-xs font-medium transition-colors mb-4';
    button.innerHTML = `
      <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
      </svg>
      Switch to Cards
    `;
    button.dataset.type = type;
    button.addEventListener('click', (e) => this.toggleView(e));
    return button;
  }

  toggleView(event) {
    console.log('Toggle view called', event);
    const button = event.target.closest('button');
    if (!button) {
      console.log('No button found');
      return;
    }
    
    const type = button.dataset.type;
    const isTable = button.textContent.includes('Cards');
    
    console.log('Toggle type:', type, 'isTable:', isTable);
    
    if (isTable) {
      console.log('Switching to card view for:', type);
      this.showCardView(type);
      button.innerHTML = `
        <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H9a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
        </svg>
        Switch to Table
      `;
    } else {
      console.log('Switching to table view for:', type);
      this.showTableView(type);
      button.innerHTML = `
        <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
        </svg>
        Switch to Cards
      `;
    }
  }

  showCardView(type) {
    console.log('showCardView called for type:', type);
    const table = document.getElementById(`${type}Table`);
    if (!table) {
      console.error(`Table ${type}Table not found`);
      return;
    }
    
    console.log('Found table:', table);
    const container = table.parentNode;
    console.log('Container:', container);
    
    // Hide table
    table.style.display = 'none';
    
    // Create or show card container
    let cardContainer = container.querySelector(`#${type}Cards`);
    if (!cardContainer) {
      console.log('Creating new card container');
      cardContainer = document.createElement('div');
      cardContainer.id = `${type}Cards`;
      cardContainer.className = 'mobile-cards-container grid grid-cols-1 gap-4 mt-4';
      container.appendChild(cardContainer);
    } else {
      console.log('Found existing card container');
    }
    
    cardContainer.style.display = 'grid';
    console.log('Calling populateCards for type:', type);
    this.populateCards(type);
  }

  showTableView(type) {
    const table = document.getElementById(`${type}Table`);
    const cardContainer = document.getElementById(`${type}Cards`);
    
    if (!table) {
      console.error(`Table ${type}Table not found`);
      return;
    }
    
    // Show table
    table.style.display = 'table';
    
    // Hide cards
    if (cardContainer) {
      cardContainer.style.display = 'none';
    }
  }

  populateCards(type) {
    console.log('populateCards called for type:', type);
    const cardContainer = document.getElementById(`${type}Cards`);
    if (!cardContainer) {
      console.log('Card container not found');
      return;
    }

    // Get data from table
    const table = document.getElementById(`${type}Table`);
    const rows = table.querySelectorAll('tbody tr');
    console.log('Found rows:', rows.length);
    
    let cardsHTML = '';
    
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length === 0) return;
      
      if (type === 'product') {
        const name = cells[1]?.textContent || '';
        const typeName = cells[0]?.textContent || '';
        const price = cells[2]?.textContent || '';
        const id = row.querySelector('button')?.dataset.id || '';
        
        cardsHTML += `
          <div class="product-card-mobile" data-id="${id}">
            <div class="product-card-content">
              <div class="product-name">${name}</div>
              <div class="product-type">${typeName}</div>
              <div class="product-price">${price}</div>
            </div>
            <div class="product-card-actions">
              <button class="edit-product-btn" data-id="${id}">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>
              <button class="delete-product-btn" data-id="${id}">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>
          </div>
        `;
      } else if (type === 'customer') {
        const typeBadge = cells[0]?.innerHTML || '';
        const name = cells[1]?.textContent || '';
        const businessName = cells[2]?.textContent || '';
        const phone = cells[3]?.textContent || '';
        const id = row.querySelector('button')?.dataset.id || '';
        
        cardsHTML += `
          <div class="customer-card-mobile" data-id="${id}">
            <div class="customer-card-content">
              <div class="customer-name">${name}</div>
              <div class="customer-type">${businessName}</div>
              <div class="customer-phone">${phone}</div>
            </div>
            <div class="customer-card-actions">
              <button class="edit-customer-btn" data-id="${id}">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>
              <button class="delete-customer-btn" data-id="${id}">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>
          </div>
        `;
      } else if (type === 'employee') {
        const name = cells[0]?.textContent || '';
        const mobile = cells[1]?.textContent || '';
        const role = cells[2]?.textContent || '';
        const id = row.querySelector('button')?.dataset.id || '';
        
        cardsHTML += `
          <div class="employee-card-mobile" data-id="${id}">
            <div class="employee-card-content">
              <div class="employee-name">${name}</div>
              <div class="employee-role">${role}</div>
              <div class="employee-mobile">${mobile}</div>
            </div>
            <div class="employee-card-actions">
              <button class="edit-employee-btn" data-id="${id}">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>
              <button class="delete-employee-btn" data-id="${id}">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>
          </div>
        `;
      } else if (type === 'vat') {
        const rate = cells[0]?.textContent || '';
        const description = cells[1]?.textContent || '';
        const effectiveFrom = cells[2]?.textContent || '';
        const id = row.querySelector('button')?.dataset.id || '';
        
        cardsHTML += `
          <div class="vat-card-mobile" data-id="${id}">
            <div class="vat-card-content">
              <div class="vat-rate">${rate}</div>
              <div class="vat-description">${description}</div>
              <div class="vat-effective">${effectiveFrom}</div>
            </div>
            <div class="vat-card-actions">
              <button class="edit-vat-btn" data-id="${id}">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>
              <button class="delete-vat-btn" data-id="${id}">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>
          </div>
        `;
      }
    });
    
    cardContainer.innerHTML = cardsHTML;
    this.setupCardEventListeners(type);
  }

  setupCardEventListeners(type) {
    const cardContainer = document.getElementById(`${type}Cards`);
    if (!cardContainer) return;

    // Edit buttons
    cardContainer.querySelectorAll(`.edit-${type}-btn`).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        if (type === 'product') {
          window.editProduct && window.editProduct(id);
        } else if (type === 'customer') {
          window.editCustomer && window.editCustomer(id);
        } else if (type === 'employee') {
          window.editEmployee && window.editEmployee(id);
        } else if (type === 'vat') {
          window.editVat && window.editVat(id);
        }
      });
    });

    // Delete buttons
    cardContainer.querySelectorAll(`.delete-${type}-btn`).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        if (type === 'product') {
          window.deleteProduct && window.deleteProduct(id);
        } else if (type === 'customer') {
          window.deleteCustomer && window.deleteCustomer(id);
        } else if (type === 'employee') {
          window.deleteEmployee && window.deleteEmployee(id);
        } else if (type === 'vat') {
          window.deleteVat && window.deleteVat(id);
        }
      });
    });
  }

  setupTouchOptimizations() {
    // Add touch-friendly optimizations
    const touchElements = document.querySelectorAll('button, input, select, textarea');
    touchElements.forEach(element => {
      element.style.touchAction = 'manipulation';
      element.style.webkitTapHighlightColor = 'transparent';
    });
  }

  setupMobileForms() {
    // Setup mobile-optimized forms
    this.setupFormValidation();
    this.setupAutoSave();
  }

  setupFormValidation() {
    // Add real-time validation for mobile forms
    const forms = ['#productForm', '#customerForm', '#shopSettingsForm', '#employeeForm', '#vatForm'];
    
    forms.forEach(formSelector => {
      const form = document.querySelector(formSelector);
      if (!form) return;

      const inputs = form.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        input.addEventListener('blur', () => {
          this.validateField(input);
        });
      });
    });
  }

  validateField(field) {
    const value = field.value.trim();
    const isRequired = field.hasAttribute('required');
    
    if (isRequired && !value) {
      this.showFieldError(field, 'This field is required');
    } else {
      this.clearFieldError(field);
    }
  }

  showFieldError(field, message) {
    // Remove existing error
    this.clearFieldError(field);
    
    // Add error styling
    field.classList.add('billing-input-error');
    
    // Create error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'billing-error-message';
    errorDiv.textContent = message;
    field.parentNode.appendChild(errorDiv);
  }

  clearFieldError(field) {
    field.classList.remove('billing-input-error');
    const errorDiv = field.parentNode.querySelector('.billing-error-message');
    if (errorDiv) {
      errorDiv.remove();
    }
  }

  setupAutoSave() {
    // Auto-save form data to localStorage
    const forms = ['#productForm', '#customerForm', '#shopSettingsForm', '#employeeForm', '#vatForm'];
    
    forms.forEach(formSelector => {
      const form = document.querySelector(formSelector);
      if (!form) return;

      const inputs = form.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        input.addEventListener('input', () => {
          this.saveFormData(formSelector);
        });
      });
    });
  }

  saveFormData(formSelector) {
    const form = document.querySelector(formSelector);
    if (!form) return;

    const formData = {};
    const inputs = form.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
      if (input.type === 'checkbox') {
        formData[input.id] = input.checked;
      } else {
        formData[input.id] = input.value;
      }
    });

    localStorage.setItem(`mobile_form_${formSelector}`, JSON.stringify(formData));
  }

  setupMobileSearch() {
    // Customer search is now handled in customers.js
    // No additional setup needed here
  }

  setupCustomerTableHandlers() {
    // Call the original setupCustomerTableHandlers from customers.js module
    if (window.setupCustomerTableHandlers) {
      window.setupCustomerTableHandlers();
    }
  }

  setupMobileActions() {
    // Setup mobile-specific actions
    this.setupSwipeActions();
    this.setupPullToRefresh();
  }

  setupSwipeActions() {
    // Setup swipe actions for mobile cards
    const cardContainers = document.querySelectorAll('.mobile-cards-container');
    
    cardContainers.forEach(container => {
      let startX = 0;
      let startY = 0;
      let isSwiping = false;

      container.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isSwiping = false;
      });

      container.addEventListener('touchmove', (e) => {
        if (!startX || !startY) return;

        const deltaX = e.touches[0].clientX - startX;
        const deltaY = e.touches[0].clientY - startY;

        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
          isSwiping = true;
          e.preventDefault();
        }
      });

      container.addEventListener('touchend', (e) => {
        if (!isSwiping) return;

        const deltaX = e.changedTouches[0].clientX - startX;
        const card = e.target.closest('.product-card-mobile, .customer-card-mobile, .employee-card-mobile, .vat-card-mobile');
        
        if (card && Math.abs(deltaX) > 50) {
          if (deltaX > 0) {
            // Swipe right - show edit button
            const editBtn = card.querySelector('.edit-product-btn, .edit-customer-btn, .edit-employee-btn, .edit-vat-btn');
            if (editBtn) {
              editBtn.click();
            }
          } else {
            // Swipe left - show delete button
            const deleteBtn = card.querySelector('.delete-product-btn, .delete-customer-btn, .delete-employee-btn, .delete-vat-btn');
            if (deleteBtn) {
              deleteBtn.click();
            }
          }
        }

        startX = 0;
        startY = 0;
        isSwiping = false;
      });
    });
  }

  setupPullToRefresh() {
    // Setup pull-to-refresh functionality
    let startY = 0;
    let isPulling = false;

    document.addEventListener('touchstart', (e) => {
      if (e.target.closest('input, textarea, select, button')) return;
      startY = e.touches[0].clientY;
    });

    document.addEventListener('touchmove', (e) => {
      if (!startY || e.target.closest('input, textarea, select, button')) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startY;

      if (diff > 50 && window.scrollY === 0) {
        isPulling = true;
        this.showPullToRefreshIndicator();
      }
    });

    document.addEventListener('touchend', (e) => {
      if (!isPulling) return;
      isPulling = false;
      
      const diff = e.changedTouches[0].clientY - startY;
      if (diff > 100) {
        // Trigger refresh
        this.refreshCurrentSection();
      }
      
      this.hidePullToRefreshIndicator();
    });
  }

  showPullToRefreshIndicator() {
    let indicator = document.getElementById('pull-to-refresh-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'pull-to-refresh-indicator';
      indicator.className = 'fixed top-0 left-0 right-0 bg-indigo-600 text-white text-center py-2 z-50';
      indicator.innerHTML = 'Pull to refresh...';
      document.body.appendChild(indicator);
    }
    indicator.style.display = 'block';
  }

  hidePullToRefreshIndicator() {
    const indicator = document.getElementById('pull-to-refresh-indicator');
    if (indicator) {
      indicator.style.display = 'none';
    }
  }

  refreshCurrentSection() {
    // Refresh the current section based on what's visible
    const sections = ['#productSec', '#customerSec', '#shopSettingsSec', '#employeeSec', '#vatSec'];
    
    sections.forEach(sectionSelector => {
      const section = document.querySelector(sectionSelector);
      if (section && !section.classList.contains('hidden')) {
        // Trigger the appropriate refresh function
        if (sectionSelector === '#productSec' && window.loadProducts) {
          window.loadProducts();
        } else if (sectionSelector === '#customerSec' && window.loadCustomers) {
          window.loadCustomers();
        } else if (sectionSelector === '#shopSettingsSec' && window.initializeShopSettings) {
          window.initializeShopSettings();
        } else if (sectionSelector === '#employeeSec' && window.loadEmployees) {
          window.loadEmployees();
        } else if (sectionSelector === '#vatSec' && window.loadVat) {
          window.loadVat();
        }
      }
    });
  }

  showMobileSuccessMessage(message) {
    // Create success message
    const successDiv = document.createElement('div');
    successDiv.className = 'mobile-success-message';
    successDiv.textContent = message;
    
    // Add to page
    document.body.appendChild(successDiv);
    
    // Remove after 3 seconds
    setTimeout(() => {
      successDiv.remove();
    }, 3000);
  }

  showMobileErrorMessage(message) {
    // Create error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'mobile-error-message';
    errorDiv.textContent = message;
    
    // Add to page
    document.body.appendChild(errorDiv);
    
    // Remove after 3 seconds
    setTimeout(() => {
      errorDiv.remove();
    }, 3000);
  }

  // Public method to initialize mobile screens
  static initialize() {
    return new MobileScreens();
  }
  
  // Public method to manually setup view toggles
  setupViewToggles() {
    this.addMobileViewToggles();
  }
}

// Export for global access
window.MobileScreens = MobileScreens;

// Also expose the instance globally for easy access
if (window.mobileScreens) {
  window.mobileScreens.setupViewToggles = window.mobileScreens.setupViewToggles.bind(window.mobileScreens);
} 