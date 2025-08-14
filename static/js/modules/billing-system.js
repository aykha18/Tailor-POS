// Billing System Module

// Global variables
let bill = []; // Primary declaration of 'bill'
let currentBillNumber = '';
let selectedMasterId = null;

function initializeBillingSystem() {


  function showPaymentModal({billNum, customer, paid, due, max, total, delivery, status, onOk}) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center';
    
    modal.innerHTML = `
      <div class="bg-neutral-900 border border-neutral-700 rounded-xl p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold mb-4">Payment Details</h3>
        <div class="space-y-3">
          <div class="flex justify-between">
            <span class="text-neutral-400">Bill #:</span>
            <span class="font-medium">${billNum}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-neutral-400">Customer:</span>
            <span class="font-medium">${customer}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-neutral-400">Total Amount:</span>
            <span class="font-medium text-green-400">AED ${total}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-neutral-400">Advance Paid:</span>
            <span class="font-medium text-blue-400">AED ${paid}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-neutral-400">Balance Due:</span>
            <span class="font-medium text-red-400">AED ${due}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-neutral-400">Delivery Date:</span>
            <span class="font-medium">${delivery}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-neutral-400">Status:</span>
            <span class="font-medium ${status === 'Completed' ? 'text-green-400' : 'text-yellow-400'}">${status}</span>
          </div>
          <div class="mt-4 pt-4 border-t border-neutral-700">
            <label class="block text-sm font-medium text-neutral-300 mb-2">Payment Amount:</label>
            <input type="number" step="0.01" min="0" max="${due}" value="${due}" 
                   class="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-400/60 focus:border-transparent payment-amount-input"
                   placeholder="Enter payment amount">
          </div>
        </div>
        <div class="flex gap-3 mt-6">
          <button class="flex-1 px-4 py-2 rounded-lg border border-neutral-600 hover:bg-neutral-800 transition-colors cancel-btn">
            Cancel
          </button>
          <button class="flex-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors ok-btn">
            Mark as Paid
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    function cleanup() {
      document.body.removeChild(modal);
    }
    
    function onOkClick() {
      const paymentAmount = parseFloat(modal.querySelector('.payment-amount-input').value) || 0;
      cleanup();
      if (onOk) onOk(paymentAmount);
    }
    
    function onCancelClick() {
      cleanup();
    }
    
    modal.querySelector('.ok-btn').addEventListener('click', onOkClick);
    modal.querySelector('.cancel-btn').addEventListener('click', onCancelClick);
    
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        onCancelClick();
      }
    });
  }

  function showPaymentProgressModal(onDone) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center';
    
    modal.innerHTML = `
      <div class="bg-neutral-900 border border-neutral-700 rounded-xl p-6 max-w-md w-full mx-4">
        <div class="text-center">
          <div class="w-16 h-16 mx-auto mb-4 bg-indigo-600/20 rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-indigo-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
          </div>
          <h3 class="text-lg font-semibold mb-2">Processing Payment</h3>
          <p class="text-neutral-400 mb-4">Please wait while we process your payment...</p>
          <div class="w-full bg-neutral-700 rounded-full h-2">
            <div class="bg-indigo-600 h-2 rounded-full animate-pulse" style="width: 60%"></div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    function animateStep() {
      const progressBar = modal.querySelector('.bg-indigo-600');
      let width = 60;
      
      const interval = setInterval(() => {
        width += Math.random() * 10;
        if (width >= 100) {
          width = 100;
          clearInterval(interval);
          setTimeout(() => {
            document.body.removeChild(modal);
            if (onDone) onDone();
          }, 500);
        }
        progressBar.style.width = width + '%';
      }, 200);
    }
    
    setTimeout(animateStep, 1000);
  }

  // Modern Alert System
  function showModernAlert(message, type = 'info', title = null) {
    // For "Item added" messages, show a simple toast instead of modal
    if (message.includes('Item added') && type === 'success') {
      showSimpleToast('Item Added', 'success');
      return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center';
    
    // Determine colors based on type
    let iconColor, bgColor, borderColor, textColor;
    switch (type) {
      case 'success':
        iconColor = 'text-green-400';
        bgColor = 'bg-green-600/20';
        borderColor = 'border-green-500/30';
        textColor = 'text-green-400';
        break;
      case 'error':
        iconColor = 'text-red-400';
        bgColor = 'bg-red-600/20';
        borderColor = 'border-red-500/30';
        textColor = 'text-red-400';
        break;
      case 'warning':
        iconColor = 'text-yellow-400';
        bgColor = 'bg-yellow-600/20';
        borderColor = 'border-yellow-500/30';
        textColor = 'text-yellow-400';
        break;
      default:
        iconColor = 'text-blue-400';
        bgColor = 'bg-blue-600/20';
        borderColor = 'border-blue-500/30';
        textColor = 'text-blue-400';
    }
    
    // Get appropriate icon
    let iconSvg;
    switch (type) {
      case 'success':
        iconSvg = `<svg class="w-6 h-6 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>`;
        break;
      case 'error':
        iconSvg = `<svg class="w-6 h-6 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>`;
        break;
      case 'warning':
        iconSvg = `<svg class="w-6 h-6 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
        </svg>`;
        break;
      default:
        iconSvg = `<svg class="w-6 h-6 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>`;
    }
    
    modal.innerHTML = `
      <div class="bg-neutral-900 border ${borderColor} rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <div class="flex items-start space-x-3">
          <div class="flex-shrink-0">
            <div class="w-10 h-10 ${bgColor} rounded-full flex items-center justify-center">
              ${iconSvg}
            </div>
          </div>
          <div class="flex-1 min-w-0">
            ${title ? `<h3 class="text-lg font-semibold text-white mb-1">${title}</h3>` : ''}
            <p class="text-sm text-neutral-300">${message}</p>
          </div>
        </div>
        <div class="mt-6 flex justify-end">
          <button class="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 focus:ring-offset-neutral-900">
            OK
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Auto-remove after 5 seconds for success/info, 8 seconds for warnings, 10 seconds for errors
    const autoRemoveTime = type === 'success' || type === 'info' ? 5000 : type === 'warning' ? 8000 : 10000;
    const autoRemove = setTimeout(() => {
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
      }
    }, autoRemoveTime);
    
    // Manual close
    const closeModal = () => {
      clearTimeout(autoRemove);
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
      }
    };
    
    modal.querySelector('button').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
    
    // Keyboard support
    const handleKeydown = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        closeModal();
        document.removeEventListener('keydown', handleKeydown);
      }
    };
    document.addEventListener('keydown', handleKeydown);
  }

  function showSimpleToast(message, type = 'info') {
    // Remove any existing toasts
    const existingToasts = document.querySelectorAll('.simple-toast');
    existingToasts.forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = 'simple-toast fixed top-4 right-4 z-50 transform transition-all duration-300 ease-out translate-x-full';
    
    // Determine colors based on type
    let bgColor, textColor, iconColor;
    switch (type) {
      case 'success':
        bgColor = 'bg-green-600';
        textColor = 'text-white';
        iconColor = 'text-green-100';
        break;
      case 'error':
        bgColor = 'bg-red-600';
        textColor = 'text-white';
        iconColor = 'text-red-100';
        break;
      case 'warning':
        bgColor = 'bg-yellow-600';
        textColor = 'text-white';
        iconColor = 'text-yellow-100';
        break;
      default:
        bgColor = 'bg-blue-600';
        textColor = 'text-white';
        iconColor = 'text-blue-100';
    }
    
    toast.innerHTML = `
      <div class="${bgColor} ${textColor} px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 max-w-sm">
        <svg class="w-5 h-5 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <span class="text-sm font-medium">${message}</span>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
    }, 10);
    
    // Auto-remove after 2 seconds
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, 2000);
  }

  function togglePrint() {
    const printSection = document.getElementById('printSection');
    if (printSection) {
      printSection.classList.toggle('hidden');
    }
  }

  function renderBillTable() {
    const tbody = document.getElementById('billTable')?.querySelector('tbody');
    if (!tbody) return;
    
    tbody.innerHTML = bill.map((item, index) => `
      <tr class="hover:bg-neutral-800/50 transition-colors swipe-action" data-index="${index}">
        <td class="px-3 py-3">${item.product_name}</td>
        <td class="px-3 py-3">${item.quantity}</td>
        <td class="px-3 py-3">AED ${item.rate}</td>
        <td class="px-3 py-3">AED ${item.discount || 0}</td>
        <td class="px-3 py-3">AED ${item.advance_paid || 0}</td>
        <td class="px-3 py-3">AED ${item.vat_amount.toFixed(2)}</td>
        <td class="px-3 py-3">AED ${item.total.toFixed(2)}</td>
        <td class="px-3 py-3 flex gap-2">
          <button class="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 px-2 py-1 rounded transition-all duration-200 transform hover:scale-110 hover:shadow-sm mobile-btn" onclick="editBillItem(${index})">
            Edit
          </button>
          <button class="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 rounded transition-all duration-200 transform hover:scale-110 hover:shadow-sm mobile-btn" onclick="deleteBillItem(${index})">
            Delete
          </button>
        </td>
      </tr>
    `).join('');
    
    // Reinitialize swipe actions for mobile after rendering table
    if (window.mobileEnhancements && window.mobileEnhancements.setupSwipeActions) {
      setTimeout(() => {
        window.mobileEnhancements.setupSwipeActions();
      }, 100);
    }
  }

  function updateTotals() {
    const subtotal = bill.reduce((sum, item) => sum + item.total, 0); // Total after discount
    const totalAdvance = bill.reduce((sum, item) => sum + (item.advance_paid || 0), 0); // Total advance paid
    const totalVat = bill.reduce((sum, item) => sum + item.vat_amount, 0); // Sum of individual VAT amounts
    const totalBeforeAdvance = subtotal + totalVat;
    const amountDue = totalBeforeAdvance - totalAdvance; // Deduct advance from total
    
    // Enable/disable action buttons based on bill items
    const whatsappBtn = document.getElementById('whatsappBtn');
    const emailBtn = document.getElementById('emailBtn');
    const printBtn = document.getElementById('printBtn');
    
    if (bill.length > 0) {
      // Enable buttons when items exist
      if (whatsappBtn) {
        whatsappBtn.disabled = false;
        whatsappBtn.classList.remove('opacity-50', 'pointer-events-none', 'bg-green-600/40', 'text-white/60');
        whatsappBtn.classList.add('bg-green-600', 'text-white', 'hover:bg-green-500');
      }
      if (emailBtn) {
        emailBtn.disabled = false;
        emailBtn.classList.remove('opacity-50', 'pointer-events-none', 'bg-blue-600/40', 'text-white/60');
        emailBtn.classList.add('bg-blue-600', 'text-white', 'hover:bg-blue-500');
      }
      if (printBtn) {
        printBtn.disabled = false;
        printBtn.classList.remove('opacity-50', 'pointer-events-none', 'bg-indigo-600/40', 'text-white/60');
        printBtn.classList.add('bg-indigo-600', 'text-white', 'hover:bg-indigo-500');
      }
    } else {
      // Disable buttons when no items
      if (whatsappBtn) {
        whatsappBtn.disabled = true;
        whatsappBtn.classList.add('opacity-50', 'pointer-events-none', 'bg-green-600/40', 'text-white/60');
        whatsappBtn.classList.remove('bg-green-600', 'text-white', 'hover:bg-green-500');
      }
      if (emailBtn) {
        emailBtn.disabled = true;
        emailBtn.classList.add('opacity-50', 'pointer-events-none', 'bg-blue-600/40', 'text-white/60');
        emailBtn.classList.remove('bg-blue-600', 'text-white', 'hover:bg-blue-500');
      }
      if (printBtn) {
        printBtn.disabled = true;
        printBtn.classList.add('opacity-50', 'pointer-events-none', 'bg-indigo-600/40', 'text-white/60');
        printBtn.classList.remove('bg-indigo-600', 'text-white', 'hover:bg-indigo-500');
      }
    }
    
    const subtotalElement = document.getElementById('subTotal');
    const vatElement = document.getElementById('vatAmount');
    const totalElement = document.getElementById('amountDue');
    
         if (subtotalElement) {
       subtotalElement.textContent = `AED ${subtotal.toFixed(2)}`;
     }
     if (vatElement) {
       vatElement.textContent = `AED ${totalVat.toFixed(2)}`;
     }
     if (totalElement) {
       totalElement.textContent = `AED ${amountDue.toFixed(2)}`;
     }
  }

  async function getNextBillNumber() {
    try {
      const response = await fetch('/api/next-bill-number');
      const data = await response.json();
      return data.bill_number;
    } catch (error) {
      console.error('Error getting next bill number:', error);
      return null;
    }
  }

  async function setDefaultBillingDates() {
    const today = new Date();
    const deliveryDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    
    const billDateElement = document.getElementById('billDate');
    const trialDateElement = document.getElementById('trialDate');
    const billNumberElement = document.getElementById('billNumber');
    
    // Set default dates
    if (billDateElement) {
      billDateElement.value = today.toISOString().slice(0, 10);
    }
    
    if (trialDateElement) {
      trialDateElement.value = deliveryDate.toISOString().slice(0, 10);
    }
    
    // Set auto-generated bill number
    if (billNumberElement) {
      const nextBillNumber = await getNextBillNumber();
      if (nextBillNumber) {
        billNumberElement.value = nextBillNumber;
      }
    }
  }

  // Customer fetching by mobile number
  async function fetchCustomerByMobile(phone) {
    try {
      const response = await fetch(`/api/customers?phone=${encodeURIComponent(phone)}`);
      if (response.ok) {
        const customers = await response.json();
        if (Array.isArray(customers) && customers.length > 0) {
          return customers[0]; // Return the first matching customer
        }
      }
      return null;
    } catch (error) {
      console.error('Error fetching customer by mobile:', error);
      return null;
    }
  }

  function populateCustomerFields(customer) {
    const billCustomerElement = document.getElementById('billCustomer');
    const billMobileElement = document.getElementById('billMobile');
    const billCityElement = document.getElementById('billCity');
    const billAreaElement = document.getElementById('billArea');
    const billTRNElement = document.getElementById('billTRN');
    const billCustomerTypeElement = document.getElementById('billCustomerType');
    const billBusinessNameElement = document.getElementById('billBusinessName');
    const billBusinessAddressElement = document.getElementById('billBusinessAddress');
    
    if (billCustomerElement) billCustomerElement.value = customer.name || '';
    if (billMobileElement) billMobileElement.value = customer.phone || '';
    if (billCityElement) billCityElement.value = customer.city || '';
    if (billAreaElement) billAreaElement.value = customer.area || '';
    if (billTRNElement) billTRNElement.value = customer.trn || '';
    if (billCustomerTypeElement) billCustomerTypeElement.value = customer.customer_type || 'Individual';
    if (billBusinessNameElement) billBusinessNameElement.value = customer.business_name || '';
    if (billBusinessAddressElement) billBusinessAddressElement.value = customer.business_address || '';
    
    // Show/hide business fields based on customer type
    const businessFields = document.querySelectorAll('.business-billing-field');
    const trnField = document.querySelector('.trn-billing-field');
    
    if (customer.customer_type === 'Business') {
      businessFields.forEach(field => field.style.display = 'flex');
      if (trnField) trnField.style.display = 'flex';
      if (billBusinessNameElement) billBusinessNameElement.required = true;
      if (billBusinessAddressElement) billBusinessAddressElement.required = true;
    } else {
      businessFields.forEach(field => field.style.display = 'none');
      if (trnField) trnField.style.display = 'none';
      if (billBusinessNameElement) billBusinessNameElement.required = false;
      if (billBusinessAddressElement) billBusinessAddressElement.required = false;
    }
  }

  function clearCustomerFields() {
    const billCustomerElement = document.getElementById('billCustomer');
    const billMobileElement = document.getElementById('billMobile');
    const billCityElement = document.getElementById('billCity');
    const billAreaElement = document.getElementById('billArea');
    const billTRNElement = document.getElementById('billTRN');
    const billCustomerTypeElement = document.getElementById('billCustomerType');
    const billBusinessNameElement = document.getElementById('billBusinessName');
    const billBusinessAddressElement = document.getElementById('billBusinessAddress');
    
    if (billCustomerElement) billCustomerElement.value = '';
    if (billMobileElement) billMobileElement.value = '';
    if (billCityElement) billCityElement.value = '';
    if (billAreaElement) billAreaElement.value = '';
    if (billTRNElement) billTRNElement.value = '';
    if (billCustomerTypeElement) billCustomerTypeElement.value = 'Individual';
    if (billBusinessNameElement) billBusinessNameElement.value = '';
    if (billBusinessAddressElement) billBusinessAddressElement.value = '';
    
    // Hide business fields for new customer
    const businessFields = document.querySelectorAll('.business-billing-field');
    const trnField = document.querySelector('.trn-billing-field');
    businessFields.forEach(field => field.style.display = 'none');
    if (trnField) trnField.style.display = 'none';
    if (billBusinessNameElement) billBusinessNameElement.required = false;
    if (billBusinessAddressElement) billBusinessAddressElement.required = false;
  }

  // Setup mobile input event listener for customer fetching
  function setupMobileCustomerFetch() {
    const billMobileElement = document.getElementById('billMobile');
    if (billMobileElement) {
      let mobileDropdown = null;
      let debounceTimer = null;

      // Create mobile dropdown
      function createMobileDropdown() {
        if (mobileDropdown) {
          document.body.removeChild(mobileDropdown);
        }
        
        mobileDropdown = document.createElement('div');
        mobileDropdown.id = 'mobileDropdown';
        mobileDropdown.className = 'fixed bg-neutral-900 border border-neutral-700 rounded-lg shadow-lg max-h-48 overflow-y-auto z-99999';
        mobileDropdown.style.display = 'none';
        document.body.appendChild(mobileDropdown);
        
        return mobileDropdown;
      }

      // Show mobile suggestions
      function showMobileSuggestions(customers) {
        if (!mobileDropdown) {
          mobileDropdown = createMobileDropdown();
        }
        
        if (customers.length === 0) {
          mobileDropdown.style.display = 'none';
          return;
        }

        const rect = billMobileElement.getBoundingClientRect();
        mobileDropdown.style.left = rect.left + 'px';
        mobileDropdown.style.top = (rect.bottom + 5) + 'px';
        mobileDropdown.style.width = rect.width + 'px';
        mobileDropdown.style.display = 'block';

        mobileDropdown.innerHTML = customers.map(customer => `
          <div class="mobile-suggestion-item px-3 py-2 hover:bg-neutral-800 cursor-pointer border-b border-neutral-700 last:border-b-0" 
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
        mobileDropdown.querySelectorAll('.mobile-suggestion-item').forEach(item => {
          item.addEventListener('click', function() {
            const customer = JSON.parse(this.dataset.customer);
            populateCustomerFields(customer);
            billMobileElement.value = customer.phone;
            hideMobileDropdown();
          });
        });
      }

      // Hide mobile dropdown
      function hideMobileDropdown() {
        if (mobileDropdown) {
          mobileDropdown.style.display = 'none';
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
      function debouncedMobileSearch(query) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          if (query.length >= 5) {
            const customers = await searchCustomersByMobile(query);
            showMobileSuggestions(customers);
          } else {
            hideMobileDropdown();
          }
        }, 300);
      }

      // Input event for real-time autocomplete
      billMobileElement.addEventListener('input', function(e) {
        // Keep only digits and enforce max length 10
        const sanitized = (e.target.value || '').replace(/\D/g, '').slice(0, 10);
        if (e.target.value !== sanitized) {
          e.target.value = sanitized;
        }
        const phone = sanitized;
        if (phone.length >= 5) {
          debouncedMobileSearch(phone);
        } else {
          hideMobileDropdown();
        }
      });

      // Focus event to show suggestions if there's a value
      billMobileElement.addEventListener('focus', function(e) {
        const phone = e.target.value.trim();
        if (phone.length >= 5) {
          debouncedMobileSearch(phone);
        }
      });

      // Blur event: validate length and optionally fetch existing customer
      billMobileElement.addEventListener('blur', async function(e) {
        // Delay hiding dropdown to allow click events
        setTimeout(() => {
          hideMobileDropdown();
        }, 200);
        
        const phone = (e.target.value || '').trim();
        if (!phone) return;

        // Enforce min length 9 digits
        if (phone.length > 0 && phone.replace(/\D/g, '').length < 9) {
          if (typeof showModernAlert === 'function') {
            showModernAlert('Please enter at least 9 digits for mobile number', 'warning', 'Invalid Mobile');
          }
          // Refocus the field to correct input
          e.target.focus();
          return;
        }
        
        const customer = await fetchCustomerByMobile(phone);
        if (customer) {
          populateCustomerFields(customer);
        }
      });

      // Handle escape key
      billMobileElement.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          hideMobileDropdown();
        }
      });

      // Hide dropdown when clicking outside
      document.addEventListener('click', function(e) {
        if (mobileDropdown && !billMobileElement.contains(e.target) && !mobileDropdown.contains(e.target)) {
          hideMobileDropdown();
        }
      });
    }
  }

  // Setup customer type change handler
  function setupCustomerTypeHandler() {
    const billCustomerTypeElement = document.getElementById('billCustomerType');
    if (billCustomerTypeElement) {
      billCustomerTypeElement.addEventListener('change', function() {
        const customerType = this.value;
        const businessFields = document.querySelectorAll('.business-billing-field');
        const trnField = document.querySelector('.trn-billing-field');
        const billBusinessNameElement = document.getElementById('billBusinessName');
        const billBusinessAddressElement = document.getElementById('billBusinessAddress');
        
        if (customerType === 'Business') {
          businessFields.forEach(field => field.style.display = 'flex');
          if (trnField) trnField.style.display = 'flex';
          if (billBusinessNameElement) billBusinessNameElement.required = true;
          if (billBusinessAddressElement) billBusinessAddressElement.required = true;
        } else {
          businessFields.forEach(field => field.style.display = 'none');
          if (trnField) trnField.style.display = 'none';
          if (billBusinessNameElement) billBusinessNameElement.required = false;
          if (billBusinessAddressElement) billBusinessAddressElement.required = false;
        }
      });
    }
  }

  // Recent Customers functionality
  async function loadRecentCustomers() {
    try {
      const response = await fetch('/api/customers/recent');
      const recentCustomers = await response.json();
      
      const container = document.getElementById('recentCustomersContainer');
      if (!container) return;
      
      if (recentCustomers && recentCustomers.length > 0) {
                     container.innerHTML = recentCustomers.map(customer => `
               <button 
                 class="customer-pill"
                 data-customer-id="${customer.customer_id}"
                 data-customer-name="${customer.name}"
                 data-customer-phone="${customer.phone || ''}"
                 data-customer-city="${customer.city || ''}"
                 data-customer-area="${customer.area || ''}"
                 data-customer-trn="${customer.trn || ''}"
                 data-customer-type="${customer.customer_type || 'Individual'}"
                 data-business-name="${customer.business_name || ''}"
                 data-business-address="${customer.business_address || ''}"
               >
                 <svg data-lucide="user" class="w-1 h-1"></svg>
                 <span>${customer.name}</span>
                 ${customer.phone ? `<span class="text-neutral-300">(${customer.phone})</span>` : ''}
               </button>
             `).join('');
        
        // Add event listeners to recent customer buttons
        container.querySelectorAll('.customer-pill').forEach(btn => {
          btn.addEventListener('click', function() {
            const customerData = {
              customer_id: this.getAttribute('data-customer-id'),
              name: this.getAttribute('data-customer-name'),
              phone: this.getAttribute('data-customer-phone'),
              city: this.getAttribute('data-customer-city'),
              area: this.getAttribute('data-customer-area'),
              trn: this.getAttribute('data-customer-trn'),
              customer_type: this.getAttribute('data-customer-type'),
              business_name: this.getAttribute('data-business-name'),
              business_address: this.getAttribute('data-business-address')
            };
            
            populateCustomerFields(customerData);
          });
        });
        
        // Refresh Lucide icons
        lucide.createIcons();
      } else {
        container.innerHTML = '<p class="text-neutral-500 text-sm">No recent customers found</p>';
      }
    } catch (error) {
      console.error('Error loading recent customers:', error);
      const container = document.getElementById('recentCustomersContainer');
      if (container) {
        container.innerHTML = '<p class="text-neutral-500 text-sm">Failed to load recent customers</p>';
      }
    }
  }

  // FEATURE 1: Customer Quick Search with Type-ahead
  function setupCustomerQuickSearch() {
    const customerInput = document.getElementById('billCustomer');
    if (!customerInput) return;

    let searchTimeout;
    let dropdown;

    // Create dropdown container
    function createCustomerDropdown() {
      dropdown = document.createElement('div');
      dropdown.className = 'customer-suggestion';
      dropdown.style.cssText = 'position: fixed; z-index: 99999 !important; background: #1f2937; border: 1px solid #374151; border-radius: 8px; max-height: 240px; overflow-y: auto; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);';
      dropdown.style.display = 'none';
      document.body.appendChild(dropdown);
      
      // Prevent dropdown from hiding when clicking inside it
      dropdown.addEventListener('click', function(e) {
        e.stopPropagation();
      });
    }

    // Show customer suggestions
    function showCustomerSuggestions(customers) {
      if (!dropdown) createCustomerDropdown();
      
      // Calculate position relative to input
      const inputRect = customerInput.getBoundingClientRect();
      dropdown.style.left = inputRect.left + 'px';
      dropdown.style.top = (inputRect.bottom + 4) + 'px';
      dropdown.style.width = inputRect.width + 'px';
      dropdown.style.minWidth = '200px'; // Ensure minimum width
      
      dropdown.innerHTML = customers.map(customer => `
        <div class="customer-option px-4 py-2 hover:bg-neutral-700 cursor-pointer border-b border-neutral-600 last:border-b-0" 
             data-customer-id="${customer.customer_id}"
             data-customer-name="${customer.name}"
             data-customer-phone="${customer.phone || ''}"
             data-customer-email="${customer.email || ''}"
             data-customer-address="${customer.address || ''}"
             data-customer-city="${customer.city || ''}"
             data-customer-area="${customer.area || ''}"
             data-customer-trn="${customer.trn || ''}"
             data-customer-type="${customer.customer_type || 'Individual'}"
             data-business-name="${customer.business_name || ''}"
             data-business-address="${customer.business_address || ''}">
          <div class="flex items-center justify-between">
            <span class="text-neutral-200">${customer.name}</span>
            <span class="text-xs text-neutral-400">${customer.phone || ''}</span>
          </div>
        </div>
      `).join('');
      
      // Add click listeners directly to each option
      const options = dropdown.querySelectorAll('.customer-option');
      options.forEach(option => {
        option.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          console.log('Customer option clicked:', this);
          
          const customerData = {
            customer_id: this.getAttribute('data-customer-id'),
            name: this.getAttribute('data-customer-name'),
            phone: this.getAttribute('data-customer-phone'),
            email: this.getAttribute('data-customer-email'),
            address: this.getAttribute('data-customer-address'),
            city: this.getAttribute('data-customer-city'),
            area: this.getAttribute('data-customer-area'),
            trn: this.getAttribute('data-customer-trn'),
            customer_type: this.getAttribute('data-customer-type'),
            business_name: this.getAttribute('data-business-name'),
            business_address: this.getAttribute('data-business-address')
          };
          
          console.log('Selected customer data:', customerData);
          populateCustomerFields(customerData);
          hideCustomerDropdown();
          customerInput.value = customerData.name;
        });
      });
      
      dropdown.style.display = 'block';
    }

    // Hide customer dropdown
    function hideCustomerDropdown() {
      if (dropdown) {
        dropdown.style.transition = 'all 0.2s ease';
        dropdown.style.opacity = '0';
        dropdown.style.transform = 'translateY(-10px)';
        
        setTimeout(() => {
          dropdown.style.display = 'none';
          // Remove from DOM to prevent memory leaks
          if (dropdown.parentNode) {
            dropdown.parentNode.removeChild(dropdown);
          }
          dropdown = null;
        }, 200);
      }
    }

    // Search customers
    async function searchCustomers(query) {
      if (!query.trim()) {
        hideCustomerDropdown();
        return;
      }

      try {
        console.log('Searching customers for:', query);
        const response = await fetch(`/api/customers?search=${encodeURIComponent(query)}`);
        
        if (!response.ok) {
          console.error('Customer search failed:', response.status, response.statusText);
          hideCustomerDropdown();
          return;
        }
        
        const customers = await response.json();
        console.log('Found customers:', customers);
        
        if (customers && customers.length > 0) {
          showCustomerSuggestions(customers);
        } else {
          hideCustomerDropdown();
        }
      } catch (error) {
        console.error('Error searching customers:', error);
        hideCustomerDropdown();
      }
    }

    // Debounced search
    function debouncedSearch(query) {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => searchCustomers(query), 300);
    }

    // Event listeners
    customerInput.addEventListener('input', function() {
      debouncedSearch(this.value);
    });

    customerInput.addEventListener('focus', function() {
      if (this.value.trim()) {
        debouncedSearch(this.value);
      }
    });

    // Hide dropdown when clicking outside - but NOT when clicking on options
    document.addEventListener('click', function(e) {
      // Don't hide if clicking on a customer option
      if (e.target.closest('.customer-option')) {
        return;
      }
      
      // Don't hide if clicking on the input itself
      if (customerInput.contains(e.target)) {
        return;
      }
      
      // Hide only if clicking outside both input and dropdown
      if (!customerInput.contains(e.target) && (!dropdown || !dropdown.contains(e.target))) {
        hideCustomerDropdown();
      }
    });
  }

  // FEATURE 2: Product Quick Add with Search
  function setupProductQuickAdd() {
    // Setup desktop product quick add
    const billProductInput = document.getElementById('billProduct');
    const billRateInput = document.getElementById('billRate');
    
    if (billProductInput) {
      setupProductQuickAddForInput(billProductInput, billRateInput, 'desktop');
    }

    // Setup mobile product quick add
    const billProductInputMobile = document.getElementById('billProductMobile');
    const billRateInputMobile = document.getElementById('billRateMobile');
    
    if (billProductInputMobile) {
      setupProductQuickAddForInput(billProductInputMobile, billRateInputMobile, 'mobile');
    }
  }

  function setupProductQuickAddForInput(productInput, rateInput, formType) {
    if (!productInput) {
      return;
    }

    let allProducts = [];
    let productDropdown;

    // Create product dropdown with mobile-optimized styling
    function createProductDropdown() {
      productDropdown = document.createElement('div');
      productDropdown.className = 'product-suggestion-mobile';
      productDropdown.style.cssText = 'position: fixed; z-index: 99999 !important; background: #1f2937; border: 1px solid #374151; border-radius: 8px; max-height: 240px; overflow-y: auto; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);';
      productDropdown.style.display = 'none';
      document.body.appendChild(productDropdown);
      
      // Prevent dropdown from hiding when clicking inside it
      productDropdown.addEventListener('click', function(e) {
        e.stopPropagation();
      });

      // Add touch event handling for mobile
      productDropdown.addEventListener('touchstart', function(e) {
        e.stopPropagation();
      });
    }

    // Load all products
    async function loadAllProducts() {
      try {
        const response = await fetch('/api/products');
        allProducts = await response.json();
        window.allProducts = allProducts; // Store globally for validation
        console.log('Loaded products:', allProducts.length);
      } catch (error) {
        console.error('Error loading products:', error);
        // Show user-friendly error message
        showModernAlert('Failed to load products. Please check your connection.', 'error', 'Loading Error');
      }
    }

    // Filter products with improved search
    function filterProducts(query) {
      if (!query.trim()) return [];
      
      const searchTerm = query.toLowerCase();
      return allProducts.filter(product => {
        const productName = product.product_name.toLowerCase();
        const typeName = (product.type_name || '').toLowerCase();
        
        return productName.includes(searchTerm) || 
               typeName.includes(searchTerm) ||
               productName.split(' ').some(word => word.startsWith(searchTerm));
      }).slice(0, 10); // Limit to 10 results for better performance
    }

    // Render dropdown options with mobile-optimized styling
    function renderDropdownOptions(filteredProducts) {
      if (!productDropdown) createProductDropdown();
      
      if (filteredProducts.length === 0) {
        productDropdown.innerHTML = `
          <div class="product-option-mobile" style="color: #9ca3af; text-align: center; padding: 16px;">
            <div style="color: #f3f4f6;">No products found</div>
            <div style="font-size: 12px; margin-top: 4px; color: #6b7280;">Try a different search term</div>
          </div>
        `;
        return;
      }
      
      productDropdown.innerHTML = filteredProducts.map(product => `
        <div class="product-option-mobile" data-product-id="${product.product_id}" data-product-name="${product.product_name}" data-product-price="${product.rate}" data-product-type="${product.type_name || ''}" style="padding: 12px 16px; border-bottom: 1px solid #374151; cursor: pointer; transition: background-color 0.2s; display: flex; justify-content: space-between; align-items: center; color: #f3f4f6;">
          <div style="flex: 1;">
            <div class="product-name" style="font-weight: 500; color: #f9fafb;">${product.product_name}</div>
            <div class="product-details" style="font-size: 12px; color: #9ca3af; margin-top: 2px;">${product.type_name || ''}</div>
          </div>
          <div class="product-price" style="font-weight: 600; color: #10b981;">AED ${product.rate}</div>
        </div>
      `).join('');
      
      // Add click listeners with improved touch handling
      const options = productDropdown.querySelectorAll('.product-option-mobile');
      options.forEach(option => {
        // Add hover effects
        option.addEventListener('mouseenter', function() {
          this.style.backgroundColor = '#374151';
        });
        
        option.addEventListener('mouseleave', function() {
          this.style.backgroundColor = 'transparent';
        });
        
        const handleSelection = function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          const productData = {
            product_id: this.getAttribute('data-product-id'),
            name: this.getAttribute('data-product-name'),
            price: this.getAttribute('data-product-price'),
            product_type: this.getAttribute('data-product-type')
          };
          
          // Set the input value
          productInput.value = productData.name;
          
          // Auto-fill the rate field
          if (rateInput) {
            rateInput.value = productData.price;
            // Trigger change event to update any dependent fields
            rateInput.dispatchEvent(new Event('change', { bubbles: true }));
          }
          
          // Set data attribute for validation
          productInput.setAttribute('data-selected-product', JSON.stringify(productData));
          
          // Add visual feedback
          productInput.style.borderColor = '#10b981';
          setTimeout(() => {
            productInput.style.borderColor = '';
          }, 1000);
          
          hideDropdown();
          
          // Show success feedback
          showSimpleToast(`${productData.name} selected`, 'success');
        };
        
        // Handle both click and touch events
        option.addEventListener('click', handleSelection);
        option.addEventListener('touchend', handleSelection);
      });
    }

    // Show dropdown with animation
    function showDropdown() {
      if (!productDropdown) createProductDropdown();
      
      // Calculate position relative to input
      const inputRect = productInput.getBoundingClientRect();
      productDropdown.style.left = inputRect.left + 'px';
      productDropdown.style.top = (inputRect.bottom + 4) + 'px';
      productDropdown.style.width = inputRect.width + 'px';
      productDropdown.style.minWidth = '200px';
      
      productDropdown.style.display = 'block';
      productDropdown.style.opacity = '0';
      productDropdown.style.transform = 'translateY(-10px)';
      
      // Animate in
      setTimeout(() => {
        productDropdown.style.transition = 'all 0.2s ease';
        productDropdown.style.opacity = '1';
        productDropdown.style.transform = 'translateY(0)';
      }, 10);
    }

    // Hide dropdown with animation
    function hideDropdown() {
      if (productDropdown) {
        productDropdown.style.transition = 'all 0.2s ease';
        productDropdown.style.opacity = '0';
        productDropdown.style.transform = 'translateY(-10px)';
        
        setTimeout(() => {
          productDropdown.style.display = 'none';
          // Remove from DOM to prevent memory leaks
          if (productDropdown.parentNode) {
            productDropdown.parentNode.removeChild(productDropdown);
          }
          productDropdown = null;
        }, 200);
      }
    }

    // Enhanced input event handling
    productInput.addEventListener('input', function() {
      const query = this.value;
      const filteredProducts = filterProducts(query);
      
      if (filteredProducts.length > 0) {
        renderDropdownOptions(filteredProducts);
        showDropdown();
      } else {
        hideDropdown();
      }
    });

    // Enhanced focus event handling
    productInput.addEventListener('focus', function() {
      if (this.value.trim()) {
        const filteredProducts = filterProducts(this.value);
        if (filteredProducts.length > 0) {
          renderDropdownOptions(filteredProducts);
          showDropdown();
        }
      }
    });

    // Enhanced blur event handling
    productInput.addEventListener('blur', function() {
      // Delay hiding to allow for option selection
      setTimeout(() => {
        hideDropdown();
      }, 200);
    });

    // Improved click outside handling
    document.addEventListener('click', function(e) {
      // Don't hide if clicking on a product option
      if (e.target.closest('.product-option-mobile')) {
        return;
      }
      
      // Don't hide if clicking on the input itself
      if (productInput.contains(e.target)) {
        return;
      }
      
      // Hide only if clicking outside both input and dropdown
      if (!productInput.contains(e.target) && (!productDropdown || !productDropdown.contains(e.target))) {
        hideDropdown();
      }
    });

    // Add keyboard navigation
    productInput.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const options = productDropdown?.querySelectorAll('.product-option-mobile');
        if (!options || options.length === 0) return;
        
        const currentIndex = Array.from(options).findIndex(option => 
          option.classList.contains('selected')
        );
        
        let newIndex;
        if (e.key === 'ArrowDown') {
          newIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
        } else {
          newIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
        }
        
        // Remove previous selection
        options.forEach(option => option.classList.remove('selected'));
        
        // Add new selection
        options[newIndex].classList.add('selected');
        options[newIndex].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selectedOption = productDropdown?.querySelector('.product-option-mobile.selected');
        if (selectedOption) {
          selectedOption.click();
        }
      } else if (e.key === 'Escape') {
        hideDropdown();
      }
    });

    // Load products on initialization
    loadAllProducts();
  }

  // FEATURE 3: Smart Defaults
  function setupSmartDefaults() {
    const billDateInput = document.getElementById('billDate');
    const deliveryDateInput = document.getElementById('deliveryDate');
    
    if (!billDateInput || !deliveryDateInput) return;

    // Set default bill date to today
    const today = new Date().toISOString().split('T')[0];
    billDateInput.value = today;

    // Set default delivery date to bill date + 3 days
    function updateDeliveryDate() {
      if (billDateInput.value) {
        const billDate = new Date(billDateInput.value);
        const deliveryDate = new Date(billDate);
        deliveryDate.setDate(deliveryDate.getDate() + 3);
        deliveryDateInput.value = deliveryDate.toISOString().split('T')[0];
      }
    }

    // Update delivery date when bill date changes
    billDateInput.addEventListener('change', updateDeliveryDate);
    
    // Set initial delivery date
    updateDeliveryDate();

    // Set default trial date to bill date + 1 day
    const trialDateInput = document.getElementById('trialDate');
    if (trialDateInput) {
      function updateTrialDate() {
        if (billDateInput.value) {
          const billDate = new Date(billDateInput.value);
          const trialDate = new Date(billDate);
          trialDate.setDate(trialDate.getDate() + 1);
          trialDateInput.value = trialDate.toISOString().split('T')[0];
        }
      }
      
      trialDateInput.addEventListener('change', updateTrialDate);
      updateTrialDate();
    }
  }

  // FEATURE 4: City and Area Autocomplete
  function setupCityAreaAutocomplete() {
    console.log('≡ƒîì Setting up city and area autocomplete...');
    
    const cityInput = document.getElementById('billCity');
    const areaInput = document.getElementById('billArea');
    const cityDropdown = document.getElementById('billCityDropdown');
    const areaDropdown = document.getElementById('billAreaDropdown');
    
    if (!cityInput || !areaInput || !cityDropdown || !areaDropdown) {
      console.warn('City/Area autocomplete elements not found');
      return;
    }
    
    let cityDebounceTimer = null;
    let areaDebounceTimer = null;
    
    // City autocomplete
    cityInput.addEventListener('input', function() {
      clearTimeout(cityDebounceTimer);
      const query = this.value.trim();
      
      if (query.length < 2) {
        cityDropdown.classList.add('hidden');
        return;
      }
      
      cityDebounceTimer = setTimeout(async () => {
        try {
          const response = await fetch('/api/cities');
          const cities = await response.json();
          const filteredCities = cities.filter(city => 
            city.toLowerCase().includes(query.toLowerCase())
          );
          
          if (filteredCities.length > 0) {
            cityDropdown.innerHTML = filteredCities.map(city => `
              <div class="city-option px-3 py-2 hover:bg-neutral-700 cursor-pointer text-sm border-b border-neutral-700 last:border-b-0" data-city="${city}">
                ${city}
              </div>
            `).join('');
            cityDropdown.classList.remove('hidden');
          } else {
            cityDropdown.classList.add('hidden');
          }
        } catch (error) {
          console.error('Error loading cities:', error);
        }
      }, 300);
    });
    
    // Area autocomplete
    areaInput.addEventListener('input', function() {
      clearTimeout(areaDebounceTimer);
      const query = this.value.trim();
      
      if (query.length < 2) {
        areaDropdown.classList.add('hidden');
        return;
      }
      
      areaDebounceTimer = setTimeout(async () => {
        try {
          const cityValue = cityInput.value.trim();
          const url = cityValue ? `/api/areas?city=${encodeURIComponent(cityValue)}` : '/api/areas';
          const response = await fetch(url);
          const areas = await response.json();
          const filteredAreas = areas.filter(area => 
            area.toLowerCase().includes(query.toLowerCase())
          );
          
          if (filteredAreas.length > 0) {
            areaDropdown.innerHTML = filteredAreas.map(area => `
              <div class="area-option px-3 py-2 hover:bg-neutral-700 cursor-pointer text-sm border-b border-neutral-700 last:border-b-0" data-area="${area}">
                ${area}
              </div>
            `).join('');
            areaDropdown.classList.remove('hidden');
          } else {
            areaDropdown.classList.add('hidden');
          }
        } catch (error) {
          console.error('Error loading areas:', error);
        }
      }, 300);
    });
    
    // Handle city selection
    cityDropdown.addEventListener('click', function(e) {
      if (e.target.classList.contains('city-option')) {
        const selectedCity = e.target.getAttribute('data-city');
        cityInput.value = selectedCity;
        cityDropdown.classList.add('hidden');
        
        // Clear area when city changes
        areaInput.value = '';
        
        // Update area dropdown to show areas for selected city
        updateAreaDropdownForCity(selectedCity);
      }
    });
    
    // Handle area selection
    areaDropdown.addEventListener('click', function(e) {
      if (e.target.classList.contains('area-option')) {
        const selectedArea = e.target.getAttribute('data-area');
        areaInput.value = selectedArea;
        areaDropdown.classList.add('hidden');
        
        // If no city is selected, try to find the city for this area
        if (!cityInput.value.trim()) {
          findCityForArea(selectedArea);
        }
      }
    });
    
    // Hide dropdowns when clicking outside
    document.addEventListener('click', function(e) {
      if (!cityInput.contains(e.target) && !cityDropdown.contains(e.target)) {
        cityDropdown.classList.add('hidden');
      }
      if (!areaInput.contains(e.target) && !areaDropdown.contains(e.target)) {
        areaDropdown.classList.add('hidden');
      }
    });
    
    // Update area dropdown for specific city
    async function updateAreaDropdownForCity(city) {
      try {
        const response = await fetch(`/api/areas?city=${encodeURIComponent(city)}`);
        const areas = await response.json();
        
        if (areas.length > 0) {
          areaDropdown.innerHTML = areas.map(area => `
            <div class="area-option px-3 py-2 hover:bg-neutral-700 cursor-pointer text-sm border-b border-neutral-700 last:border-b-0" data-area="${area}">
              ${area}
            </div>
          `).join('');
        } else {
          areaDropdown.innerHTML = '<div class="px-3 py-2 text-neutral-400 text-sm">No areas found for this city</div>';
        }
      } catch (error) {
        console.error('Error updating areas for city:', error);
      }
    }
    
    // Find city for selected area
    async function findCityForArea(area) {
      try {
        const response = await fetch(`/api/cities?area=${encodeURIComponent(area)}`);
        const cities = await response.json();
        
        if (cities.length > 0) {
          cityInput.value = cities[0]; // Use the first city found
        }
      } catch (error) {
        console.error('Error finding city for area:', error);
      }
    }
  }

  // FEATURE 3: Master Autocomplete
  function setupMasterAutocomplete() {
    console.log('≡ƒöì Setting up master autocomplete...');
    const masterInput = document.getElementById('masterName');
    const masterInputMobile = document.getElementById('masterNameMobile');
    
    console.log('≡ƒÆ╗ Desktop master input found:', !!masterInput);
    console.log('≡ƒô▒ Mobile master input found:', !!masterInputMobile);
    
    if (!masterInput && !masterInputMobile) {
      console.log('Γ¥î No master inputs found');
      return;
    }

    let employees = [];
    let masterDropdown;

    // Create dropdown container
    function createMasterDropdown() {
      console.log('≡ƒöì Creating master dropdown');
      masterDropdown = document.createElement('div');
      masterDropdown.className = 'master-suggestion';
      masterDropdown.style.cssText = 'position: fixed; z-index: 99999 !important; background: #1f2937; border: 1px solid #374151; border-radius: 8px; max-height: 240px; overflow-y: auto; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);';
      masterDropdown.style.display = 'none';
      document.body.appendChild(masterDropdown);
      
      // Prevent dropdown from hiding when clicking inside it
      masterDropdown.addEventListener('click', function(e) {
        e.stopPropagation();
      });
    }

    // Load employees
    async function loadEmployees() {
      try {
        console.log('≡ƒöì Loading employees...');
        const response = await fetch('/api/employees');
        employees = await response.json();
        console.log('Γ£à Employees loaded:', employees.length);
        console.log('≡ƒôï Sample employees:', employees.slice(0, 3));
        
        // Make employees available globally for debugging
        window.allEmployees = employees;
        console.log('≡ƒîÉ Global allEmployees set:', window.allEmployees.length);
        
        // Set default owner if available
        setDefaultOwner();
      } catch (error) {
        console.error('Γ¥î Error loading employees:', error);
      }
    }
    
    // Set default owner
    function setDefaultOwner() {
      const owner = employees.find(emp => emp.position === 'Owner');
      if (owner) {
        console.log('≡ƒææ Setting default owner:', owner.name);
        
        // Set the owner as default in both desktop and mobile inputs
        if (masterInput) {
          masterInput.value = owner.name;
          masterInput.setAttribute('data-selected-master', JSON.stringify({
            master_id: owner.employee_id,
            master_name: owner.name
          }));
        }
        
        if (masterInputMobile) {
          masterInputMobile.value = owner.name;
          masterInputMobile.setAttribute('data-selected-master', JSON.stringify({
            master_id: owner.employee_id,
            master_name: owner.name
          }));
        }
        
        // Set global selected master ID
        window.selectedMasterId = owner.employee_id;
        console.log('≡ƒÄ» Default owner set - ID:', owner.employee_id, 'Name:', owner.name);
      } else {
        // If no owner found, set the first available employee as default
        if (employees.length > 0) {
          const firstEmployee = employees[0];
          console.log('ΓÜá∩╕Å No owner found, setting first employee as default:', firstEmployee.name);
          
          // Set the first employee as default in both desktop and mobile inputs
          if (masterInput) {
            masterInput.value = firstEmployee.name;
            masterInput.setAttribute('data-selected-master', JSON.stringify({
              master_id: firstEmployee.employee_id,
              master_name: firstEmployee.name
            }));
          }
          
          if (masterInputMobile) {
            masterInputMobile.value = firstEmployee.name;
            masterInputMobile.setAttribute('data-selected-master', JSON.stringify({
              master_id: firstEmployee.employee_id,
              master_name: firstEmployee.name
            }));
          }
          
          // Set global selected master ID
          window.selectedMasterId = firstEmployee.employee_id;
          console.log('≡ƒÄ» Default employee set - ID:', firstEmployee.employee_id, 'Name:', firstEmployee.name);
        } else {
          console.log('ΓÜá∩╕Å No employees found in list');
        }
      }
    }

    // Filter employees
    function filterEmployees(query) {
      if (!query.trim()) return [];
      
      return employees.filter(employee =>
        employee.name.toLowerCase().includes(query.toLowerCase()) ||
        employee.phone?.toLowerCase().includes(query.toLowerCase())
      );
    }

    // Render dropdown options
    function renderDropdownOptions(filteredEmployees) {
      if (!masterDropdown) createMasterDropdown();
      
      masterDropdown.innerHTML = filteredEmployees.map(employee => `
        <div class="master-option" data-master-id="${employee.employee_id}" data-master-name="${employee.name}" data-master-phone="${employee.phone || ''}" style="padding: 12px 16px; cursor: pointer; border-bottom: 1px solid rgba(255, 255, 255, 0.05); color: #f8fafc;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #e5e7eb;">${employee.name}</span>
            <span style="font-size: 12px; color: #9ca3af;">${employee.phone || ''}</span>
          </div>
        </div>
      `).join('');
      
      // Add click listeners directly to each option
      const options = masterDropdown.querySelectorAll('.master-option');
      options.forEach(option => {
        option.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          const masterId = this.getAttribute('data-master-id');
          const masterName = this.getAttribute('data-master-name');
          
          window.selectedMasterId = masterId;
          console.log('≡ƒÄ» Master selected - ID:', masterId, 'Name:', masterName);
          console.log('≡ƒîÉ Global selectedMasterId set to:', window.selectedMasterId);
          
          // Update both inputs if they exist
          if (masterInput) {
            masterInput.value = masterName;
            masterInput.setAttribute('data-selected-master', JSON.stringify({
              master_id: masterId,
              master_name: masterName
            }));
          }
          
          if (masterInputMobile) {
            masterInputMobile.value = masterName;
            masterInputMobile.setAttribute('data-selected-master', JSON.stringify({
              master_id: masterId,
              master_name: masterName
            }));
          }
          
          hideDropdown();
        });
      });
    }

    // Show dropdown
    function showDropdown(activeInput) {
      console.log('≡ƒöì showDropdown called for:', activeInput.id);
      
      if (!masterDropdown) createMasterDropdown();
      
      // Calculate position relative to input
      const inputRect = activeInput.getBoundingClientRect();
      console.log('≡ƒôÉ Input rect:', inputRect);
      
      masterDropdown.style.left = inputRect.left + 'px';
      masterDropdown.style.top = (inputRect.bottom + 4) + 'px';
      masterDropdown.style.width = inputRect.width + 'px';
      masterDropdown.style.minWidth = '200px'; // Ensure minimum width
      
      console.log('≡ƒôì Dropdown position set to:', {
        left: inputRect.left + 'px',
        top: (inputRect.bottom + 4) + 'px',
        width: inputRect.width + 'px'
      });
      
      masterDropdown.style.display = 'block';
      masterDropdown.style.opacity = '0';
      masterDropdown.style.transform = 'translateY(-10px)';
      
      // Animate in
      setTimeout(() => {
        masterDropdown.style.transition = 'all 0.2s ease';
        masterDropdown.style.opacity = '1';
        masterDropdown.style.transform = 'translateY(0)';
        console.log('Γ£à Dropdown animation started');
      }, 10);
    }

    // Hide dropdown
    function hideDropdown() {
      if (masterDropdown) {
        masterDropdown.style.transition = 'all 0.2s ease';
        masterDropdown.style.opacity = '0';
        masterDropdown.style.transform = 'translateY(-10px)';
        
        setTimeout(() => {
          masterDropdown.style.display = 'none';
          // Remove from DOM to prevent memory leaks
          if (masterDropdown.parentNode) {
            masterDropdown.parentNode.removeChild(masterDropdown);
          }
          masterDropdown = null;
        }, 200);
      }
    }

    // Event listeners for desktop
    if (masterInput) {
      console.log('≡ƒöì Setting up desktop master input event listeners');
      masterInput.addEventListener('input', function() {
        console.log('≡ƒÆ╗ Desktop master input event triggered, value:', this.value);
        const query = this.value;
        const filteredEmployees = filterEmployees(query);
        console.log('≡ƒöì Filtered employees:', filteredEmployees.length);
        
        if (filteredEmployees.length > 0) {
          renderDropdownOptions(filteredEmployees);
          showDropdown(this);
        } else {
          hideDropdown();
        }
      });

      masterInput.addEventListener('focus', function() {
        if (this.value.trim()) {
          const filteredEmployees = filterEmployees(this.value);
          if (filteredEmployees.length > 0) {
            renderDropdownOptions(filteredEmployees);
            showDropdown(this);
          }
        }
      });
    }

    // Event listeners for mobile
    if (masterInputMobile) {
      console.log('≡ƒöì Setting up mobile master input event listeners');
      
      masterInputMobile.addEventListener('input', function() {
        console.log('≡ƒô▒ Mobile master input event triggered, value:', this.value);
        const query = this.value;
        const filteredEmployees = filterEmployees(query);
        console.log('≡ƒöì Filtered employees:', filteredEmployees.length);
        
        if (filteredEmployees.length > 0) {
          renderDropdownOptions(filteredEmployees);
          showDropdown(this);
        } else {
          hideDropdown();
        }
      });

      masterInputMobile.addEventListener('focus', function() {
        console.log('≡ƒô▒ Mobile master input focused, value:', this.value);
        if (this.value.trim()) {
          const filteredEmployees = filterEmployees(this.value);
          console.log('≡ƒöì Focus filtered employees:', filteredEmployees.length);
          if (filteredEmployees.length > 0) {
            renderDropdownOptions(filteredEmployees);
            showDropdown(this);
          }
        }
      });
      
      console.log('Γ£à Mobile master input event listeners attached');
    } else {
      console.log('Γ¥î Mobile master input not found');
    }
    
    console.log('Γ£à Master input event listeners attached');

    // Hide dropdown when clicking outside - but NOT when clicking on options
    document.addEventListener('click', function(e) {
      // Don't hide if clicking on a master option
      if (e.target.closest('.master-option')) {
        return;
      }
      
      // Don't hide if clicking on either input
      if ((masterInput && masterInput.contains(e.target)) || 
          (masterInputMobile && masterInputMobile.contains(e.target))) {
        return;
      }
      
      // Hide only if clicking outside both inputs and dropdown
      if ((!masterInput || !masterInput.contains(e.target)) && 
          (!masterInputMobile || !masterInputMobile.contains(e.target)) && 
          (!masterDropdown || !masterDropdown.contains(e.target))) {
        hideDropdown();
      }
    });

    // Load employees on initialization
    console.log('≡ƒöì Loading employees on initialization...');
    loadEmployees();
  }

  // Make selected master ID available globally
  window.getSelectedMasterId = function() {
    return window.selectedMasterId;
  };

  // Test function for master dropdown
  window.testMasterDropdown = function() {
    console.log('≡ƒº¬ Testing master dropdown...');
    console.log('≡ƒô▒ Mobile master input:', masterInputMobile);
    console.log('≡ƒÆ╗ Desktop master input:', masterInput);
    console.log('≡ƒæÑ Employees loaded:', employees.length);
    
    if (masterInputMobile) {
      console.log('≡ƒô▒ Triggering mobile master input focus...');
      masterInputMobile.focus();
      masterInputMobile.value = 'test';
      masterInputMobile.dispatchEvent(new Event('input'));
    }
  };

  // Test function to check master selection status
  window.testMasterSelection = function() {
    console.log('≡ƒº¬ Testing master selection status...');
    
    const masterNameElement = document.getElementById('masterName');
    const masterNameMobileElement = document.getElementById('masterNameMobile');
    
    console.log('≡ƒÆ╗ Desktop master element:', masterNameElement);
    console.log('≡ƒô▒ Mobile master element:', masterNameMobileElement);
    
    if (masterNameElement) {
      console.log('≡ƒÆ╗ Desktop master value:', masterNameElement.value);
      console.log('≡ƒÆ╗ Desktop master data-selected-master:', masterNameElement.getAttribute('data-selected-master'));
    }
    
    if (masterNameMobileElement) {
      console.log('≡ƒô▒ Mobile master value:', masterNameMobileElement.value);
      console.log('≡ƒô▒ Mobile master data-selected-master:', masterNameMobileElement.getAttribute('data-selected-master'));
    }
    
    // Also check global selectedMasterId
    console.log('≡ƒîÉ Global selectedMasterId:', window.selectedMasterId);
  };

    // Setup Add Item button functionality
  function setupAddItemHandler() {
    // Setup desktop add item handler
    const addItemBtn = document.getElementById('addItemBtn');
    if (addItemBtn) {
      // Remove existing event listeners by cloning the element
      const newAddItemBtn = addItemBtn.cloneNode(true);
      addItemBtn.parentNode.replaceChild(newAddItemBtn, addItemBtn);
      
      newAddItemBtn.classList.add('add-item-btn-mobile');
      newAddItemBtn.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('Desktop add item button clicked');
        handleAddItem('desktop');
      });
    }

    // Setup mobile add item handler
    const addItemBtnMobile = document.getElementById('addItemBtnMobile');
    if (addItemBtnMobile) {
      // Remove existing event listeners by cloning the element
      const newAddItemBtnMobile = addItemBtnMobile.cloneNode(true);
      addItemBtnMobile.parentNode.replaceChild(newAddItemBtnMobile, addItemBtnMobile);
      
      newAddItemBtnMobile.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('Mobile add item button clicked');
        handleAddItem('mobile');
      });
    }
  }

  async function handleAddItem(formType) {
    console.log('handleAddItem called with formType:', formType);
    
    // Get form elements based on form type
    let productInput, quantityInput, priceInput, discountInput, advanceInput, vatInput;
    
    if (formType === 'mobile') {
      productInput = document.getElementById('billProductMobile');
      quantityInput = document.getElementById('billQtyMobile');
      priceInput = document.getElementById('billRateMobile');
      discountInput = document.getElementById('billDiscountMobile');
      advanceInput = document.getElementById('billAdvPaidMobile');
      vatInput = document.getElementById('vatPercentMobile');
    } else {
      productInput = document.getElementById('billProduct');
      quantityInput = document.getElementById('billQty');
      priceInput = document.getElementById('billRate');
      discountInput = document.getElementById('billDiscount');
      advanceInput = document.getElementById('billAdvPaid');
      vatInput = document.getElementById('vatPercent');
    }
    
    // Clear previous error states
    [productInput, quantityInput, priceInput].forEach(input => {
      if (input) {
        input.classList.remove('billing-input-error');
        const errorMsg = input.parentNode.querySelector('.billing-error-message');
        if (errorMsg) errorMsg.remove();
      }
    });
    
    // Validate required fields with better error handling
    let hasErrors = false;
    
    if (!productInput || !productInput.value.trim()) {
      showFieldError(productInput, 'Please select a product');
      hasErrors = true;
    }
    
    // Get selected product data
    const selectedProductData = productInput?.getAttribute('data-selected-product');
    
    // Debug logging
    console.log('Product input value:', productInput?.value);
    console.log('Selected product data:', selectedProductData);
    
    if (!selectedProductData && productInput?.value.trim()) {
      // Check if we have a valid product name but no data attribute
      // This might happen if the product was selected but the attribute wasn't set properly
      const productName = productInput.value.trim();
      if (productName) {
        // Try to find the product in our loaded products
        const allProducts = window.allProducts || [];
        const foundProduct = allProducts.find(p => p.name === productName || p.product_name === productName);
        
        if (foundProduct) {
          // Set the data attribute now
          productInput.setAttribute('data-selected-product', JSON.stringify(foundProduct));
          console.log('Found and set product data:', foundProduct);
        } else {
          // Add a small delay to allow for any pending DOM updates
          setTimeout(() => {
            const retrySelectedData = productInput.getAttribute('data-selected-product');
            if (!retrySelectedData) {
              showFieldError(productInput, 'Please select a product from the search results');
              hasErrors = true;
            }
          }, 100);
          return;
        }
      } else {
        showFieldError(productInput, 'Please select a product from the search results');
        hasErrors = true;
      }
    }
    
    let productData;
    try {
      productData = JSON.parse(selectedProductData);
    } catch (error) {
      console.error('Error parsing product data:', error);
      showFieldError(productInput, 'Invalid product data. Please select a product again.');
      hasErrors = true;
    }
    
    if (!quantityInput || !quantityInput.value || quantityInput.value <= 0) {
      showFieldError(quantityInput, 'Please enter a valid quantity');
      hasErrors = true;
    }
    
    if (!priceInput || !priceInput.value || priceInput.value <= 0) {
      showFieldError(priceInput, 'Please enter a valid price');
      hasErrors = true;
    }
    
    if (hasErrors) {
      // Show overall error message
      showModernAlert('Please fix the errors above before adding the item', 'warning', 'Validation Error');
      return;
    }
    
    // Get values with better parsing
    const productId = productData.product_id;
    const productName = productData.name || productData.product_name;
    const quantity = parseFloat(quantityInput.value) || 0;
    const price = parseFloat(priceInput.value) || 0;
    const discount = parseFloat(discountInput?.value) || 0;
    const advance = parseFloat(advanceInput?.value) || 0;
    const vatPercent = parseFloat(vatInput?.value) || 5;
    
    // Check if this product already exists in the bill
    const existingItemIndex = bill.findIndex(item => item.product_id === productId);
    console.log('Checking for duplicate product. Product ID:', productId, 'Existing index:', existingItemIndex);
    
    if (existingItemIndex !== -1) {
      // Product already exists, show confirmation dialog
      const existingItem = bill[existingItemIndex];
      const newQuantity = existingItem.quantity + quantity;
      const newSubtotal = Math.round(newQuantity * price * 100) / 100;
      const newTotal = Math.round((newSubtotal - discount) * 100) / 100;
      const newVatAmount = Math.round(newTotal * (vatPercent / 100) * 100) / 100;
      
      console.log('Duplicate found. Existing quantity:', existingItem.quantity, 'New quantity:', quantity, 'Total will be:', newQuantity);
      
      // Show modern confirmation dialog
      console.log('Showing confirmation dialog for duplicate product');
      console.log('showConfirmDialog available:', typeof showConfirmDialog);
      
      let confirmed;
      if (typeof showConfirmDialog !== 'function') {
        console.error('showConfirmDialog is not available!');
        // Fallback to simple confirm
        confirmed = confirm(`"${productName}" is already in the bill. Would you like to increase the quantity?`);
        console.log('Fallback confirm result:', confirmed);
      } else {
        confirmed = await showConfirmDialog(
          `"${productName}" is already in the bill with quantity ${existingItem.quantity}.<br><br>Would you like to increase the quantity to ${newQuantity} instead of adding a duplicate item?`,
          'Product Already Added',
          'info'
        );
        console.log('User response to duplicate dialog:', confirmed);
      }
      
      if (confirmed) {
        console.log('User confirmed to update quantity. Updating existing item...');
        // Update existing item with new quantity and recalculate totals
        bill[existingItemIndex] = {
          ...existingItem,
          quantity: newQuantity,
          rate: price, // Update rate in case it changed (changed from 'price' to 'rate')
          discount: discount,
          advance_paid: advance, // Changed from 'advance' to 'advance_paid' to match backend expectation
          vat_percent: vatPercent,
          vat_amount: newVatAmount,
          subtotal: newSubtotal,
          total: newTotal
        };
        
        console.log('Updated existing item:', bill[existingItemIndex]);
        
        // Update display
        renderBillTable();
        updateTotals();
        
        // Clear form fields
        clearBillingForm(formType);
        
        // Show success message
        showBillingSuccess('Quantity updated');
        
        // Focus back to product input
        setTimeout(() => {
          if (productInput) {
            productInput.focus();
          }
        }, 500);
      } else {
        console.log('User cancelled duplicate dialog. Not adding item.');
      }
      return;
    }
    
    // Calculate total with better precision
    const subtotal = Math.round(quantity * price * 100) / 100;
    const total = Math.round((subtotal - discount) * 100) / 100;
    const vatAmount = Math.round(total * (vatPercent / 100) * 100) / 100;
    
    // Add item to bill
    const item = {
      product_id: productId,
      product_name: productName,
      quantity: quantity,
      rate: price, // Changed from 'price' to 'rate' to match backend expectation
      discount: discount,
      advance_paid: advance, // Changed from 'advance' to 'advance_paid' to match backend expectation
      vat_percent: vatPercent,
      vat_amount: vatAmount,
      subtotal: subtotal, // Store subtotal (before discount)
      total: total // Store final total (after discount)
    };
    
    console.log('Adding new item to bill:', item);
    bill.push(item);
    
    // Update display
    renderBillTable();
    updateTotals();
    
    // Clear form fields with better UX
    clearBillingForm(formType);
    
    // Show success message with better feedback
    showBillingSuccess('Item added');
    
         // Focus back to product input for quick addition of next item
     setTimeout(() => {
       if (productInput) {
         productInput.focus();
       }
     }, 500);
   }

  // Helper function to show field-specific errors
  function showFieldError(input, message) {
    if (!input) return;
    
    input.classList.add('billing-input-error');
    
    // Remove existing error message
    const existingError = input.parentNode.querySelector('.billing-error-message');
    if (existingError) {
      existingError.remove();
    }
    
    // Add new error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'billing-error-message';
    errorDiv.textContent = message;
    input.parentNode.appendChild(errorDiv);
  }

  // Helper function to reset the entire billing form after successful bill creation
  function resetBillingForm() {
    // Clear the bill array
    bill.length = 0;
    
    // Clear customer fields
    clearCustomerFields();
    
    // Clear billing form fields (both desktop and mobile)
    clearBillingForm('desktop');
    clearBillingForm('mobile');
    
    // Clear master fields
    const masterNameElement = document.getElementById('masterName');
    const masterNameMobileElement = document.getElementById('masterNameMobile');
    if (masterNameElement) {
      masterNameElement.value = '';
      masterNameElement.removeAttribute('data-selected-master');
    }
    if (masterNameMobileElement) {
      masterNameMobileElement.value = '';
      masterNameMobileElement.removeAttribute('data-selected-master');
    }
    
    // Clear bill details
    const billNumberElement = document.getElementById('billNumber');
    const billCustomerElement = document.getElementById('billCustomer');
    const billMobileElement = document.getElementById('billMobile');
    const billDateElement = document.getElementById('billDate');
    const deliveryDateElement = document.getElementById('deliveryDate');
    const trialDateElement = document.getElementById('trialDate');
    const billNotesElement = document.getElementById('billNotes');
    
    if (billNumberElement) billNumberElement.value = '';
    if (billCustomerElement) billCustomerElement.value = '';
    if (billMobileElement) billMobileElement.value = '';
    if (billDateElement) billDateElement.value = '';
    if (deliveryDateElement) deliveryDateElement.value = '';
    if (trialDateElement) trialDateElement.value = '';
    if (billNotesElement) billNotesElement.value = '';
    
    // Update the bill table display and totals
    renderBillTable();
    updateTotals();
    
    // Set default dates and bill number
    setDefaultBillingDates();
    
    // Disable action buttons
    const whatsappBtn = document.getElementById('whatsappBtn');
    const emailBtn = document.getElementById('emailBtn');
    const printBtn = document.getElementById('printBtn');
    
    if (whatsappBtn) {
      whatsappBtn.disabled = true;
      whatsappBtn.classList.add('opacity-50', 'pointer-events-none', 'bg-green-600/40', 'text-white/60');
      whatsappBtn.classList.remove('bg-green-600', 'text-white', 'hover:bg-green-500');
    }
    if (emailBtn) {
      emailBtn.disabled = true;
      emailBtn.classList.add('opacity-50', 'pointer-events-none', 'bg-blue-600/40', 'text-white/60');
      emailBtn.classList.remove('bg-blue-600', 'text-white', 'hover:bg-blue-500');
    }
    if (printBtn) {
      printBtn.disabled = true;
      printBtn.classList.add('opacity-50', 'pointer-events-none', 'bg-indigo-600/40', 'text-white/60');
      printBtn.classList.remove('bg-indigo-600', 'text-white', 'hover:bg-indigo-500');
    }
    
    console.log('Γ£à Billing form reset successfully');
  }

  // Helper function to clear billing form
  function clearBillingForm(formType = 'desktop') {
    let productInput, quantityInput, priceInput, discountInput, advanceInput, vatInput;
    
    if (formType === 'mobile') {
      productInput = document.getElementById('billProductMobile');
      quantityInput = document.getElementById('billQtyMobile');
      priceInput = document.getElementById('billRateMobile');
      discountInput = document.getElementById('billDiscountMobile');
      advanceInput = document.getElementById('billAdvPaidMobile');
      vatInput = document.getElementById('vatPercentMobile');
    } else {
      productInput = document.getElementById('billProduct');
      quantityInput = document.getElementById('billQty');
      priceInput = document.getElementById('billRate');
      discountInput = document.getElementById('billDiscount');
      advanceInput = document.getElementById('billAdvPaid');
      vatInput = document.getElementById('vatPercent');
    }
    
    if (productInput) {
      productInput.value = '';
      productInput.removeAttribute('data-selected-product');
      productInput.classList.remove('billing-input-error');
    }
    if (quantityInput) {
      quantityInput.value = '1';
      quantityInput.classList.remove('billing-input-error');
    }
    if (priceInput) {
      priceInput.value = '0.00';
      priceInput.classList.remove('billing-input-error');
    }
    if (discountInput) {
      discountInput.value = '0';
      discountInput.classList.remove('billing-input-error');
    }
    if (advanceInput) {
      advanceInput.value = '0';
      advanceInput.classList.remove('billing-input-error');
    }
    if (vatInput) {
      vatInput.value = '5';
      vatInput.classList.remove('billing-input-error');
    }
    
    // Remove any error messages
    const errorMessages = document.querySelectorAll('.billing-error-message');
    errorMessages.forEach(msg => msg.remove());
  }

  // Helper function to show billing success feedback
  function showBillingSuccess(message) {
    // Create success notification
    const successDiv = document.createElement('div');
    successDiv.className = 'billing-success';
    successDiv.innerHTML = `
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
      <span>${message}</span>
    `;
    
    // Try to insert after desktop add item button first
    const addItemBtn = document.getElementById('addItemBtn');
    if (addItemBtn && addItemBtn.parentNode) {
      addItemBtn.parentNode.insertBefore(successDiv, addItemBtn.nextSibling);
    } else {
      // If desktop button not found, try mobile button
      const addItemBtnMobile = document.getElementById('addItemBtnMobile');
      if (addItemBtnMobile && addItemBtnMobile.parentNode) {
        addItemBtnMobile.parentNode.insertBefore(successDiv, addItemBtnMobile.nextSibling);
      } else {
        // If neither button found, append to body as fallback
        document.body.appendChild(successDiv);
      }
    }
    
    // Remove after 3 seconds
    setTimeout(() => {
      if (successDiv.parentNode) {
        successDiv.parentNode.removeChild(successDiv);
      }
    }, 3000);
  }

  // Setup Search & Reprint functionality
  function setupSearchAndReprint() {
    // Search & Reprint Invoice Modal Logic
    document.getElementById('searchInvoiceBtn')?.addEventListener('click', () => {
      document.getElementById('searchInvoiceModal').classList.remove('hidden');
      document.getElementById('searchInvoiceInput').value = '';
      document.getElementById('searchInvoiceResults').innerHTML = '';
      document.getElementById('searchInvoiceInput').focus();
    });
    
    document.getElementById('closeSearchInvoice')?.addEventListener('click', () => {
      document.getElementById('searchInvoiceModal').classList.add('hidden');
    });
    
    document.getElementById('searchInvoiceInput')?.addEventListener('input', async (e) => {
      const q = e.target.value.trim().toLowerCase();
      if (!q) {
        document.getElementById('searchInvoiceResults').innerHTML = '';
        return;
      }
      const resp = await fetch('/api/bills');
      const allBills = await resp.json();
      const results = (allBills || []).filter(bill =>
        (bill.bill_number && bill.bill_number.toLowerCase().includes(q)) ||
        (bill.customer_name && bill.customer_name.toLowerCase().includes(q)) ||
        (bill.customer_phone && bill.customer_phone.toLowerCase().includes(q))
      );
      document.getElementById('searchInvoiceResults').innerHTML = results.length
        ? `<table class="min-w-full text-sm">
            <thead><tr>
              <th class="px-2 py-1 text-left">Invoice #</th>
              <th class="px-2 py-1 text-left">Customer</th>
              <th class="px-2 py-1 text-left">Date</th>
              <th class="px-2 py-1 text-left">Amount</th>
              <th class="px-2 py-1 text-left">Status</th>
              <th></th>
            </tr></thead>
            <tbody>
              ${results.map(bill => `
                <tr>
                  <td class="px-2 py-1">${bill.bill_number || bill.bill_id}</td>
                  <td class="px-2 py-1">${bill.customer_name || ''}</td>
                  <td class="px-2 py-1">${bill.bill_date || ''}</td>
                  <td class="px-2 py-1">AED ${parseFloat(bill.total_amount).toFixed(2)}</td>
                  <td class="px-2 py-1">${bill.status || (bill.balance_amount > 0 ? 'Pending' : 'Paid')}</td>
                  <td class="px-2 py-1 flex gap-2">
                    <button class="reprint-btn bg-indigo-600 hover:bg-indigo-500 text-white rounded px-3 py-1" data-id="${bill.bill_id}">Reprint</button>
                    ${(bill.status === 'Pending' || (bill.balance_amount && bill.balance_amount > 0)) ? `<button class="mark-paid-btn bg-green-600 hover:bg-green-500 text-white rounded px-3 py-1" data-id="${bill.bill_id}" data-balance="${bill.balance_amount}">Mark as Paid</button>` : ''}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>`
        : '<div class="text-neutral-400 text-center py-4">No invoices found.</div>';
    });
    
    // Combined Reprint and Mark as Paid functionality
    document.getElementById('searchInvoiceResults')?.addEventListener('click', async function(e) {
      const reprintBtn = e.target.closest('.reprint-btn');
      const payBtn = e.target.closest('.mark-paid-btn');
      
      // Handle Reprint functionality
      if (reprintBtn) {
        const billId = reprintBtn.getAttribute('data-id');
        window.open(`/api/bills/${billId}/print`, '_blank');
        return; // Prevent further processing
      }
      
      // Handle Mark as Paid functionality
      if (payBtn) {
        const billId = payBtn.getAttribute('data-id');
        let balance = parseFloat(payBtn.getAttribute('data-balance'));
        if (!balance || balance <= 0) {
          showModernAlert('No balance due.', 'info');
          return;
        }
        // Find bill details from the row
        const row = payBtn.closest('tr');
        const billNum = row.children[0].textContent;
        const customer = row.children[1].textContent;
        const date = row.children[2].textContent;
        const total = parseFloat(row.children[3].textContent.replace('AED',''));
        const status = row.children[4].textContent;
        // Fetch delivery date from backend (optional, fallback to '-')
        let delivery = '-';
        try {
          const resp = await fetch(`/api/bills/${billId}`);
          const data = await resp.json();
          if (data && data.bill && data.bill.delivery_date) delivery = data.bill.delivery_date;
        } catch {}
        const paid = total - balance;
        showPaymentModal({
          billNum,
          customer,
          paid,
          due: balance,
          max: balance,
          total,
          delivery,
          status,
          onOk: async (amount) => {
            payBtn.disabled = true;
            payBtn.textContent = 'Processing...';
            const resp = await fetch(`/api/bills/${billId}/payment`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ amount_paid: amount })
            });
            const result = await resp.json();
            if (result && result.bill && !result.error) {
              showPaymentProgressModal(() => {
                showModernAlert('Payment recorded. Bill is now ' + (result.bill.status || 'updated'), 'success');
                document.getElementById('searchInvoiceInput').dispatchEvent(new Event('input'));
              });
            } else {
              showModernAlert(result?.error || 'Failed to update payment', 'error');
              payBtn.disabled = false;
              payBtn.textContent = 'Mark as Paid';
            }
          }
        });
      }
    });
  }

  // Setup Mobile Billing Toggle
  function setupMobileBillingToggle() {
    const mobileBillingToggle = document.getElementById('mobileBillingToggle');
    if (mobileBillingToggle) {
      mobileBillingToggle.addEventListener('click', function() {
        // Show mobile billing interface
        if (window.TajirPWA && window.TajirPWA.mobileBilling) {
          window.TajirPWA.mobileBilling.showMobileBilling();
        } else {
          showModernAlert('Mobile billing is not available. Please refresh the page.', 'warning', 'Feature Unavailable');
        }
      });
    }
  }

  // Setup Print Button functionality
  function setupPrintButton() {
    const printBtn = document.getElementById('printBtn');
    if (printBtn) {
      printBtn.addEventListener('click', async function() {
        console.log('Print button clicked');
        
        if (bill.length === 0) {
          showModernAlert('Please add items to the bill first', 'warning', 'No Items');
          return;
        }

        // Require customer mobile
        const billMobileInput = document.getElementById('billMobile');
        const customerMobile = billMobileInput?.value?.trim() || '';
        if (!customerMobile) {
          showModernAlert('Please enter customer mobile number', 'warning', 'Mobile Required');
          if (billMobileInput) billMobileInput.focus();
          return;
        }

        // Generate bill number if not exists
        const billNumberInput = document.getElementById('billNumber');
        if (billNumberInput && !billNumberInput.value.trim()) {
          const timestamp = Date.now();
          billNumberInput.value = `BILL-${timestamp}`;
        }

        // Collect bill data
        const masterNameElement = document.getElementById('masterName');
        const masterNameMobileElement = document.getElementById('masterNameMobile');
        let masterId = null;
        
        console.log('≡ƒöì Debugging master selection:');
        console.log('≡ƒÆ╗ Desktop master element:', masterNameElement);
        console.log('≡ƒô▒ Mobile master element:', masterNameMobileElement);
        console.log('≡ƒîÉ Global selectedMasterId:', window.selectedMasterId);
        
        if (masterNameElement) {
          console.log('≡ƒÆ╗ Desktop master value:', masterNameElement.value);
          console.log('≡ƒÆ╗ Desktop master data-selected-master:', masterNameElement.getAttribute('data-selected-master'));
        }
        
        if (masterNameMobileElement) {
          console.log('≡ƒô▒ Mobile master value:', masterNameMobileElement.value);
          console.log('≡ƒô▒ Mobile master data-selected-master:', masterNameMobileElement.getAttribute('data-selected-master'));
        }
        
        // Try to get master_id from the data-selected-master attribute (check both desktop and mobile)
        let selectedMasterElement = masterNameElement;
        if (!selectedMasterElement || !selectedMasterElement.getAttribute('data-selected-master')) {
          selectedMasterElement = masterNameMobileElement;
        }
        
        console.log('≡ƒÄ» Selected master element:', selectedMasterElement);
        
        if (selectedMasterElement && selectedMasterElement.getAttribute('data-selected-master')) {
          try {
            const selectedMaster = JSON.parse(selectedMasterElement.getAttribute('data-selected-master'));
            masterId = selectedMaster.master_id;
            console.log('Γ£à Successfully parsed master data:', selectedMaster);
            console.log('≡ƒåö Master ID extracted:', masterId);
          } catch (e) {
            console.warn('Failed to parse selected master data:', e);
          }
        } else {
          console.log('Γ¥î No master selected or data-selected-master attribute not found');
          // Try to use global selectedMasterId as fallback
          if (window.selectedMasterId) {
            masterId = window.selectedMasterId;
            console.log('≡ƒöä Using global selectedMasterId as fallback:', masterId);
          }
        }
        
        // Calculate totals from bill array (same logic as updateTotals function)
        const subtotal = bill.reduce((sum, item) => sum + item.total, 0); // Total after discount
        const totalAdvance = bill.reduce((sum, item) => sum + (item.advance_paid || 0), 0);
        const totalVat = bill.reduce((sum, item) => sum + item.vat_amount, 0); // Sum of individual VAT amounts
        const totalBeforeAdvance = subtotal + totalVat;
        const amountDue = totalBeforeAdvance - totalAdvance;
        
        const billData = {
          bill: {
            bill_number: document.getElementById('billNumber')?.value || '',
            customer_name: document.getElementById('billCustomer')?.value || '',
            customer_phone: document.getElementById('billMobile')?.value || '',
            customer_city: document.getElementById('billCity')?.value || '',
            customer_area: document.getElementById('billArea')?.value || '',
            customer_trn: document.getElementById('billTRN')?.value || '',
            customer_type: document.getElementById('billCustomerType')?.value || 'Individual',
            business_name: document.getElementById('billBusinessName')?.value || '',
            business_address: document.getElementById('billBusinessAddress')?.value || '',
            bill_date: document.getElementById('billDate')?.value || '',
            delivery_date: document.getElementById('deliveryDate')?.value || '',
            trial_date: document.getElementById('trialDate')?.value || '',
            master_id: masterId,
            master_name: document.getElementById('masterName')?.value || '',
            notes: document.getElementById('billNotes')?.value || '',
            subtotal: subtotal,
            discount: 0, // No discount field in current UI
            vat_amount: totalVat,
            total_amount: amountDue,
            advance_paid: totalAdvance,
            balance_amount: amountDue
          },
          items: bill
        };

        try {
          console.log('≡ƒôï Bill data being sent:', billData);
          console.log('≡ƒöì Master ID:', masterId);
          
          // Save bill first
          const saveResponse = await fetch('/api/bills', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(billData)
          });

          const saveResult = await saveResponse.json();
          
          if (saveResult.error) {
            showModernAlert(saveResult.error, 'error', 'Save Failed');
            return;
          }

          if (saveResult.bill_id) {
            // Open print window
            window.open(`/api/bills/${saveResult.bill_id}/print`, '_blank');
            
            // Reset the billing form
            resetBillingForm();
            
            // Show success message
            showSimpleToast('Bill saved and print window opened', 'success');
          } else {
            showModernAlert('Failed to save bill', 'error', 'Save Failed');
          }
        } catch (error) {
          console.error('Error saving bill:', error);
          showModernAlert('Failed to save bill. Please try again.', 'error', 'Save Failed');
        }
      });
    }
  }

  // Initialize billing system
  setDefaultBillingDates(); // This is now async but we don't need to await it
  setupMobileCustomerFetch();
  setupCustomerTypeHandler();
  loadRecentCustomers(); // Load recent customers for quick selection
  setupMasterAutocomplete();
  
  // Setup city and area autocomplete
  setupCityAreaAutocomplete();
  setupAddItemHandler();
  setupSearchAndReprint();
  setupCustomerQuickSearch();
  setupProductQuickAdd();
  setupSmartDefaults();
  setupMobileBillingToggle();
  setupPrintButton(); // Add print button setup
  
  // Initialize WhatsApp functionality
  initializeWhatsApp();
  

  
  console.log('≡ƒÜÇ Billing system initialized successfully!');
  console.log('showConfirmDialog available during init:', typeof showConfirmDialog);
  console.log('showSimpleToast available during init:', typeof showSimpleToast);
  
  // Make functions globally available
  window.initializeBillingSystem = initializeBillingSystem;
  window.showPaymentModal = showPaymentModal;
  window.showPaymentProgressModal = showPaymentProgressModal;
  window.showModernAlert = showModernAlert; // Expose modern alert globally
  window.showSimpleToast = showSimpleToast; // Expose simple toast globally
  window.togglePrint = togglePrint;
  window.renderBillTable = renderBillTable;
  window.updateTotals = updateTotals;
  window.bill = bill; // Expose bill globally
  window.getNextBillNumber = getNextBillNumber; // Expose for manual refresh
  window.setDefaultBillingDates = setDefaultBillingDates; // Expose for manual refresh
  window.fetchCustomerByMobile = fetchCustomerByMobile; // Expose for manual use
  window.populateCustomerFields = populateCustomerFields; // Expose for manual use
  window.clearCustomerFields = clearCustomerFields; // Expose for manual use
  window.setupAddItemHandler = setupAddItemHandler; // Expose for manual use
  

  
  // Function to reset billing form with fresh defaults
  window.resetBillingForm = async function() {
    // Clear bill items
    bill.length = 0;
    renderBillTable();
    updateTotals();
    
    // Reset form fields
    const form = document.getElementById('billingForm');
    if (form) {
      form.reset();
    }
    
    // Set fresh defaults
    await setDefaultBillingDates();
  };
  
  window.editBillItem = function(index) {
    console.log('editBillItem called with index:', index);
    const item = bill[index];
    if (!item) {
      console.log('No item found at index:', index);
      return;
    }
    console.log('Editing item:', item);
    
    // Desktop form elements
    const billProductElement = document.getElementById('billProduct');
    const billQuantityElement = document.getElementById('billQty');
    const billPriceElement = document.getElementById('billRate');
    const billDiscountElement = document.getElementById('billDiscount');
    const billAdvanceElement = document.getElementById('billAdvPaid');
    const billVatElement = document.getElementById('vatPercent');
    
    // Mobile form elements
    const billProductMobileElement = document.getElementById('billProductMobile');
    const billQuantityMobileElement = document.getElementById('billQtyMobile');
    const billPriceMobileElement = document.getElementById('billRateMobile');
    const billDiscountMobileElement = document.getElementById('billDiscountMobile');
    const billAdvanceMobileElement = document.getElementById('billAdvPaidMobile');
    const billVatMobileElement = document.getElementById('vatPercentMobile');
    
    // Populate desktop form elements
    if (billProductElement) {
      billProductElement.value = item.product_name;
      billProductElement.setAttribute('data-selected-product', JSON.stringify({
        product_id: item.product_id,
        name: item.product_name,
        price: item.rate, // Changed from item.price to item.rate
        product_type: 'Unknown'
      }));
    }
    if (billQuantityElement) billQuantityElement.value = item.quantity;
    if (billPriceElement) billPriceElement.value = item.rate; // Changed from item.price to item.rate
    if (billDiscountElement) billDiscountElement.value = item.discount || 0;
    if (billAdvanceElement) billAdvanceElement.value = item.advance_paid || 0;
    if (billVatElement) billVatElement.value = item.vat_percent || 5;
    
    // Populate mobile form elements
    if (billProductMobileElement) {
      billProductMobileElement.value = item.product_name;
      billProductMobileElement.setAttribute('data-selected-product', JSON.stringify({
        product_id: item.product_id,
        name: item.product_name,
        price: item.rate, // Changed from item.price to item.rate
        product_type: 'Unknown'
      }));
      console.log('Mobile product element populated:', item.product_name);
    } else {
      console.log('Mobile product element not found');
    }
    if (billQuantityMobileElement) {
      billQuantityMobileElement.value = item.quantity;
      console.log('Mobile quantity element populated:', item.quantity);
    } else {
      console.log('Mobile quantity element not found');
    }
    if (billPriceMobileElement) {
      billPriceMobileElement.value = item.rate; // Changed from item.price to item.rate
      console.log('Mobile price element populated:', item.rate);
    } else {
      console.log('Mobile price element not found');
    }
    if (billDiscountMobileElement) billDiscountMobileElement.value = item.discount || 0;
    if (billAdvanceMobileElement) billAdvanceMobileElement.value = item.advance || 0;
    if (billVatMobileElement) billVatMobileElement.value = item.vat_percent || 5;
    
    bill.splice(index, 1);
    renderBillTable();
    updateTotals();
    
    // Show success message
    if (window.showSimpleToast) {
      window.showSimpleToast('Item loaded for editing!', 'info');
    }
    
    console.log('Edit operation completed');
  };
  
  window.deleteBillItem = async function(index) {
    const confirmed = await showConfirmDialog(
      'Are you sure you want to delete this item? This action cannot be undone.',
      'Delete Item',
      'delete'
    );
    
    if (confirmed) {
      bill.splice(index, 1);
      renderBillTable();
      updateTotals();
      
      // Show success toast
      if (window.showSimpleToast) {
        window.showSimpleToast('Item deleted successfully!', 'success');
      }
    }
  };

  // WhatsApp functionality
  function initializeWhatsApp() {
    setTimeout(() => {
      const whatsappBtn = document.getElementById('whatsappBtn');
      
      if (whatsappBtn) {
        whatsappBtn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          handleWhatsAppClick();
        });
      }
    }, 1000);
  }

  // Function to prepare bill data for saving
  async function prepareBillData() {
    // Check if bill has items
    if (bill.length === 0) {
      if (window.showSimpleToast) {
        window.showSimpleToast('Please add items to the bill first', 'warning');
      }
      return null;
    }
    
    // Validate required fields
    const customerMobile = document.getElementById('billMobile')?.value?.trim();
    
    if (!customerMobile) {
      if (window.showSimpleToast) {
        window.showSimpleToast('Please enter customer mobile number in the Mobile field', 'warning');
      }
      // Focus on the mobile field to help user
      const mobileField = document.getElementById('billMobile');
      if (mobileField) {
        mobileField.focus();
        mobileField.style.borderColor = '#ef4444'; // Red border to highlight
        setTimeout(() => {
          mobileField.style.borderColor = ''; // Reset after 3 seconds
        }, 3000);
      }
      return null;
    }

    // Generate bill number if not exists
    const billNumberInput = document.getElementById('billNumber');
    if (billNumberInput && !billNumberInput.value.trim()) {
      const timestamp = Date.now();
      billNumberInput.value = `BILL-${timestamp}`;
    }

    // Collect bill data
    const masterNameElement = document.getElementById('masterName');
    const masterNameMobileElement = document.getElementById('masterNameMobile');
    let masterId = null;
    
    // Try to get master_id from the data-selected-master attribute (check both desktop and mobile)
    let selectedMasterElement = masterNameElement;
    if (!selectedMasterElement || !selectedMasterElement.getAttribute('data-selected-master')) {
      selectedMasterElement = masterNameMobileElement;
    }
    
    if (selectedMasterElement && selectedMasterElement.getAttribute('data-selected-master')) {
      try {
        const selectedMaster = JSON.parse(selectedMasterElement.getAttribute('data-selected-master'));
        masterId = selectedMaster.master_id;
      } catch (e) {
        console.warn('Failed to parse selected master data:', e);
      }
    } else {
      // Try to use global selectedMasterId as fallback
      if (window.selectedMasterId) {
        masterId = window.selectedMasterId;
      }
    }
    
    // Calculate totals from bill array (same logic as updateTotals function)
    const subtotal = bill.reduce((sum, item) => sum + item.total, 0); // Total after discount
    const totalAdvance = bill.reduce((sum, item) => sum + (item.advance_paid || 0), 0);
    const totalVat = bill.reduce((sum, item) => sum + item.vat_amount, 0); // Sum of individual VAT amounts
    const totalBeforeAdvance = subtotal + totalVat;
    const amountDue = totalBeforeAdvance - totalAdvance;
    
    const billData = {
      bill: {
        bill_number: document.getElementById('billNumber')?.value || '',
        customer_name: document.getElementById('billCustomer')?.value || '',
        customer_phone: document.getElementById('billMobile')?.value || '',
        customer_city: document.getElementById('billCity')?.value || '',
        customer_area: document.getElementById('billArea')?.value || '',
        customer_trn: document.getElementById('billTRN')?.value || '',
        customer_type: document.getElementById('billCustomerType')?.value || 'Individual',
        business_name: document.getElementById('billBusinessName')?.value || '',
        business_address: document.getElementById('billBusinessAddress')?.value || '',
        bill_date: document.getElementById('billDate')?.value || '',
        delivery_date: document.getElementById('deliveryDate')?.value || '',
        trial_date: document.getElementById('trialDate')?.value || '',
        master_id: masterId,
        master_name: document.getElementById('masterName')?.value || '',
        notes: document.getElementById('billNotes')?.value || '',
        subtotal: subtotal,
        discount: 0, // No discount field in current UI
        vat_amount: totalVat,
        total_amount: amountDue,
        advance_paid: totalAdvance,
        balance_amount: amountDue
      },
      items: bill
    };

    return billData;
  }

  async function handleWhatsAppClick() {
    // Check if there are items in the bill
    if (bill.length === 0) {
      if (window.showSimpleToast) {
        window.showSimpleToast('Please add items to the bill first', 'warning');
      }
      return;
    }
    
    try {
      // Create the bill data
      const billData = await prepareBillData();
      if (!billData) {
        if (window.showSimpleToast) {
          window.showSimpleToast('Failed to prepare bill data', 'error');
        }
        return;
      }
      
      // Save the bill
      const saveResponse = await fetch('/api/bills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(billData)
      });
      
      if (!saveResponse.ok) {
        throw new Error('Failed to save bill');
      }
      
      const saveResult = await saveResponse.json();
      
      if (saveResult.error) {
        if (window.showSimpleToast) {
          window.showSimpleToast(saveResult.error, 'error');
        }
        return;
      }
      
      if (saveResult.bill_id) {
        // Store the current bill ID
        window.currentBillId = saveResult.bill_id;
        
        // Generate PDF URL
        const pdfUrl = `${window.location.origin}/api/bills/${saveResult.bill_id}/pdf`;
        
        // Prepare WhatsApp message with detailed bill information
        const customerName = billData.bill.customer_name || 'Customer';
        const customerPhone = billData.bill.customer_phone || '';
        const customerCity = billData.bill.customer_city || '';
        const customerArea = billData.bill.customer_area || '';
        const totalAmount = billData.bill.total_amount || '0';
        const billNumber = billData.bill.bill_number || saveResult.bill_id;
        const billDate = billData.bill.bill_date || '';
        const deliveryDate = billData.bill.delivery_date || '';
        const trialDate = billData.bill.trial_date || '';
        const subtotal = billData.bill.subtotal || '0';
        const vatAmount = billData.bill.vat_amount || '0';
        const advancePaid = billData.bill.advance_paid || '0';
        const balanceAmount = billData.bill.balance_amount || '0';
        
        // Create detailed bill message
        let message = `*🧾 TAJIR POS - BILL GENERATED*\n\n`;
        message += `*Customer Details:*\n`;
        message += `• Name: ${customerName}\n`;
        if (customerPhone) message += `• Phone: ${customerPhone}\n`;
        if (customerCity) message += `• City: ${customerCity}\n`;
        if (customerArea) message += `• Area: ${customerArea}\n\n`;
        
        message += `*Bill Details:*\n`;
        message += `• Bill #: ${billNumber}\n`;
        message += `• Date: ${billDate}\n`;
        if (deliveryDate) message += `• Delivery: ${deliveryDate}\n`;
        if (trialDate) message += `• Trial: ${trialDate}\n\n`;
        
        // Add items details
        if (billData.items && billData.items.length > 0) {
          message += `*Items:*\n`;
          billData.items.forEach((item, index) => {
            message += `${index + 1}. ${item.product_name} - Qty: ${item.quantity} - Rate: AED ${item.rate} - Total: AED ${item.total}\n`;
          });
          message += `\n`;
        }
        
        message += `*Bill Summary:*\n`;
        message += `• Subtotal: AED ${subtotal}\n`;
        message += `• VAT: AED ${vatAmount}\n`;
        message += `• Advance Paid: AED ${advancePaid}\n`;
        message += `• Balance Amount: AED ${balanceAmount}\n`;
        message += `*Total Amount: AED ${totalAmount}*\n\n`;
        message += `Your bill has been generated successfully. Please check the details above.\n\n`;
        message += `*Note:* PDF invoice is available in the POS system.`;
        
        // Encode the message for WhatsApp
        const encodedMessage = encodeURIComponent(message);
        
        // Construct WhatsApp URL with customer phone number if available
        let whatsappUrl;
        if (customerPhone) {
          // Clean the phone number (remove non-digits) and prepend country code if needed
          const cleanPhone = customerPhone.replace(/\D/g, '');
          let phoneWithCode = cleanPhone;
          
          // If number doesn't start with country code, assume UAE (+971)
          if (!cleanPhone.startsWith('971') && cleanPhone.length > 0) {
            phoneWithCode = '971' + cleanPhone;
          }
          
          whatsappUrl = `https://wa.me/${phoneWithCode}?text=${encodedMessage}`;
        } else {
          // Fallback to general WhatsApp URL if no phone number
          whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
        }
        
        window.open(whatsappUrl, '_blank');
        
        // Also open PDF in new tab for immediate access
        window.open(pdfUrl, '_blank');
        
        // Show success message
        if (window.showSimpleToast) {
          window.showSimpleToast('Bill created! WhatsApp opened with detailed bill information!', 'success');
        }
        
      } else {
        if (window.showSimpleToast) {
          window.showSimpleToast('Failed to create bill', 'error');
        }
      }
      
    } catch (error) {
      console.error('Error creating bill for WhatsApp:', error);
      if (window.showSimpleToast) {
        window.showSimpleToast('Failed to create bill. Please try again.', 'error');
      }
    }
  }

  // Expose WhatsApp functions globally for debugging
  window.initializeWhatsApp = initializeWhatsApp;
  window.handleWhatsAppClick = handleWhatsAppClick;
  window.prepareBillData = prepareBillData;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeBillingSystem);
} else {
  initializeBillingSystem();
}
