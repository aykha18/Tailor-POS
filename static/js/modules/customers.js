// Customers Module

let editingCustomerId = null;

// Debounce function for search
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Load and render customers with loading effects
async function loadCustomers() {
  // Show loading overlay
  const overlay = document.getElementById('customerLoadingOverlay');
  const skeleton = document.getElementById('customerSkeleton');
  const table = document.getElementById('customerTable');
  const form = document.getElementById('customerForm');
  
  if (overlay) overlay.classList.remove('hidden');
  if (skeleton) skeleton.classList.remove('hidden');
  if (table) table.classList.add('opacity-0', 'translate-y-4');
  if (form) form.classList.add('opacity-0', 'translate-y-4');
  
  try {
    const resp = await fetch('/api/customers');
    const customers = await resp.json();
    
    // Store customers globally for bill creation
    window.customers = customers;
    
    const tbody = document.getElementById('customerTableBody');
    if (!tbody) return;
      
    // Simulate loading delay for better UX
    await new Promise(resolve => setTimeout(resolve, 800));
    
    tbody.innerHTML = customers.length
        ? customers.map((c, index) => `
          <tr class="group hover:bg-neutral-800/50 transition-all duration-200 transform hover:scale-[1.01] hover:shadow-sm" style="animation-delay: ${index * 0.1}s;">
            <td class="px-3 py-3">
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${c.customer_type === 'Business' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}">
                ${c.customer_type || 'Individual'}
              </span>
            </td>
            <td class="px-3 py-3">
              <div class="flex items-center gap-2">
                <div class="w-2 h-2 bg-indigo-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                <span class="font-medium text-neutral-200 group-hover:text-white transition-colors duration-200">${c.name || ''}</span>
              </div>
            </td>
            <td class="px-3 py-3">
              <span class="text-neutral-200 group-hover:text-white transition-colors duration-200">${c.business_name || ''}</span>
            </td>
            <td class="px-3 py-3">
              <span class="text-neutral-200 group-hover:text-white transition-colors duration-200">${c.phone || ''}</span>
            </td>
            <td class="px-3 py-3">
              <span class="text-neutral-200 group-hover:text-white transition-colors duration-200">${c.trn || ''}</span>
            </td>
            <td class="px-3 py-3">
              <span class="text-neutral-200 group-hover:text-white transition-colors duration-200">${c.city || ''}</span>
            </td>
            <td class="px-3 py-3">
              <span class="text-neutral-200 group-hover:text-white transition-colors duration-200">${c.area || ''}</span>
            </td>
            <td class="px-3 py-3 flex gap-2">
              <button class="edit-customer-btn text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 px-3 py-2 rounded transition-all duration-200 transform hover:scale-110 hover:shadow-sm" data-id="${c.customer_id}">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>
              <button class="delete-customer-btn text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-2 rounded transition-all duration-200 transform hover:scale-110 hover:shadow-sm" data-id="${c.customer_id}">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
          </td>
        </tr>
      `).join('')
        : `
          <tr>
            <td colspan="8" class="px-6 py-8 text-center">
              <div class="w-16 h-16 mx-auto mb-4 bg-neutral-800/50 rounded-full flex items-center justify-center">
                <svg class="w-8 h-8 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>
              </div>
              <p class="text-neutral-400 font-medium">No customers found</p>
              <p class="text-neutral-500 text-sm mt-1">Create your first customer above</p>
            </td>
          </tr>
        `;
      
      // Animate in the content
      setTimeout(() => {
        if (form) {
          form.classList.remove('opacity-0', 'translate-y-4');
          form.classList.add('opacity-100', 'translate-y-0');
        }
      }, 200);
      
      setTimeout(() => {
        if (table) {
          table.classList.remove('opacity-0', 'translate-y-4');
          table.classList.add('opacity-100', 'translate-y-0');
        }
      }, 400);
      
    } catch (error) {
      console.error('Error loading customers:', error);
      const tbody = document.getElementById('customerTableBody');
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" class="px-6 py-8 text-center">
              <div class="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
                <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
              </div>
              <p class="text-red-400 font-medium">Failed to load customers</p>
              <p class="text-neutral-500 text-sm mt-1">Please try again later</p>
            </td>
          </tr>
        `;
      }
    } finally {
      // Hide loading overlay and skeleton
      if (overlay) overlay.classList.add('hidden');
      if (skeleton) skeleton.classList.add('hidden');
      
      // Setup event handlers after customers are loaded
      setupCustomerTableHandlers();
      setupCustomerFormHandler();
      setupCustomerTypeHandler();
      
      // Add a small delay to ensure search input is available
      setTimeout(() => {
        setupCustomerSearch();
      }, 100);
      }
}

// Search customers function
async function searchCustomers(query) {
  
  
  const overlay = document.getElementById('customerLoadingOverlay');
  const skeleton = document.getElementById('customerSkeleton');
  const table = document.getElementById('customerTable');
  const form = document.getElementById('customerForm');
  
  if (overlay) overlay.classList.remove('hidden');
  if (skeleton) skeleton.classList.remove('hidden');
  if (table) table.classList.add('opacity-0', 'translate-y-4');
  if (form) form.classList.add('opacity-0', 'translate-y-4');
  
  try {
    const url = query ? `/api/customers?search=${encodeURIComponent(query)}` : '/api/customers';

    const resp = await fetch(url);
    const customers = await resp.json();

    
    // Store customers globally for bill creation
    window.customers = customers;
    
    const tbody = document.getElementById('customerTableBody');
    if (!tbody) return;
      
    // Simulate loading delay for better UX
    await new Promise(resolve => setTimeout(resolve, 300));
    
    tbody.innerHTML = customers.length
        ? customers.map((c, index) => `
          <tr class="customer-item group hover:bg-neutral-800/50 transition-all duration-200 transform hover:scale-[1.01] hover:shadow-sm" style="animation-delay: ${index * 0.1}s;">
            <td class="px-3 py-3">
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${c.customer_type === 'Business' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}">
                ${c.customer_type || 'Individual'}
              </span>
            </td>
            <td class="px-3 py-3">
              <div class="flex items-center gap-2">
                <div class="w-2 h-2 bg-indigo-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                <span class="font-medium text-neutral-200 group-hover:text-white transition-colors duration-200">${c.name || ''}</span>
              </div>
            </td>
            <td class="px-3 py-3">
              <span class="text-neutral-200 group-hover:text-white transition-colors duration-200">${c.business_name || ''}</span>
            </td>
            <td class="px-3 py-3">
              <span class="text-neutral-200 group-hover:text-white transition-colors duration-200">${c.phone || ''}</span>
            </td>
            <td class="px-3 py-3">
              <span class="text-neutral-200 group-hover:text-white transition-colors duration-200">${c.trn || ''}</span>
            </td>
            <td class="px-3 py-3">
              <span class="text-neutral-200 group-hover:text-white transition-colors duration-200">${c.city || ''}</span>
            </td>
            <td class="px-3 py-3">
              <span class="text-neutral-200 group-hover:text-white transition-colors duration-200">${c.area || ''}</span>
            </td>
            <td class="px-3 py-3 flex gap-2">
              <button class="edit-customer-btn text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 px-3 py-2 rounded transition-all duration-200 transform hover:scale-110 hover:shadow-sm" data-id="${c.customer_id}">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>
              <button class="delete-customer-btn text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-2 rounded transition-all duration-200 transform hover:scale-110 hover:shadow-sm" data-id="${c.customer_id}">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
          </td>
        </tr>
      `).join('')
        : `
          <tr>
            <td colspan="8" class="px-6 py-8 text-center">
              <div class="w-16 h-16 mx-auto mb-4 bg-neutral-800/50 rounded-full flex items-center justify-center">
                <svg class="w-8 h-8 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
              <p class="text-neutral-400 font-medium">No customers found</p>
              <p class="text-neutral-500 text-sm mt-1">${query ? 'Try a different search term' : 'Create your first customer above'}</p>
            </td>
          </tr>
        `;
      
      // Animate in the content
      setTimeout(() => {
        if (form) {
          form.classList.remove('opacity-0', 'translate-y-4');
          form.classList.add('opacity-100', 'translate-y-0');
        }
      }, 200);
      
      setTimeout(() => {
        if (table) {
          table.classList.remove('opacity-0', 'translate-y-4');
          table.classList.add('opacity-100', 'translate-y-0');
        }
      }, 400);
      
      // Setup event handlers for the new rows
      setupCustomerTableHandlers();
      
      // Re-setup search after updating table
      setTimeout(() => {
        setupCustomerSearch();
      }, 100);
      
  } catch (error) {
    console.error('Error searching customers:', error);
  } finally {
    // Hide loading overlay
    if (overlay) overlay.classList.add('hidden');
    if (skeleton) skeleton.classList.add('hidden');
  }
}

// Setup customer table event handlers
function setupCustomerTableHandlers() {
  const customerTable = document.getElementById('customerTable');
  
  if (customerTable) {
    // Remove existing event listener if any
    customerTable.removeEventListener('click', customerTableClickHandler);
    customerTable.addEventListener('click', customerTableClickHandler);
  }
}

// Setup customer form submission handler
function setupCustomerFormHandler() {
  const customerForm = document.getElementById('customerForm');
  
  if (customerForm) {
    // Remove existing event listener if any
    customerForm.removeEventListener('submit', handleCustomerFormSubmit);
    customerForm.addEventListener('submit', handleCustomerFormSubmit);
    // Ensure editingCustomerId resets on form reset
    customerForm.addEventListener('reset', () => { editingCustomerId = null; });
  }
  
  // Setup customer mobile autocomplete
  setupCustomerMobileAutocomplete();
}

// Setup customer type change handler
function setupCustomerTypeHandler() {
  const customerType = document.getElementById('customerType');
  
  if (customerType) {
    customerType.addEventListener('change', handleCustomerTypeChange);
    // Initialize on page load
    handleCustomerTypeChange();
  }
}

// Handle customer type change
function handleCustomerTypeChange() {
  const customerType = document.getElementById('customerType');
  const businessFields = document.querySelectorAll('.business-customer-field');
  
  if (customerType && customerType.value === 'Business') {
    businessFields.forEach(field => field.style.display = 'flex');
    // Make business fields required
    const businessNameField = document.getElementById('customerBusinessName');
    const businessAddressField = document.getElementById('customerBusinessAddress');
    if (businessNameField) businessNameField.required = true;
    if (businessAddressField) businessAddressField.required = true;
  } else {
    businessFields.forEach(field => field.style.display = 'none');
    // Remove required from business fields
    const businessNameField = document.getElementById('customerBusinessName');
    const businessAddressField = document.getElementById('customerBusinessAddress');
    if (businessNameField) businessNameField.required = false;
    if (businessAddressField) businessAddressField.required = false;
  }
}

// Handle customer form submission
async function handleCustomerFormSubmit(e) {
  e.preventDefault();
  const form = e.target;
  
  const customerData = {
    name: (form.querySelector('#customerName') || {}).value || '',
    phone: (form.querySelector('#customerMobile') || {}).value || '',
    customer_type: (form.querySelector('#customerType') || {}).value || 'Individual',
    city: (form.querySelector('#customerCity') || {}).value || '',
    area: (form.querySelector('#customerArea') || {}).value || '',
    business_name: (form.querySelector('#customerBusinessName') || {}).value || '',
    trn: (form.querySelector('#customerTRN') || {}).value || '',
    email: (form.querySelector('#customerEmail') || {}).value || '',
    address: (form.querySelector('#customerAddress') || {}).value || '',
    business_address: (form.querySelector('#customerBusinessAddress') || {}).value || ''
  };
  
  if (!customerData.name || !customerData.phone) {
    alert('Name and phone are required');
    return;
  }
  
  // Validate business fields if customer type is Business
  if (customerData.customer_type === 'Business') {
    if (!customerData.business_name) {
      alert('Business name is required for business customers');
      return;
    }
    if (!customerData.business_address) {
      alert('Business address is required for business customers');
      return;
    }
  }
  
  // Basic phone number validation
  const phoneDigits = (customerData.phone || '').replace(/\D/g, '');
  if (phoneDigits && (phoneDigits.length < 9 || phoneDigits.length > 10)) {
    alert('Please enter a valid phone number (9-10 digits)');
    return;
  }
  customerData.phone = phoneDigits;
  
  try {
    const url = editingCustomerId ? `/api/customers/${editingCustomerId}` : '/api/customers';
    const method = editingCustomerId ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(customerData)
    });
    
    if (response.ok) {
      // Reset form
      resetCustomerForm();
      
      // Reload customers
      await loadCustomers();
      
      // Show success message
      if (window.showToast) {
        window.showToast('Customer saved successfully!', 'success');
      }
    } else {
      const errorData = await response.json();
      console.error('Server response:', response.status, errorData);
      
      // Show specific error message for duplicate phone
      if (errorData.error && errorData.error.includes('Phone number')) {
        if (window.showToast) {
          window.showToast(errorData.error, 'error');
        } else {
          alert(errorData.error);
        }
      } else {
        throw new Error(`Failed to save customer: ${response.status} - ${JSON.stringify(errorData)}`);
      }
    }
  } catch (error) {
    console.error('Error saving customer:', error);
    if (window.showToast) {
      window.showToast('Failed to save customer. Please try again.', 'error');
    }
  }
}

// Customer table click handler function
async function customerTableClickHandler(e) {
  const editBtn = e.target.closest('.edit-customer-btn');
  const deleteBtn = e.target.closest('.delete-customer-btn');
  
  if (editBtn) {
    const id = editBtn.getAttribute('data-id');
    editCustomer(id);
  }
  if (deleteBtn) {
    const id = deleteBtn.getAttribute('data-id');
    const confirmed = await showConfirmDialog(
      'Are you sure you want to delete this customer? This action cannot be undone.',
      'Delete Customer',
      'delete'
    );
    if (confirmed) {
      fetch(`/api/customers/${id}`, { method: 'DELETE' })
        .then(() => loadCustomers());
    }
  }
}

// Edit customer function
async function editCustomer(id) {
  try {
    const response = await fetch(`/api/customers/${id}`);
    const customer = await response.json();
    
    if (customer && !customer.error) {
      const form = document.getElementById('customerForm');
      if (!form) return;
      // Populate all form fields
      const setValue = (selector, value) => {
        const el = form.querySelector(selector);
        if (el) el.value = value || '';
      };
      setValue('#customerName', customer.name);
      setValue('#customerMobile', customer.phone);
      setValue('#customerCity', customer.city);
      setValue('#customerArea', customer.area);
      setValue('#customerType', customer.customer_type || 'Individual');
      setValue('#customerBusinessName', customer.business_name);
      setValue('#customerTRN', customer.trn);
      setValue('#customerEmail', customer.email);
      setValue('#customerAddress', customer.address);
      setValue('#customerBusinessAddress', customer.business_address);
      
      // Show/hide business fields based on customer type
      handleCustomerTypeChange();
      
      editingCustomerId = id;
      
  
    }
  } catch (error) {
    console.error('Error editing customer:', error);
  }
}

// Function to reset customer form
function resetCustomerForm() {
  const form = document.getElementById('customerForm');
  
  if (form) {
    form.reset();
  }
  
  editingCustomerId = null;
}

// Initialize area autocomplete elements
function initializeAreaAutocomplete() {
  const customerAreaInput = document.getElementById('customerArea');
  
  if (!customerAreaInput) {
    return;
  }

  let areaSuggestions = [];
  let selectedAreaIndex = -1;
  let customerAreaDropdown;

  // Load area suggestions
  async function loadAreaSuggestions() {
    try {
      const response = await fetch('/api/areas');
      areaSuggestions = await response.json();
    } catch (error) {
      console.error('Error loading area suggestions:', error);
    }
  }

  // Setup area event listeners
  function setupAreaEventListeners() {
    customerAreaInput.addEventListener('input', function() {
      const query = this.value.toLowerCase();
      const filteredAreas = areaSuggestions.filter(area => 
        area.toLowerCase().includes(query)
      );
      
      if (filteredAreas.length > 0) {
        showAreaSuggestions(filteredAreas);
      } else {
        hideAreaDropdown();
      }
    });

    customerAreaInput.addEventListener('focus', function() {
      if (this.value.trim()) {
        const query = this.value.toLowerCase();
        const filteredAreas = areaSuggestions.filter(area => 
          area.toLowerCase().includes(query)
        );
        if (filteredAreas.length > 0) {
          showAreaSuggestions(filteredAreas);
        }
      }
    });
  }

  // Filter area suggestions
  function filterAreaSuggestions(query) {
    return areaSuggestions.filter(area => 
      area.toLowerCase().includes(query.toLowerCase())
    );
  }

  // Show area suggestions
  function showAreaSuggestions(areas) {
    if (!customerAreaDropdown) {
      customerAreaDropdown = document.createElement('div');
      customerAreaDropdown.className = 'area-suggestion absolute z-50 w-full bg-neutral-800 border border-neutral-600 rounded-lg shadow-lg max-h-60 overflow-y-auto mt-1';
      customerAreaDropdown.style.display = 'none';
      customerAreaInput.parentNode.style.position = 'relative';
      customerAreaInput.parentNode.appendChild(customerAreaDropdown);
    }

    customerAreaDropdown.innerHTML = areas.map((area, index) => `
      <div class="area-option px-4 py-2 hover:bg-neutral-700 cursor-pointer border-b border-neutral-600 last:border-b-0" 
           data-area="${area}">
        <span class="text-neutral-200">${area}</span>
      </div>
    `).join('');

    customerAreaDropdown.style.display = 'block';
  }

  // Hide area dropdown
  function hideAreaDropdown() {
    if (customerAreaDropdown) {
      customerAreaDropdown.style.display = 'none';
    }
  }

  // Update selected suggestion
  function updateSelectedSuggestion() {
    const options = customerAreaDropdown?.querySelectorAll('.area-option');
    if (!options) return;

    options.forEach((option, index) => {
      if (index === selectedAreaIndex) {
        option.classList.add('bg-neutral-700');
      } else {
        option.classList.remove('bg-neutral-700');
      }
    });
  }

  // Handle area selection
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('area-option')) {
      const selectedArea = e.target.getAttribute('data-area');
      customerAreaInput.value = selectedArea;
      hideAreaDropdown();
    }
  });

  // Hide dropdown when clicking outside
  document.addEventListener('click', function(e) {
    if (!customerAreaInput.contains(e.target) && (!customerAreaDropdown || !customerAreaDropdown.contains(e.target))) {
      hideAreaDropdown();
    }
  });

  // Initialize
  loadAreaSuggestions();
  setupAreaEventListeners();
}

// Initialize area suggestions and autocomplete
async function initializeAreaAutocompleteWithData() {
  initializeAreaAutocomplete();
}

// Setup customer mobile autocomplete
function setupCustomerMobileAutocomplete() {
  const customerMobileElement = document.getElementById('customerMobile');
  if (customerMobileElement) {
    let customerMobileDropdown = null;
    let debounceTimer = null;

    // Create customer mobile dropdown
    function createCustomerMobileDropdown() {
      if (customerMobileDropdown) {
        document.body.removeChild(customerMobileDropdown);
      }
      
      customerMobileDropdown = document.createElement('div');
      customerMobileDropdown.id = 'customerMobileDropdown';
      customerMobileDropdown.className = 'fixed bg-neutral-900 border border-neutral-700 rounded-lg shadow-lg max-h-48 overflow-y-auto z-99999';
      customerMobileDropdown.style.display = 'none';
      document.body.appendChild(customerMobileDropdown);
      
      return customerMobileDropdown;
    }

    // Show customer mobile suggestions
    function showCustomerMobileSuggestions(customers) {
      if (!customerMobileDropdown) {
        customerMobileDropdown = createCustomerMobileDropdown();
      }
      
      if (customers.length === 0) {
        customerMobileDropdown.style.display = 'none';
        return;
      }

      const rect = customerMobileElement.getBoundingClientRect();
      customerMobileDropdown.style.left = rect.left + 'px';
      customerMobileDropdown.style.top = (rect.bottom + 5) + 'px';
      customerMobileDropdown.style.width = rect.width + 'px';
      customerMobileDropdown.style.display = 'block';

      customerMobileDropdown.innerHTML = customers.map(customer => `
        <div class="customer-mobile-suggestion-item px-3 py-2 hover:bg-neutral-800 cursor-pointer border-b border-neutral-700 last:border-b-0" 
             data-phone="${customer.phone}" 
             data-customer='${JSON.stringify(customer)}'>
          <div class="flex items-center justify-between">
            <div>
              <div class="text-white font-medium">${customer.name}</div>
              <div class="text-neutral-400 text-sm">${customer.phone}</div>
              ${customer.business_name ? `<div class="text-neutral-500 text-xs">${customer.business_name}</div>` : ''}
            </div>
            <div class="text-xs text-neutral-500">
              ${customer.city || ''} ${customer.area ? `- ${customer.area}` : ''}
            </div>
          </div>
        </div>
      `).join('');

      // Add click handlers
      customerMobileDropdown.querySelectorAll('.customer-mobile-suggestion-item').forEach(item => {
        item.addEventListener('click', function() {
          const customer = JSON.parse(this.dataset.customer);
          populateCustomerFields(customer);
          customerMobileElement.value = customer.phone;
          hideCustomerMobileDropdown();
        });
      });
    }

    // Hide customer mobile dropdown
    function hideCustomerMobileDropdown() {
      if (customerMobileDropdown) {
        customerMobileDropdown.style.display = 'none';
      }
    }

    // Search customers by mobile number
    async function searchCustomersByMobile(query) {
      try {
        const response = await fetch(`/api/customers?search=${encodeURIComponent(query)}`);
        if (response.ok) {
          const customers = await response.json();
          // Filter customers whose phone number starts with the query
          const filteredCustomers = customers.filter(customer => 
            customer.phone && customer.phone.startsWith(query)
          );
          return filteredCustomers.slice(0, 5); // Limit to 5 suggestions
        }
        return [];
      } catch (error) {
        console.error('Error searching customers by mobile:', error);
        return [];
      }
    }

    // Debounced search function
    function debouncedCustomerMobileSearch(query) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        if (query.length >= 5) {
          const customers = await searchCustomersByMobile(query);
          showCustomerMobileSuggestions(customers);
        } else {
          hideCustomerMobileDropdown();
        }
      }, 300);
    }

    // Input event for real-time autocomplete
    customerMobileElement.addEventListener('input', function(e) {
      const phone = e.target.value.trim();
      if (phone.length >= 5) {
        debouncedCustomerMobileSearch(phone);
      } else {
        hideCustomerMobileDropdown();
      }
    });

    // Focus event to show suggestions if there's a value
    customerMobileElement.addEventListener('focus', function(e) {
      const phone = e.target.value.trim();
      if (phone.length >= 5) {
        debouncedCustomerMobileSearch(phone);
      }
    });

    // Handle escape key
    customerMobileElement.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        hideCustomerMobileDropdown();
      }
    });

    // Hide dropdown when clicking outside
    document.addEventListener('click', function(e) {
      if (customerMobileDropdown && !customerMobileElement.contains(e.target) && !customerMobileDropdown.contains(e.target)) {
        hideCustomerMobileDropdown();
      }
    });
  }
}

// Populate customer fields
function populateCustomerFields(customer) {
  const customerNameElement = document.getElementById('customerName');
  const customerMobileElement = document.getElementById('customerMobile');
  const customerCityElement = document.getElementById('customerCity');
  const customerTypeElement = document.getElementById('customerType');
  const customerBusinessNameElement = document.getElementById('customerBusinessName');
  const customerTRNElement = document.getElementById('customerTRN');
  
  if (customerNameElement) customerNameElement.value = customer.name || '';
  if (customerMobileElement) customerMobileElement.value = customer.phone || '';
  if (customerCityElement) customerCityElement.value = customer.city || '';
  if (customerTypeElement) customerTypeElement.value = customer.customer_type || 'Individual';
  if (customerBusinessNameElement) customerBusinessNameElement.value = customer.business_name || '';
  if (customerTRNElement) customerTRNElement.value = customer.trn || '';
  
  // Handle customer type change to show/hide business fields
  if (customerTypeElement) {
    const event = new Event('change');
    customerTypeElement.dispatchEvent(event);
  }
}

// Setup customer search handler
function setupCustomerSearch() {
  const customerSearch = document.getElementById('customerSearch');
  
  if (customerSearch) {
    // Remove existing event listener if any
    customerSearch.removeEventListener('input', debouncedCustomerSearch);
    customerSearch.addEventListener('input', debouncedCustomerSearch);
  }
}

// Debounced customer search
const debouncedCustomerSearch = debounce(handleCustomerSearch, 300);

// Handle customer search
async function handleCustomerSearch(e) {
  const searchTerm = e.target.value.trim();
  
  if (searchTerm.length < 2) {
    // If search term is too short, show all customers
    await loadCustomers();
    return;
  }
  
  await searchCustomers(searchTerm);
}

// Make functions globally available
window.loadCustomers = loadCustomers;
window.searchCustomers = searchCustomers;
window.setupCustomerSearch = setupCustomerSearch;
window.initializeAreaAutocompleteWithData = initializeAreaAutocompleteWithData;
window.editCustomer = editCustomer;
window.resetCustomerForm = resetCustomerForm;
window.setupCustomerTableHandlers = setupCustomerTableHandlers;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAreaAutocompleteWithData);
} else {
  initializeAreaAutocompleteWithData();
} 