// Billing System Module - v1.0.2 (Updated with modern text and WhatsApp integration)

// Global variables
let bill = []; // Primary declaration of 'bill'
let currentBillNumber = '';
let selectedMasterId = null;

// Add billing configuration loading and field management
let billingConfig = {
    enable_trial_date: true,
    enable_delivery_date: true,
    enable_advance_payment: true,
    enable_customer_notes: true,
    enable_employee_assignment: true,
    default_delivery_days: 3
};

// Load billing configuration from shop settings
async function loadBillingConfiguration() {
    try {
        // Loading billing configuration
        const response = await fetch('/api/shop-settings/billing-config');
        const data = await response.json();
        
        if (data.success) {
            billingConfig = data.config;
            // Billing config loaded successfully
            applyBillingConfiguration();
        } else {
            // No billing config found, using defaults
            applyBillingConfiguration();
        }
    } catch (error) {
        console.error('❌ Billing System: Error loading billing configuration:', error);
        // Use default configuration
        applyBillingConfiguration();
    }
}

// Apply billing configuration to show/hide fields
function applyBillingConfiguration() {
    
    // Trial Date field
    const trialDateField = document.getElementById('trialDate');
    const trialDateLabel = document.querySelector('label[for="trialDate"]');
    const trialDateContainer = trialDateField?.closest('.form-group') || trialDateField?.parentElement;
    
    if (trialDateContainer) {
        if (billingConfig.enable_trial_date) {
            trialDateContainer.style.display = '';
            // Set default trial date if field is enabled and no value set
            if (trialDateField && !trialDateField.value) {
                // Set default trial date based on config
                const today = new Date();
                const trial = new Date();
                const defaultDays = billingConfig.default_trial_days || 2; // Use trial days, fallback to 2
                trial.setDate(today.getDate() + defaultDays);
                trialDateField.value = trial.toISOString().split('T')[0];
            }
        } else {
            trialDateContainer.style.display = 'none';
        }
    }
    
    // Delivery Date field
    const deliveryDateField = document.getElementById('deliveryDate');
    const deliveryDateLabel = document.querySelector('label[for="deliveryDate"]');
    const deliveryDateContainer = deliveryDateField?.closest('.form-group') || deliveryDateField?.parentElement;
    

    
    if (deliveryDateContainer) {
        if (billingConfig.enable_delivery_date) {
            deliveryDateContainer.style.display = '';
            // Set default delivery date if field is enabled
            if (deliveryDateField && !deliveryDateField.value) {
                const today = new Date();
                const delivery = new Date();
                const defaultDays = billingConfig.default_delivery_days || 3;
                delivery.setDate(today.getDate() + defaultDays);
                const newDeliveryDate = delivery.toISOString().split('T')[0];
                deliveryDateField.value = newDeliveryDate;
            } else if (deliveryDateField && deliveryDateField.value) {
                // Delivery date already has value
            }


        } else {
            deliveryDateContainer.style.display = 'none';
        }
    }
    
    // Advance Payment field
    const advancePaymentField = document.getElementById('advancePayment');
    const advancePaymentLabel = document.querySelector('label[for="advancePayment"]');
    const advancePaymentContainer = advancePaymentField?.closest('.form-group') || advancePaymentField?.parentElement;
    
    if (advancePaymentContainer) {
        if (billingConfig.enable_advance_payment) {
            advancePaymentContainer.style.display = '';
        } else {
            advancePaymentContainer.style.display = 'none';
            // Clear advance payment if disabled
            if (advancePaymentField) {
                advancePaymentField.value = '';
                updateBillSummary();
            }
        }
    }
    
    // Customer Notes field
    const customerNotesField = document.getElementById('billNotes');
    const customerNotesLabel = document.querySelector('label[for="billNotes"]');
    const customerNotesContainer = customerNotesField?.closest('.form-group') || customerNotesField?.parentElement;
    
    if (customerNotesContainer) {
        if (billingConfig.enable_customer_notes) {
            customerNotesContainer.style.display = '';
        } else {
            customerNotesContainer.style.display = 'none';
            // Clear customer notes if disabled
            if (customerNotesField) {
                customerNotesField.value = '';
            }
        }
    }
    
    // Employee Assignment field (using existing masterName field)
    const employeeField = document.getElementById('masterName');
    const employeeLabel = document.querySelector('label[for="masterName"]');
    const employeeContainer = employeeField?.closest('.form-group') || employeeField?.parentElement;
    
    if (employeeContainer) {
        if (billingConfig.enable_employee_assignment) {
            employeeContainer.style.display = '';
            // Populate employee dropdown if enabled
            populateEmployeeDropdown();
        } else {
            // Don't hide the field, just clear it and remove datalist
            if (employeeField) {
                employeeField.value = '';
                employeeField.removeAttribute('list');
                employeeField.removeAttribute('data-selected-employee-id');
            }
            // Remove datalist if it exists
            const datalist = document.getElementById('employeeDatalist');
            if (datalist) {
                datalist.remove();
            }

        }
    }
    
    // Set basic default dates (bill date and bill number) after configuration is applied
    setBasicDefaultDates();
    
    // Re-apply default employee if employees are already loaded
    if (window.allEmployees && window.allEmployees.length > 0) {
        // Call the global setDefaultOwner function if it exists
        if (typeof window.setDefaultOwner === 'function') {
            window.setDefaultOwner();
        }
    }
}

// Get next bill number from API
async function getNextBillNumber() {
    try {
        const response = await fetch('/api/next-bill-number');
        const data = await response.json();
        return data.next_number;
    } catch (error) {
        console.error('Error getting next bill number:', error);
        return null;
    }
}

// Set basic default dates (bill date and bill number) without interfering with configurable fields
async function setBasicDefaultDates() {
    const today = new Date();
    
    const billDateElement = document.getElementById('billDate');
    const billNumberElement = document.getElementById('billNumber');
    
    // Set default bill date to today
    if (billDateElement) {
        billDateElement.value = today.toISOString().slice(0, 10);
    }
    
    // Set auto-generated bill number
    if (billNumberElement) {
        const nextBillNumber = await getNextBillNumber();
        if (nextBillNumber) {
            billNumberElement.value = nextBillNumber;
        }
    }
}

// Populate employee dropdown with available employees
async function populateEmployeeDropdown() {
    const employeeField = document.getElementById('masterName');
    if (!employeeField) {
        return;
    }
    
    try {
        const response = await fetch('/api/employees');
        const employees = await response.json();
        
        // Create or get existing datalist for autocomplete
        let datalist = document.getElementById('employeeDatalist');
        if (!datalist) {
            datalist = document.createElement('datalist');
            datalist.id = 'employeeDatalist';
            document.body.appendChild(datalist);
        }
        
        // Clear existing options
        datalist.innerHTML = '';
        
        // Add employee options to datalist
        if (Array.isArray(employees)) {
            employees.forEach(emp => {
                const option = document.createElement('option');
                option.value = emp.name || `Employee #${emp.employee_id}`;
                option.setAttribute('data-employee-id', emp.employee_id || emp.id || '');
                datalist.appendChild(option);
            });
            
            // Set the datalist for the input field
            employeeField.setAttribute('list', 'employeeDatalist');
            

            
            // Preselect default employee if configured
            if (billingConfig.default_employee_id) {
                const defaultEmployee = employees.find(emp => 
                    (emp.employee_id || emp.id) == billingConfig.default_employee_id
                );
                if (defaultEmployee) {
                    employeeField.value = defaultEmployee.name || `Employee #${defaultEmployee.employee_id}`;
                    employeeField.setAttribute('data-selected-employee-id', defaultEmployee.employee_id || defaultEmployee.id);
                }
            }
        }
    } catch (error) {
        console.error('Error populating employee dropdown:', error);
    }
}

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
      if (onOk) {
        try {
          onOk(paymentAmount);
        } catch (error) {
          console.error('Error in payment onOk callback:', error);
        }
      }
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
        bgColor = 'bg-gradient-to-r from-green-500 to-green-600';
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
      case 'info':
        bgColor = 'bg-gradient-to-r from-green-500 to-green-600';
        textColor = 'text-white';
        iconColor = 'text-green-100';
        break;
      default:
        bgColor = 'bg-gradient-to-r from-green-500 to-green-600';
        textColor = 'text-white';
        iconColor = 'text-green-100';
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
    
    // Check if VAT should be hidden when included in price
    const includeVatInPrice = window.getIncludeVatInPrice ? window.getIncludeVatInPrice() : false;
    
    tbody.innerHTML = bill.map((item, index) => `
      <tr class="hover:bg-neutral-800/50 transition-colors swipe-action" data-index="${index}">
        <td class="px-3 py-3">${item.product_name || ''}</td>
        <td class="px-3 py-3">
          <input type="number" min="1" value="${item.quantity || 0}" 
                 class="w-16 bg-transparent border-none text-center text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded px-1"
                 onchange="updateBillItemField(${index}, 'quantity', this.value)"
                 onblur="updateBillItemField(${index}, 'quantity', this.value)">
        </td>
        <td class="px-3 py-3">${(item.rate || 0).toFixed(2)}</td>
        <td class="px-3 py-3">
          <div class="flex flex-col items-center">
            <input type="number" min="0" max="100" step="0.01" value="${(item.discount || 0).toFixed(2)}" 
                   class="w-20 bg-transparent border-none text-center text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded px-1"
                   onchange="updateBillItemField(${index}, 'discount', this.value)"
                   onblur="updateBillItemField(${index}, 'discount', this.value)">
            <span class="text-xs text-gray-400">${((item.rate || 0) * (item.quantity || 0) * (item.discount || 0) / 100).toFixed(2)}</span>
          </div>
        </td>
        <td class="px-3 py-3">
          <input type="number" min="0" step="0.01" value="${(item.advance_paid || 0).toFixed(2)}" 
                 class="w-20 bg-transparent border-none text-center text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded px-1"
                 onchange="updateBillItemField(${index}, 'advance_paid', this.value)"
                 onblur="updateBillItemField(${index}, 'advance_paid', this.value)"
                 ${window.paymentMode === 'full' ? 'disabled' : ''}>
        </td>
        ${includeVatInPrice ? '' : `<td class="px-3 py-3">${(item.vat_amount || 0).toFixed(2)}</td>`}
        <td class="px-3 py-3">${(item.total || 0).toFixed(2)}</td>
        <td class="px-3 py-3 flex gap-2">
          <button class="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 rounded transition-all duration-200 transform hover:scale-110 hover:shadow-sm mobile-btn" onclick="deleteBillItem(${index})">
            Delete
          </button>
        </td>
      </tr>
    `).join('');
    
    // Update table header to show/hide VAT column
    updateBillTableHeader(includeVatInPrice);
    
    // Reinitialize swipe actions for mobile after rendering table
    if (window.mobileEnhancements && window.mobileEnhancements.setupSwipeActions) {
      setTimeout(() => {
        window.mobileEnhancements.setupSwipeActions();
      }, 100);
    }
  }

  function updateBillTableHeader(includeVatInPrice) {
    const thead = document.getElementById('billTable')?.querySelector('thead tr');
    if (!thead) return;
    
    // Find the Tax column header (6th column, index 5)
    const taxHeader = thead.children[5];
    if (taxHeader) {
      taxHeader.style.display = includeVatInPrice ? 'none' : '';
    }
  }

  function updateTotals() {
    const includeVatInPrice = window.getIncludeVatInPrice ? window.getIncludeVatInPrice() : false;
    const vatPercent = window.getDefaultVatPercent ? window.getDefaultVatPercent() : 5;
    
    let subtotal, totalVat, totalBeforeAdvance;
    
    if (includeVatInPrice) {
      // VAT is already included in item prices
      const totalWithVat = bill.reduce((sum, item) => sum + item.total, 0);
      subtotal = totalWithVat / (1 + vatPercent / 100); // Calculate subtotal without VAT
      totalVat = totalWithVat - subtotal; // VAT amount
      totalBeforeAdvance = totalWithVat; // Total before advance is the same as total with VAT
    } else {
      // Traditional VAT calculation (VAT added on top)
      subtotal = bill.reduce((sum, item) => sum + item.total, 0); // Total after discount
      totalVat = bill.reduce((sum, item) => sum + item.vat_amount, 0); // Sum of individual VAT amounts
      totalBeforeAdvance = subtotal + totalVat;
    }
    
    const totalAdvance = bill.reduce((sum, item) => sum + (item.advance_paid || 0), 0); // Total advance paid
    const amountDue = totalBeforeAdvance - totalAdvance; // Deduct advance from total
    
    // Enable/disable action buttons based on bill items
    const saveBillBtn = document.getElementById('saveBillBtn');
    const whatsappBtn = document.getElementById('whatsappBtn');
    const emailBtn = document.getElementById('emailBtn');
    const printBtn = document.getElementById('printBtn');
    
    if (bill.length > 0) {
      // Enable buttons when items exist
      if (saveBillBtn) {
        saveBillBtn.disabled = false;
        saveBillBtn.classList.remove('opacity-50', 'pointer-events-none', 'bg-yellow-600/40', 'text-white/60');
        saveBillBtn.classList.add('bg-yellow-600', 'text-white', 'hover:bg-yellow-500');
      }
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
      if (saveBillBtn) {
        saveBillBtn.disabled = true;
        saveBillBtn.classList.add('opacity-50', 'pointer-events-none', 'bg-yellow-600/40', 'text-white/60');
        saveBillBtn.classList.remove('bg-yellow-600', 'text-white', 'hover:bg-yellow-500');
      }
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
       subtotalElement.textContent = `${subtotal.toFixed(2)}`;
     }
     if (vatElement) {
       vatElement.textContent = `${totalVat.toFixed(2)}`;
     }
     if (totalElement) {
       totalElement.textContent = `${amountDue.toFixed(2)}`;
     }
  }



  async function setDefaultBillingDates() {
    const today = new Date();
    const defaultDays = billingConfig?.default_delivery_days || 3;
    const deliveryDate = new Date(today.getTime() + defaultDays * 24 * 60 * 60 * 1000); // Configurable days from now
    
    const deliveryDateElement = document.getElementById('deliveryDate');
    const trialDateElement = document.getElementById('trialDate');
    
    // Only set delivery date if it's enabled in billing config
    if (deliveryDateElement && billingConfig?.enable_delivery_date) {
      deliveryDateElement.value = deliveryDate.toISOString().slice(0, 10);
    }
    
    // Only set trial date if it's enabled in billing config
    if (trialDateElement && billingConfig?.enable_trial_date) {
      // Trial date should be the same as delivery date
      trialDateElement.value = deliveryDate.toISOString().slice(0, 10);
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

  async function populateCustomerFields(customer) {
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

    // Loyalty: fetch and render loyalty status for this customer
    try {
      if (customer && customer.customer_id) {
        await renderLoyaltySummary(customer.customer_id);
      }
    } catch (e) {
      console.error('Failed to render loyalty summary', e);
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
    
    // Clear loyalty summary panel
    const loyaltySummaryElement = document.getElementById('loyaltySummary');
    if (loyaltySummaryElement) {
      loyaltySummaryElement.innerHTML = '';
      loyaltySummaryElement.style.display = 'none';
    }
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
          item.addEventListener('click', async function() {
            const customer = JSON.parse(this.dataset.customer);
            await populateCustomerFields(customer);
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
          await populateCustomerFields(customer);
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
          btn.addEventListener('click', async function() {
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
            
            await populateCustomerFields(customerData);
          });

          // Add hover event listeners for tooltip
          btn.addEventListener('mouseenter', function() {
            showCustomerTooltip(this);
          });

          btn.addEventListener('mouseleave', function() {
            hideCustomerTooltip();
          });
        });
        
        // Refresh Lucide icons
        try {
          if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
          }
        } catch (lucideError) {
          console.warn('Error creating lucide icons:', lucideError);
        }
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

  // Mobile Recent Customers functionality
  function initializeMobileRecentCustomers() {
    const mobileBtn = document.getElementById('mobileRecentCustomersBtn');
    const mobileDropdown = document.getElementById('mobileRecentCustomersDropdown');
    
    if (mobileBtn && mobileDropdown) {
      // Toggle dropdown on button click
      mobileBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const isVisible = !mobileDropdown.classList.contains('hidden');
        
        if (isVisible) {
          hideMobileRecentCustomersDropdown();
        } else {
          showMobileRecentCustomersDropdown();
        }
      });
      
      // Close dropdown when clicking outside
      document.addEventListener('click', function(e) {
        if (!mobileBtn.contains(e.target) && !mobileDropdown.contains(e.target)) {
          hideMobileRecentCustomersDropdown();
        }
      });
    }
  }

  function showMobileRecentCustomersDropdown() {
    const dropdown = document.getElementById('mobileRecentCustomersDropdown');
    if (dropdown) {
      dropdown.classList.remove('hidden');
      loadMobileRecentCustomers();
    }
  }

  function hideMobileRecentCustomersDropdown() {
    const dropdown = document.getElementById('mobileRecentCustomersDropdown');
    if (dropdown) {
      dropdown.classList.add('hidden');
    }
  }

  async function loadMobileRecentCustomers() {
    try {
      const response = await fetch('/api/customers/recent');
      const recentCustomers = await response.json();
      
      const container = document.getElementById('mobileRecentCustomersList');
      if (!container) return;
      
      if (recentCustomers && recentCustomers.length > 0) {
        container.innerHTML = recentCustomers.map(customer => `
          <button 
            class="mobile-customer-item"
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
            <div class="flex items-center justify-between w-full">
              <div class="flex items-center space-x-2">
                <svg class="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
                <span class="text-sm text-white font-medium">${customer.name}</span>
              </div>
              ${customer.phone ? `<span class="text-xs text-neutral-400">${customer.phone}</span>` : ''}
            </div>
          </button>
        `).join('');
        
        // Add event listeners to mobile customer items
        container.querySelectorAll('.mobile-customer-item').forEach(btn => {
          btn.addEventListener('click', async function() {
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
            

            await populateCustomerFields(customerData);
            hideMobileRecentCustomersDropdown();
            
            // Show success notification
            if (window.showSimpleToast) {
              window.showSimpleToast(`Customer "${customerData.name}" selected`, 'success');
            }
          });
        });
      } else {
        container.innerHTML = '<div class="p-3 text-center"><p class="text-neutral-500 text-sm">No recent customers found</p></div>';
      }
    } catch (error) {
      console.error('Error loading mobile recent customers:', error);
      const container = document.getElementById('mobileRecentCustomersList');
      if (container) {
        container.innerHTML = '<div class="p-3 text-center"><p class="text-neutral-500 text-sm">Failed to load recent customers</p></div>';
      }
    }
  }

  // Customer tooltip functions
  function showCustomerTooltip(element) {
    // Remove any existing tooltip
    hideCustomerTooltip();
    
    const customerData = {
      name: element.getAttribute('data-customer-name'),
      phone: element.getAttribute('data-customer-phone'),
      city: element.getAttribute('data-customer-city'),
      area: element.getAttribute('data-customer-area'),
      trn: element.getAttribute('data-customer-trn'),
      customer_type: element.getAttribute('data-customer-type'),
      business_name: element.getAttribute('data-business-name'),
      business_address: element.getAttribute('data-business-address')
    };
    


    // Create tooltip content
    let tooltipContent = `
      <div class="customer-tooltip-content">
        <div class="tooltip-header">
          <strong>${customerData.name}</strong>
        </div>
        <div class="tooltip-body">
    `;

    if (customerData.phone) {
      tooltipContent += `<div class="tooltip-row"><span class="tooltip-label">Phone:</span> <span class="tooltip-value">${customerData.phone}</span></div>`;
    }
    if (customerData.city) {
      tooltipContent += `<div class="tooltip-row"><span class="tooltip-label">City:</span> <span class="tooltip-value">${customerData.city}</span></div>`;
    }
    if (customerData.area) {
      tooltipContent += `<div class="tooltip-row"><span class="tooltip-label">Area:</span> <span class="tooltip-value">${customerData.area}</span></div>`;
    }
    if (customerData.customer_type === 'Business') {
      if (customerData.business_name) {
        tooltipContent += `<div class="tooltip-row"><span class="tooltip-label">Business:</span> <span class="tooltip-value">${customerData.business_name}</span></div>`;
      }
      if (customerData.business_address) {
        tooltipContent += `<div class="tooltip-row"><span class="tooltip-label">Address:</span> <span class="tooltip-value">${customerData.business_address}</span></div>`;
      }
      if (customerData.trn) {
        tooltipContent += `<div class="tooltip-row"><span class="tooltip-label">TRN:</span> <span class="tooltip-value">${customerData.trn}</span></div>`;
      }
    }
    if (customerData.customer_type) {
      tooltipContent += `<div class="tooltip-row"><span class="tooltip-label">Type:</span> <span class="tooltip-value">${customerData.customer_type}</span></div>`;
    }

    tooltipContent += `
        </div>
      </div>
    `;

    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'customer-tooltip';
    tooltip.innerHTML = tooltipContent;
    tooltip.id = 'customerTooltip';
    
    // Position tooltip
    const rect = element.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const tooltipWidth = 300; // Approximate tooltip width
    const padding = 20; // Padding from viewport edge
    
    tooltip.style.position = 'fixed';
    tooltip.style.zIndex = '10000';
    
    // Calculate left position - try to position to the right first
    let leftPosition = rect.left + rect.width + 10;
    let isPositionedLeft = false;
    
    // If tooltip would go off-screen to the right, position it to the left
    if (leftPosition + tooltipWidth + padding > viewportWidth) {
      leftPosition = rect.left - tooltipWidth - 10;
      isPositionedLeft = true;
    }
    
    // Ensure tooltip doesn't go off-screen to the left
    if (leftPosition < padding) {
      leftPosition = padding;
      isPositionedLeft = false;
    }
    
    // Add positioning class for arrow direction
    if (isPositionedLeft) {
      tooltip.classList.add('tooltip-left');
    } else {
      tooltip.classList.add('tooltip-right');
    }
    
    tooltip.style.left = leftPosition + 'px';
    tooltip.style.top = rect.top + 'px';
    
    document.body.appendChild(tooltip);
  }

  function hideCustomerTooltip() {
    const tooltip = document.getElementById('customerTooltip');
    if (tooltip) {
      tooltip.remove();
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
        option.addEventListener('click', async function(e) {
          e.preventDefault();
          e.stopPropagation();
          

          
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
          

          await populateCustomerFields(customerData);
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
  
        const response = await fetch(`/api/customers?search=${encodeURIComponent(query)}`);
        
        if (!response.ok) {
          console.error('Customer search failed:', response.status, response.statusText);
          hideCustomerDropdown();
          return;
        }
        
        const customers = await response.json();

        
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
          <div class="product-price" style="font-weight: 600; color: #10b981;">${product.rate}</div>
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
      
      if (!productDropdown || !productDropdown.style) return;
      
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
        if (productDropdown && productDropdown.style) {
        productDropdown.style.transition = 'all 0.2s ease';
        productDropdown.style.opacity = '1';
        productDropdown.style.transform = 'translateY(0)';
        }
      }, 10);
    }

    // Hide dropdown with animation
    function hideDropdown() {
      if (productDropdown && productDropdown.style) {
        productDropdown.style.transition = 'all 0.2s ease';
        productDropdown.style.opacity = '0';
        productDropdown.style.transform = 'translateY(-10px)';
        
        setTimeout(() => {
          if (productDropdown && productDropdown.style) {
          productDropdown.style.display = 'none';
          // Remove from DOM to prevent memory leaks
          if (productDropdown.parentNode) {
            productDropdown.parentNode.removeChild(productDropdown);
          }
          productDropdown = null;
          }
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
    
    if (!billDateInput || !deliveryDateInput) {
      return;
    }

    // Set default bill date to today
    const today = new Date().toISOString().split('T')[0];
    billDateInput.value = today;

    // Set default delivery date to bill date + configurable days (only if enabled)
    function updateDeliveryDate() {
      if (billDateInput.value && billingConfig?.enable_delivery_date) {
        const billDate = new Date(billDateInput.value);
        const deliveryDate = new Date(billDate);
        const defaultDays = billingConfig?.default_delivery_days || 3;
        deliveryDate.setDate(deliveryDate.getDate() + defaultDays);
        const newDeliveryDate = deliveryDate.toISOString().split('T')[0];
        deliveryDateInput.value = newDeliveryDate;
      }
    }

    // Update delivery date when bill date changes (only if enabled)
    if (billingConfig?.enable_delivery_date) {
      billDateInput.addEventListener('change', updateDeliveryDate);
      
      // Set initial delivery date
      updateDeliveryDate();
    }

    // Set default trial date to delivery date (same as delivery date) - only if enabled
    const trialDateInput = document.getElementById('trialDate');
    if (trialDateInput && billingConfig?.enable_trial_date) {
      function updateTrialDate() {
        if (billDateInput.value) {
          const billDate = new Date(billDateInput.value);
          const trialDate = new Date(billDate);
          const defaultDays = billingConfig?.default_trial_days || 2; // Use trial days, fallback to 2
          trialDate.setDate(trialDate.getDate() + defaultDays);
          trialDateInput.value = trialDate.toISOString().split('T')[0];
        }
      }
      
      // Keep trial date in sync when delivery or bill date changes
      deliveryDateInput.addEventListener('change', updateTrialDate);
      billDateInput.addEventListener('change', updateTrialDate);
      updateTrialDate();
    }
  }

  // FEATURE 4: City and Area Autocomplete
  function setupCityAreaAutocomplete() {
    const cityInput = document.getElementById('billCity');
    const areaInput = document.getElementById('billArea');
    
    if (!cityInput || !areaInput) {
      console.warn('City/Area autocomplete elements not found');
      return;
    }
    
    let cityDebounceTimer = null;
    let areaDebounceTimer = null;
    let cityDropdown = null;
    let areaDropdown = null;
    
    // Create city dropdown container
    function createCityDropdown() {
      if (cityDropdown) {
        cityDropdown.remove();
      }
      cityDropdown = document.createElement('div');
      cityDropdown.className = 'city-suggestion';
      cityDropdown.style.cssText = 'position: fixed; z-index: 99999 !important; background: #1f2937; border: 1px solid #374151; border-radius: 8px; max-height: 240px; overflow-y: auto; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);';
      cityDropdown.style.display = 'none';
      document.body.appendChild(cityDropdown);
      
      // Prevent dropdown from hiding when clicking inside it
      cityDropdown.addEventListener('click', function(e) {
        e.stopPropagation();
      });
    }
    
    // Create area dropdown container
    function createAreaDropdown() {
      if (areaDropdown) {
        areaDropdown.remove();
      }
      areaDropdown = document.createElement('div');
      areaDropdown.className = 'area-suggestion';
      areaDropdown.style.cssText = 'position: fixed; z-index: 99999 !important; background: #1f2937; border: 1px solid #374151; border-radius: 8px; max-height: 240px; overflow-y: auto; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);';
      areaDropdown.style.display = 'none';
      document.body.appendChild(areaDropdown);
      
      // Prevent dropdown from hiding when clicking inside it
      areaDropdown.addEventListener('click', function(e) {
        e.stopPropagation();
      });
    }
    
    // City autocomplete
    cityInput.addEventListener('input', function() {
      clearTimeout(cityDebounceTimer);
      const query = this.value.trim();
      
      if (query.length < 2) {
        hideCityDropdown();
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
            showCitySuggestions(filteredCities);
          } else {
            hideCityDropdown();
          }
        } catch (error) {
          console.error('Error loading cities:', error);
        }
      }, 300);
    });
    
    // Show city suggestions
    function showCitySuggestions(cities) {
      if (!cityDropdown) createCityDropdown();
      
      // Calculate position relative to input
      const inputRect = cityInput.getBoundingClientRect();
      cityDropdown.style.left = inputRect.left + 'px';
      cityDropdown.style.top = (inputRect.bottom + 4) + 'px';
      cityDropdown.style.width = inputRect.width + 'px';
      cityDropdown.style.minWidth = '200px'; // Ensure minimum width
      
      cityDropdown.innerHTML = cities.map(city => `
        <div class="city-option px-4 py-2 hover:bg-neutral-700 cursor-pointer border-b border-neutral-600 last:border-b-0" data-city="${city}">
          ${city}
        </div>
      `).join('');
      
      // Add click listeners directly to each option
      const options = cityDropdown.querySelectorAll('.city-option');
      options.forEach(option => {
        option.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          const selectedCity = this.getAttribute('data-city');
          cityInput.value = selectedCity;
          hideCityDropdown();
          
          // Clear area when city changes
          areaInput.value = '';
          
          // Update area dropdown to show areas for selected city
          updateAreaDropdownForCity(selectedCity);
        });
      });
      
      cityDropdown.style.display = 'block';
    }
    
    // Hide city dropdown
    function hideCityDropdown() {
      if (cityDropdown) {
        cityDropdown.style.transition = 'all 0.2s ease';
        cityDropdown.style.opacity = '0';
        cityDropdown.style.transform = 'translateY(-10px)';
        
        setTimeout(() => {
          cityDropdown.style.display = 'none';
          // Remove from DOM to prevent memory leaks
          if (cityDropdown.parentNode) {
            cityDropdown.parentNode.removeChild(cityDropdown);
          }
          cityDropdown = null;
        }, 200);
      }
    }
    
    // Area autocomplete
    areaInput.addEventListener('input', function() {
      clearTimeout(areaDebounceTimer);
      const query = this.value.trim();
      
      if (query.length < 2) {
        hideAreaDropdown();
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
            showAreaSuggestions(filteredAreas);
          } else {
            hideAreaDropdown();
          }
        } catch (error) {
          console.error('Error loading areas:', error);
        }
      }, 300);
    });
    
    // Show area suggestions
    function showAreaSuggestions(areas) {
      if (!areaDropdown) createAreaDropdown();
      
      // Calculate position relative to input
      const inputRect = areaInput.getBoundingClientRect();
      areaDropdown.style.left = inputRect.left + 'px';
      areaDropdown.style.top = (inputRect.bottom + 4) + 'px';
      areaDropdown.style.width = inputRect.width + 'px';
      areaDropdown.style.minWidth = '200px'; // Ensure minimum width
      
      areaDropdown.innerHTML = areas.map(area => `
        <div class="area-option px-4 py-2 hover:bg-neutral-700 cursor-pointer border-b border-neutral-600 last:border-b-0" data-area="${area}">
          ${area}
        </div>
      `).join('');
      
      // Add click listeners directly to each option
      const options = areaDropdown.querySelectorAll('.area-option');
      options.forEach(option => {
        option.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          const selectedArea = this.getAttribute('data-area');
          areaInput.value = selectedArea;
          hideAreaDropdown();
          
          // If no city is selected, try to find the city for this area
          if (!cityInput.value.trim()) {
            findCityForArea(selectedArea);
          }
        });
      });
      
      areaDropdown.style.display = 'block';
    }
    
    // Hide area dropdown
    function hideAreaDropdown() {
      if (areaDropdown) {
        areaDropdown.style.transition = 'all 0.2s ease';
        areaDropdown.style.opacity = '0';
        areaDropdown.style.transform = 'translateY(-10px)';
        
        setTimeout(() => {
          areaDropdown.style.display = 'none';
          // Remove from DOM to prevent memory leaks
          if (areaDropdown.parentNode) {
            areaDropdown.parentNode.removeChild(areaDropdown);
          }
          areaDropdown = null;
        }, 200);
      }
    }
    
    // Hide dropdowns when clicking outside
    document.addEventListener('click', function(e) {
      // Don't hide if clicking on dropdown options
      if (e.target.closest('.city-option') || e.target.closest('.area-option')) {
        return;
      }
      
      // Don't hide if clicking on the inputs themselves
      if (cityInput.contains(e.target) || areaInput.contains(e.target)) {
        return;
      }
      
      // Hide only if clicking outside both inputs and dropdowns
      if (!cityInput.contains(e.target) && (!cityDropdown || !cityDropdown.contains(e.target))) {
        hideCityDropdown();
      }
      if (!areaInput.contains(e.target) && (!areaDropdown || !areaDropdown.contains(e.target))) {
        hideAreaDropdown();
      }
    });
    
    // Update area dropdown for specific city
    async function updateAreaDropdownForCity(city) {
      try {
        const response = await fetch(`/api/areas?city=${encodeURIComponent(city)}`);
        const areas = await response.json();
        
        if (areas.length > 0) {
          showAreaSuggestions(areas);
        } else {
          // Show message that no areas found
          if (!areaDropdown) createAreaDropdown();
          
          const inputRect = areaInput.getBoundingClientRect();
          areaDropdown.style.left = inputRect.left + 'px';
          areaDropdown.style.top = (inputRect.bottom + 4) + 'px';
          areaDropdown.style.width = inputRect.width + 'px';
          areaDropdown.style.minWidth = '200px';
          
          areaDropdown.innerHTML = '<div class="px-4 py-2 text-neutral-400 text-sm">No areas found for this city</div>';
          areaDropdown.style.display = 'block';
          
          // Hide after 2 seconds
          setTimeout(() => {
            hideAreaDropdown();
          }, 2000);
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
  
    const masterInput = document.getElementById('masterName');
    const masterInputMobile = document.getElementById('masterNameMobile');
    
    if (!masterInput && !masterInputMobile) {
      return;
    }

    let employees = [];
    let masterDropdown;

    // Create dropdown container
    function createMasterDropdown() {

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
  
        const response = await fetch('/api/employees');
        employees = await response.json();

        
        // Make employees available globally for debugging
        window.allEmployees = employees;

        
        // Set default owner if available
        setDefaultOwner();
      } catch (error) {
        console.error('Γ¥î Error loading employees:', error);
      }
    }
    
    // Set default owner
    window.setDefaultOwner = function() {
      // First, check if there's a default employee configured in shop settings
      if (billingConfig && billingConfig.default_employee_id) {
        const defaultEmployee = employees.find(emp => 
          (emp.employee_id || emp.id) == billingConfig.default_employee_id
        );
        if (defaultEmployee) {
          // Set the default employee from shop settings
          if (masterInput) {
            masterInput.value = defaultEmployee.name;
            masterInput.setAttribute('data-selected-master', JSON.stringify({
              master_id: defaultEmployee.employee_id || defaultEmployee.id,
              master_name: defaultEmployee.name
            }));
          }
          
          if (masterInputMobile) {
            masterInputMobile.value = defaultEmployee.name;
            masterInputMobile.setAttribute('data-selected-master', JSON.stringify({
              master_id: defaultEmployee.employee_id || defaultEmployee.id,
              master_name: defaultEmployee.name
            }));
          }
          
          // Set global selected master ID
          window.selectedMasterId = defaultEmployee.employee_id || defaultEmployee.id;
          return;
        }
      }
      
      // Fallback to owner or first employee if no shop settings default
      const owner = employees.find(emp => emp.position === 'Owner');
      if (owner) {
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
        // Set owner as default
        
      } else {
        // If no owner found, set the first available employee as default
        if (employees.length > 0) {
          const firstEmployee = employees[0];

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
          console.log('Billing System: Set first employee as default:', firstEmployee.name);
          
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
      
      
      if (!masterDropdown) createMasterDropdown();
      
      if (!masterDropdown || !masterDropdown.style) return;
      
      // Calculate position relative to input
      const inputRect = activeInput.getBoundingClientRect();
      
      
      masterDropdown.style.left = inputRect.left + 'px';
      masterDropdown.style.top = (inputRect.bottom + 4) + 'px';
      masterDropdown.style.width = inputRect.width + 'px';
      masterDropdown.style.minWidth = '200px'; // Ensure minimum width
      

      
      masterDropdown.style.display = 'block';
      masterDropdown.style.opacity = '0';
      masterDropdown.style.transform = 'translateY(-10px)';
      
      // Animate in
      setTimeout(() => {
        if (masterDropdown && masterDropdown.style) {
        masterDropdown.style.transition = 'all 0.2s ease';
        masterDropdown.style.opacity = '1';
        masterDropdown.style.transform = 'translateY(0)';

        }
      }, 10);
    }

    // Hide dropdown
    function hideDropdown() {
      if (masterDropdown && masterDropdown.style) {
        masterDropdown.style.transition = 'all 0.2s ease';
        masterDropdown.style.opacity = '0';
        masterDropdown.style.transform = 'translateY(-10px)';
        
        setTimeout(() => {
          if (masterDropdown && masterDropdown.style) {
          masterDropdown.style.display = 'none';
          // Remove from DOM to prevent memory leaks
          if (masterDropdown.parentNode) {
            masterDropdown.parentNode.removeChild(masterDropdown);
          }
          masterDropdown = null;
          }
        }, 200);
      }
    }

    // Event listeners for desktop
    if (masterInput) {

      masterInput.addEventListener('input', function() {
 
        const query = this.value;
        const filteredEmployees = filterEmployees(query);
        
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

      
      masterInputMobile.addEventListener('input', function() {
        const query = this.value;
        const filteredEmployees = filterEmployees(query);
        
        if (filteredEmployees.length > 0) {
          renderDropdownOptions(filteredEmployees);
          showDropdown(this);
        } else {
          hideDropdown();
        }
      });

      masterInputMobile.addEventListener('focus', function() {
        if (this.value.trim()) {
          const filteredEmployees = filterEmployees(this.value);
          if (filteredEmployees.length > 0) {
            renderDropdownOptions(filteredEmployees);
            showDropdown(this);
          }
        }
      });
      
    }
    
    

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

    // Load billing configuration first, then employees
    async function initializeBillingSystem() {
      // Load billing configuration first
      await loadBillingConfiguration();
      
      // Then load employees (which will use the billing config)
      await loadEmployees();
    }
    
    // Initialize the billing system
    initializeBillingSystem();
  }

  // Make selected master ID available globally
  window.getSelectedMasterId = function() {
    return window.selectedMasterId;
  };

  // Test function for master dropdown
  window.testMasterDropdown = function() {
    if (masterInputMobile) {
      masterInputMobile.focus();
      masterInputMobile.value = 'test';
      masterInputMobile.dispatchEvent(new Event('input'));
    }
  };

  // Test function to check master selection status
  window.testMasterSelection = function() {
    const masterNameElement = document.getElementById('masterName');
    const masterNameMobileElement = document.getElementById('masterNameMobile');
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

        handleAddItem('mobile');
      });
    }
  }

  async function handleAddItem(formType) {
    
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
    const vatPercent = parseFloat(vatInput?.value) || 0;
    console.log('🔧 handleAddItem: VAT input value =', vatInput?.value, 'parsed VAT =', vatPercent);
    
    // Check if this product already exists in the bill
    const existingItemIndex = bill.findIndex(item => item.product_id === productId);
    
    
    if (existingItemIndex !== -1) {
      // Product already exists, show confirmation dialog
      const existingItem = bill[existingItemIndex];
      const newQuantity = existingItem.quantity + quantity;
      const newSubtotal = Math.round(newQuantity * price * 100) / 100;
      // Calculate discount amount from percentage
      const newDiscountAmount = Math.round((newSubtotal * discount / 100) * 100) / 100;
      const newTotal = Math.round((newSubtotal - newDiscountAmount) * 100) / 100;
      const newVatAmount = Math.round(newTotal * (vatPercent / 100) * 100) / 100;
      
      
      
      // Show modern confirmation dialog
      
      
      let confirmed;
      if (typeof showConfirmDialog !== 'function') {
        console.error('showConfirmDialog is not available!');
        // Fallback to simple confirm
        confirmed = confirm(`"${productName}" is already in the bill. Would you like to increase the quantity?`);
        
      } else {
        confirmed = await showConfirmDialog(
          `"${productName}" is already in the bill with quantity ${existingItem.quantity}.<br><br>Would you like to increase the quantity to ${newQuantity} instead of adding a duplicate item?`,
          'Product Already Added',
          'info'
        );

      }
      
      if (confirmed) {
        
        // Update existing item with new quantity and recalculate totals
        bill[existingItemIndex] = {
          ...existingItem,
          quantity: newQuantity,
          rate: price, // Update rate in case it changed (changed from 'price' to 'rate')
          discount: discount,
          advance_paid: window.paymentMode === 'full' ? 0 : advance, // Set to 0 if full payment mode
          vat_percent: vatPercent,
          vat_amount: newVatAmount,
          subtotal: newSubtotal,
          total: newTotal
        };
        
        
        
        // Update display
        renderBillTable();
        updateTotals();
        
        // Clear form fields
        clearBillingForm(formType);
        
        // Show success message
        showSimpleToast('Quantity updated', 'success');
        
        // Focus back to product input
        setTimeout(() => {
          if (productInput) {
            productInput.focus();
          }
        }, 500);
      } else {
        
      }
      return;
    }
    
    // Calculate total with better precision
    const subtotal = Math.round(quantity * price * 100) / 100;
    // Calculate discount amount from percentage
    const discountAmount = Math.round((subtotal * discount / 100) * 100) / 100;
    const total = Math.round((subtotal - discountAmount) * 100) / 100;
    const vatAmount = Math.round(total * (vatPercent / 100) * 100) / 100;
    console.log('🔧 handleAddItem: VAT calculation - total =', total, 'vatPercent =', vatPercent, 'vatAmount =', vatAmount);
    
    // Add item to bill
    const item = {
      product_id: productId,
      product_name: productName,
      quantity: quantity,
      rate: price, // Changed from 'price' to 'rate' to match backend expectation
      discount: discount,
              advance_paid: window.paymentMode === 'full' ? 0 : advance, // Set to 0 if full payment mode
      vat_percent: vatPercent,
      vat_amount: vatAmount,
      subtotal: subtotal, // Store subtotal (before discount)
      total: total // Store final total (after discount)
    };
    
    
    bill.push(item);
    
    // Update display
    renderBillTable();
    updateTotals();
    
    // Clear form fields with better UX
    clearBillingForm(formType);
    
    // Show success message with better feedback
    showSimpleToast('Item added', 'success');
    
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
  async function resetBillingForm() {
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
    await setBasicDefaultDates();
    
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
      // Use default VAT from configuration if available
      const defaultVat = window.getDefaultVatPercent ? window.getDefaultVatPercent() : 5;
      vatInput.value = defaultVat;
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
                    <button class="reprint-btn bg-indigo-600 hover:bg-indigo-500 text-white rounded px-3 py-1" data-id="${bill.bill_id}">Print</button>
                    <button class="whatsapp-btn bg-green-600 hover:bg-green-500 text-white rounded px-3 py-1" data-id="${bill.bill_id}">Send WhatsApp</button>
                    ${(bill.status === 'Pending' || (bill.balance_amount && bill.balance_amount > 0)) ? `<button class="mark-paid-btn bg-green-600 hover:bg-green-500 text-white rounded px-3 py-1" data-id="${bill.bill_id}" data-balance="${bill.balance_amount}">Mark Paid</button>` : ''}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>`
        : '<div class="text-neutral-400 text-center py-4">No invoices found matching your search.</div>';
    });
    
    // Combined Reprint, WhatsApp, and Mark as Paid functionality
    document.getElementById('searchInvoiceResults')?.addEventListener('click', async function(e) {
      const reprintBtn = e.target.closest('.reprint-btn');
      const whatsappBtn = e.target.closest('.whatsapp-btn');
      const payBtn = e.target.closest('.mark-paid-btn');
      
      // Handle Reprint functionality
      if (reprintBtn) {
        const billId = reprintBtn.getAttribute('data-id');
        window.open(`/api/bills/${billId}/print`, '_blank');
        return; // Prevent further processing
      }
      
      // Handle WhatsApp functionality
      if (whatsappBtn) {
        const billId = whatsappBtn.getAttribute('data-id');
        try {
          // First get the bill details to get customer phone
          const billResponse = await fetch(`/api/bills/${billId}`);
          if (!billResponse.ok) {
            showModernAlert('Failed to get bill details', 'error');
            return;
          }
          
          const billData = await billResponse.json();
          const customerPhone = billData.bill?.customer_phone || '';
          
          if (!customerPhone) {
            showModernAlert('Customer phone number not found for this bill', 'error');
            return;
          }
          
          // Now call the WhatsApp endpoint with required parameters
          const response = await fetch(`/api/bills/${billId}/whatsapp`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              phone: customerPhone,
              language: 'en' // Default to English
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.whatsapp_url) {
              window.open(data.whatsapp_url, '_blank');
            }
          } else {
            const errorData = await response.json();
            showModernAlert(errorData.error || 'Failed to generate WhatsApp link', 'error');
          }
        } catch (error) {
          console.error('WhatsApp error:', error);
          showModernAlert('Error generating WhatsApp link', 'error');
        }
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
            try {
            payBtn.disabled = true;
            payBtn.textContent = 'Processing...';
              
              // Add timeout to prevent hanging
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
              
            const resp = await fetch(`/api/bills/${billId}/payment`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount_paid: amount }),
                signal: controller.signal
            });
              
              clearTimeout(timeoutId);
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
            } catch (error) {
              console.error('Payment processing error:', error);
              if (error.name === 'AbortError') {
                showModernAlert('Payment request timed out. Please try again.', 'error');
              } else {
                showModernAlert('Failed to process payment. Please try again.', 'error');
              }
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
          try {
          window.TajirPWA.mobileBilling.showMobileBilling();
          } catch (error) {
            console.error('Error showing mobile billing:', error);
            showModernAlert('Mobile billing encountered an error. Please try again.', 'error', 'Error');
          }
        } else {
          console.warn('Mobile billing not available');
          showModernAlert('Mobile billing is not available. Please refresh the page.', 'warning', 'Feature Unavailable');
        }
      });
    }

    // Setup Mobile Billing V3 Toggle
    const mobileBillingToggleV3 = document.getElementById('mobileBillingToggleV3');
    if (mobileBillingToggleV3) {
      mobileBillingToggleV3.addEventListener('click', function() {
        console.log('Mobile Billing V3 Toggle clicked');
        // Show mobile billing V3 interface
        if (window.mobileBillingV3) {
          try {
            window.mobileBillingV3.show();
          } catch (error) {
            console.error('Error showing mobile billing V3:', error);
            showModernAlert('Mobile billing V3 encountered an error. Please try again.', 'error', 'Error');
          }
        } else {
          console.warn('Mobile billing V3 not available');
          showModernAlert('Mobile billing V3 is not available. Please refresh the page.', 'warning', 'Feature Unavailable');
        }
      });
    }

    // Setup Mobile Billing Banner
    const mobileBillingBannerBtn = document.getElementById('mobileBillingBannerBtn');
    if (mobileBillingBannerBtn) {
      mobileBillingBannerBtn.addEventListener('click', function() {
        if (window.mobileBillingV3) {
          try {
            window.mobileBillingV3.show();
            // Hide the banner after clicking
            const banner = document.getElementById('mobileBillingBanner');
            if (banner) {
              banner.style.opacity = '0';
              banner.style.transform = 'translateY(-20px)';
              setTimeout(() => {
                banner.style.display = 'none';
              }, 300);
            }
          } catch (error) {
            console.error('Error showing mobile billing V3 from banner:', error);
            showModernAlert('Mobile billing encountered an error. Please try again.', 'error', 'Error');
          }
        } else {
          console.warn('Mobile billing V3 not available');
          showModernAlert('Mobile billing is not available. Please refresh the page.', 'warning', 'Feature Unavailable');
        }
      });
    }

    // Auto-hide mobile billing banner after 10 seconds
    const mobileBillingBanner = document.getElementById('mobileBillingBanner');
    if (mobileBillingBanner) {
      setTimeout(() => {
        mobileBillingBanner.style.opacity = '0';
        mobileBillingBanner.style.transform = 'translateY(-20px)';
        setTimeout(() => {
          mobileBillingBanner.style.display = 'none';
        }, 300);
      }, 10000);
    }
  }



  // Setup VAT input change listeners
  function setupVatInputListeners() {
    const vatInputs = [
      document.getElementById('vatPercent'),
      document.getElementById('vatPercentMobile')
    ];
    
    vatInputs.forEach(input => {
      if (input) {
        input.addEventListener('input', () => {
          if (window.onVatInputChange) {
            window.onVatInputChange();
          }
          // Also update the VAT label in the summary
          updateVatSummaryLabel();
        });
      }
    });
  }
  
  // Update VAT summary label
  function updateVatSummaryLabel() {
    const vatLabel = document.getElementById('vatLabel');
    const vatInput = document.getElementById('vatPercent') || document.getElementById('vatPercentMobile');
    
    if (vatLabel && vatInput) {
      const vatPercent = parseFloat(vatInput.value) || 0;
      vatLabel.textContent = `Tax (${vatPercent}%):`;
    }
  }

  // Setup Print Button functionality
  function setupPrintButton() {
    const printBtn = document.getElementById('printBtn');
    if (printBtn) {
      printBtn.addEventListener('click', async function() {
    
        
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

        // Check if bill is already saved
        let billId = window.currentBillId;
        
        // If bill is not saved, save it first
        if (!billId) {
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
        
        // Check if VAT should be displayed based on configuration
        const shouldShowVat = window.shouldDisplayVat ? window.shouldDisplayVat(totalVat > 0 ? 1 : 0) : true;
        
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
            should_show_vat: shouldShowVat, // Flag for VAT display
            total_amount: amountDue,
            advance_paid: totalAdvance,
            balance_amount: amountDue
          },
          items: bill
        };

        try {
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
              // Store the current bill ID
              window.currentBillId = saveResult.bill_id;
              billId = saveResult.bill_id;
              
              // Update bill number field with the actual bill number from response
              if (saveResult.bill_number) {
                const billNumberElement = document.getElementById('billNumber');
                if (billNumberElement) {
                  billNumberElement.value = saveResult.bill_number;
                }
              }
            
            // Show success message
              showSimpleToast('Bill saved successfully!', 'success');
          } else {
            showModernAlert('Failed to save bill', 'error', 'Save Failed');
              return;
          }
        } catch (error) {
          console.error('Error saving bill:', error);
          showModernAlert('Failed to save bill. Please try again.', 'error', 'Save Failed');
            return;
          }
        }

        // Now print the bill using the existing bill ID
        if (billId) {
          // Open print window
          window.open(`/api/bills/${billId}/print`, '_blank');
          
          // Show success message
          showSimpleToast('Print window opened', 'success');
          
          // Reset the billing form after printing
          setTimeout(async () => {
            await resetBillingForm();
            // Clear the current bill ID
            window.currentBillId = null;
          }, 1000); // Small delay to ensure print window opens first
        } else {
          showModernAlert('Failed to get bill ID for printing', 'error', 'Print Failed');
        }
      });
    }
  }

  // Initialize billing system
  loadBillingConfiguration(); // Load billing configuration first
  setupMobileCustomerFetch();
  setupCustomerTypeHandler();
  loadRecentCustomers(); // Load recent customers for quick selection
  initializeMobileRecentCustomers(); // Initialize mobile recent customers
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
  
  // Initialize VAT configuration
  if (window.initVatConfig) {
    window.initVatConfig();
  }
  
  // Setup VAT input change listeners
  setupVatInputListeners();
  
  // Initialize Save Bill and WhatsApp functionality
  initializeSaveBill();
  initializeWhatsApp();
  
  // Initialize payment mode
  initializePaymentMode();
  

  
  
  
  // Initialize payment mode
  async function initializePaymentMode() {
    try {
      const response = await fetch('/api/shop-settings/payment-mode');
      const data = await response.json();
      
      if (data.success) {
        const paymentMode = data.payment_mode;
        window.paymentMode = paymentMode; // Store globally
        
        // Hide/show advance payment fields based on mode
        const advanceFields = [
          document.getElementById('billAdvPaid'),
          document.getElementById('billAdvPaidMobile')
        ];
        
        const advanceLabels = [
          document.querySelector('label[for="billAdvPaid"]'),
          document.querySelector('label[for="billAdvPaidMobile"]')
        ];
        
        if (paymentMode === 'full') {
          // Keep advance payment fields visible but disable them
          advanceFields.forEach(field => {
            if (field) {
              field.style.display = '';
              field.disabled = true;
              field.value = '0';
            }
          });
          
          advanceLabels.forEach(label => {
            if (label) {
              label.style.display = '';
            }
          });
          
          // Keep table header visible
          const advHeader = document.getElementById('advHeader');
          if (advHeader) {
            advHeader.style.display = '';
          }
          
          // Update the "Total Amount Paid" label for full payment mode
          const totalAmountLabel = document.querySelector('.bill-summary-row:last-child .text-neutral-400');
          if (totalAmountLabel) {
            totalAmountLabel.textContent = 'Total Amount Paid:';
          }
          
          // Desktop repositioning - reduce Product field and fit Add button in same row
          const billProduct = document.getElementById('billProduct');
          const billRate = document.getElementById('billRate');
          const billQty = document.getElementById('billQty');
          const billDiscount = document.getElementById('billDiscount');
          const vatPercent = document.getElementById('vatPercent');
          const addItemBtn = document.getElementById('addItemBtn');
          
          if (billProduct && billProduct.parentElement) {
            billProduct.parentElement.className = 'col-span-5 flex flex-col';
          }
          if (billRate && billRate.parentElement) {
            billRate.parentElement.className = 'col-span-1 flex flex-col';
          }
          if (billQty && billQty.parentElement) {
            billQty.parentElement.className = 'col-span-1 flex flex-col';
          }
          if (billDiscount && billDiscount.parentElement) {
            billDiscount.parentElement.className = 'col-span-1 flex flex-col';
          }
          if (vatPercent && vatPercent.parentElement) {
            vatPercent.parentElement.className = 'col-span-1 flex flex-col';
          }
          if (addItemBtn) {
            addItemBtn.className = 'col-span-2 modern-btn modern-btn-primary self-end h-8 text-sm';
          }
          
          // Set all advance payments to 0
          bill.forEach(item => {
            item.advance_paid = 0;
          });
          
          // Update totals
          updateTotals();
        } else {
          // Show and enable advance payment fields
          advanceFields.forEach(field => {
            if (field) {
              field.style.display = '';
              field.disabled = false;
              field.value = '';
            }
          });
          
          advanceLabels.forEach(label => {
            if (label) {
              label.style.display = '';
            }
          });
          
          // Show table header
          const advHeader = document.getElementById('advHeader');
          if (advHeader) {
            advHeader.style.display = '';
          }
          
          // Reset desktop layout for advance payment mode
          const billProduct = document.getElementById('billProduct');
          const billRate = document.getElementById('billRate');
          const billQty = document.getElementById('billQty');
          const billDiscount = document.getElementById('billDiscount');
          const vatPercent = document.getElementById('vatPercent');
          const addItemBtn = document.getElementById('addItemBtn');
          
          if (billProduct && billProduct.parentElement) {
            billProduct.parentElement.className = 'col-span-5 flex flex-col';
          }
          if (billRate && billRate.parentElement) {
            billRate.parentElement.className = 'col-span-1 flex flex-col';
          }
          if (billQty && billQty.parentElement) {
            billQty.parentElement.className = 'col-span-1 flex flex-col';
          }
          if (billDiscount && billDiscount.parentElement) {
            billDiscount.parentElement.className = 'col-span-1 flex flex-col';
          }
          if (vatPercent && vatPercent.parentElement) {
            vatPercent.parentElement.className = 'col-span-1 flex flex-col';
          }
          if (addItemBtn) {
            addItemBtn.className = 'col-span-2 modern-btn modern-btn-primary self-end h-8 text-sm';
          }
          
          // Update the "Total Amount Paid" label for advance payment mode
          const totalAmountLabel = document.querySelector('.bill-summary-row:last-child .text-neutral-400');
          if (totalAmountLabel) {
            totalAmountLabel.textContent = 'Total Amount Due:';
          }
        }
      }
    } catch (error) {
      console.error('Error loading payment mode:', error);
      // Default to advance mode if error
      window.paymentMode = 'advance';
    }
  }
  
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
    
    // Clear current bill ID to allow new bill creation
    window.currentBillId = null;
    
    // Reset form fields
    const form = document.getElementById('billingForm');
    if (form) {
      form.reset();
    }
    
    // Set fresh defaults
    await setDefaultBillingDates();
    await setBasicDefaultDates();
  };
  
  window.editBillItem = function(index) {
    const item = bill[index];
    if (!item) {
      return;
    }
    
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
    }
    
    if (billQuantityMobileElement) {
      billQuantityMobileElement.value = item.quantity;
    }
    
    if (billPriceMobileElement) {
      billPriceMobileElement.value = item.rate; // Changed from item.price to item.rate
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

  // Save Bill functionality
  function initializeSaveBill() {
    setTimeout(() => {
      const saveBillBtn = document.getElementById('saveBillBtn');
      
      if (saveBillBtn) {
        saveBillBtn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          handleSaveBillClick();
        });
      }
    }, 1000);
  }

  // WhatsApp functionality
  function initializeWhatsApp() {
      const whatsappBtn = document.getElementById('whatsappBtn');
      
      if (whatsappBtn) {
      // Remove any existing event listeners to prevent duplicates
      whatsappBtn.removeEventListener('click', handleWhatsAppClick);
        whatsappBtn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          handleWhatsAppClick();
        });
      }
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
    
    // Ensure items use the current VAT percent
    const vatInputEl = document.getElementById('vatPercent') || document.getElementById('vatPercentMobile');
    const currentVatPercent = parseFloat(vatInputEl?.value) || 0;
    bill.forEach((it) => {
      const rate = parseFloat(it.rate) || 0;
      const quantity = parseInt(it.quantity) || 0;
      const discount = parseFloat(it.discount) || 0;
      const subtotalBeforeDiscount = rate * quantity;
      const discountAmount = (subtotalBeforeDiscount * discount) / 100;
      const totalAfterDiscount = subtotalBeforeDiscount - discountAmount;
      it.vat_percent = currentVatPercent;
      it.vat_amount = (totalAfterDiscount * currentVatPercent) / 100;
      it.total = totalAfterDiscount + it.vat_amount;
    });

    // Calculate totals from bill array (same logic as updateTotals function)
    const subtotal = bill.reduce((sum, item) => sum + item.total, 0); // Total after discount (incl. VAT per item)
    const totalAdvance = bill.reduce((sum, item) => sum + (item.advance_paid || 0), 0);
    const totalVat = bill.reduce((sum, item) => sum + (item.vat_amount || 0), 0); // Sum of individual VAT amounts
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
        vat_percent: currentVatPercent,
        total_amount: amountDue,
        advance_paid: totalAdvance,
        balance_amount: amountDue
      },
      items: bill
    };

    return billData;
  }

  async function handleSaveBillClick() {
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
        
        // Update bill number field with the actual bill number from response
        if (saveResult.bill_number) {
          const billNumberElement = document.getElementById('billNumber');
          if (billNumberElement) {
            billNumberElement.value = saveResult.bill_number;
          }
        }
        
        // Show success message
        if (window.showSimpleToast) {
          window.showSimpleToast('Bill saved successfully!', 'success');
        }
        
        // Update button text to show saved status
        const saveBillBtn = document.getElementById('saveBillBtn');
        if (saveBillBtn) {
          saveBillBtn.innerHTML = '<svg data-lucide="check" class="w-4 h-4"></svg> Saved';
          saveBillBtn.classList.remove('bg-yellow-600', 'hover:bg-yellow-500');
          saveBillBtn.classList.add('bg-green-600', 'hover:bg-green-500');
          
          // Reset button after 3 seconds
          setTimeout(() => {
            saveBillBtn.innerHTML = '<svg data-lucide="save" class="w-4 h-4"></svg> Save Invoice';
            saveBillBtn.classList.remove('bg-green-600', 'hover:bg-green-500');
            saveBillBtn.classList.add('bg-yellow-600', 'hover:bg-yellow-500');
          }, 3000);
        }
        
      } else {
        if (window.showSimpleToast) {
          window.showSimpleToast('Failed to save bill', 'error');
        }
      }
      
    } catch (error) {
      console.error('Error saving bill:', error);
      if (window.showSimpleToast) {
        window.showSimpleToast('Failed to save bill. Please try again.', 'error');
      }
    }
  }

  async function handleWhatsAppClick() {
    try {
    // Check if there are items in the bill
    if (bill.length === 0) {
      if (window.showSimpleToast) {
        window.showSimpleToast('Please add items to the bill first', 'warning');
      }
      return;
    }
    
      // Check if customer mobile is provided
      const customerMobile = document.getElementById('billMobile')?.value?.trim();
      if (!customerMobile) {
        if (window.showSimpleToast) {
          window.showSimpleToast('Please enter customer mobile number to send WhatsApp', 'warning');
        }
        // Focus on the mobile field
        const mobileField = document.getElementById('billMobile');
        if (mobileField) {
          mobileField.focus();
          mobileField.style.borderColor = '#ef4444';
          setTimeout(() => {
            mobileField.style.borderColor = '';
          }, 3000);
        }
        return;
      }
    
      let billId = window.currentBillId; // Check if bill is already saved
      let billData = null;
      
      // If bill is not saved, ask user if they want to save it first
      if (!billId) {
        const shouldSave = confirm('Would you like to save this bill before sending WhatsApp? This will create a permanent record.');
        if (shouldSave) {
          // Save the bill first
          billData = await prepareBillData();
          if (!billData) {
            if (window.showSimpleToast) {
              window.showSimpleToast('Failed to prepare bill data', 'error');
            }
            return;
          }
          
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
            billId = saveResult.bill_id;
            window.currentBillId = billId;
            
            // Update save button to show saved status
            const saveBillBtn = document.getElementById('saveBillBtn');
            if (saveBillBtn) {
              saveBillBtn.innerHTML = '<svg data-lucide="check" class="w-4 h-4"></svg> Saved';
              saveBillBtn.classList.remove('bg-yellow-600', 'hover:bg-yellow-500');
              saveBillBtn.classList.add('bg-green-600', 'hover:bg-green-500');
            }
          } else {
            if (window.showSimpleToast) {
              window.showSimpleToast('Failed to save bill', 'error');
            }
            return;
          }
        } else {
          // Use draft bill data for WhatsApp
          billData = await prepareBillData();
          if (!billData) {
            if (window.showSimpleToast) {
              window.showSimpleToast('Failed to prepare bill data', 'error');
            }
            return;
          }
        }
      }
      
      // If we have a saved bill, use the API endpoint
      if (billId) {
        const customerPhone = document.getElementById('billMobile')?.value?.trim() || '';
        
        if (!customerPhone) {
          if (window.showSimpleToast) {
            window.showSimpleToast('Please enter customer mobile number to send WhatsApp', 'warning');
          }
          return;
        }
        
        // Use the existing WhatsApp API endpoint
        const whatsappResponse = await fetch(`/api/bills/${billId}/whatsapp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: customerPhone,
            language: 'en'
          })
        });
        
        if (!whatsappResponse.ok) {
          const errorData = await whatsappResponse.json();
          throw new Error(errorData.error || 'Failed to generate WhatsApp link');
        }
        
        const whatsappResult = await whatsappResponse.json();
        
        if (whatsappResult.success && whatsappResult.whatsapp_url) {
          window.open(whatsappResult.whatsapp_url, '_blank');
          
          // Also open printable invoice in new tab using existing endpoint
          const printUrl = `${window.location.origin}/api/bills/${billId}/print`;
          window.open(printUrl, '_blank');
          
          if (window.showSimpleToast) {
            window.showSimpleToast('WhatsApp opened with bill details!', 'success');
          }
          
          // Reset the billing form after successful WhatsApp send
          await resetBillingForm();
        } else {
          throw new Error('Failed to generate WhatsApp link');
        }
      } else {
        // Use draft bill data to create WhatsApp message
        const customerName = billData.bill.customer_name || 'Customer';
        const customerPhone = billData.bill.customer_phone || '';
        const totalAmount = billData.bill.total_amount || '0';
        const billNumber = billData.bill.bill_number || 'Draft';
        const billDate = billData.bill.bill_date || '';
        const subtotal = billData.bill.subtotal || '0';
        const vatAmount = billData.bill.vat_amount || '0';
        const advancePaid = billData.bill.advance_paid || '0';
        const balanceAmount = billData.bill.balance_amount || '0';
        
        // Create detailed bill message
        let message = `*🧾 TAJIR POS - DRAFT BILL*\n\n`;
        message += `*Customer Details:*\n`;
        message += `• Name: ${customerName}\n`;
        if (customerPhone) message += `• Phone: ${customerPhone}\n\n`;
        
        message += `*Bill Details:*\n`;
        message += `• Bill #: ${billNumber} (Draft)\n`;
        message += `• Date: ${billDate}\n\n`;
        
        // Add items details
        if (billData.items && billData.items.length > 0) {
          message += `*Items:*\n`;
          billData.items.forEach((item, index) => {
            message += `${index + 1}. ${item.product_name} - Qty: ${item.quantity} - Rate: ${item.rate} - Total: ${item.total}\n`;
          });
          message += `\n`;
        }
        
        message += `*Bill Summary:*\n`;
                    message += `• Subtotal: ${subtotal}\n`;
            message += `• VAT: ${vatAmount}\n`;
            message += `• Advance Paid: ${advancePaid}\n`;
            message += `• Balance Amount: ${balanceAmount}\n`;
            message += `*Total Amount: ${totalAmount}*\n\n`;
        message += `*Note: This is a draft bill. Please save it in the POS system for permanent record.*`;
        
        // Encode the message for WhatsApp
        const encodedMessage = encodeURIComponent(message);
        
        // Construct WhatsApp URL
        let whatsappUrl;
        if (customerPhone) {
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
          
          whatsappUrl = `https://wa.me/${phoneWithCode}?text=${encodedMessage}`;
        } else {
          whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
        }
        
        window.open(whatsappUrl, '_blank');
        
        if (window.showSimpleToast) {
          window.showSimpleToast('WhatsApp opened with draft bill details!', 'success');
        }
        
        // Reset the billing form after successful WhatsApp send (draft case)
        await resetBillingForm();
      }
      
    } catch (error) {
      console.error('Error handling WhatsApp:', error);
      if (window.showSimpleToast) {
        window.showSimpleToast('Failed to send WhatsApp. Please try again.', 'error');
      }
    }
  }

  // Function to update bill item fields inline
  window.updateBillItemField = function(index, field, value) {
    const item = bill[index];
    if (!item) return;
    
    // Convert value to appropriate type
    let parsedValue;
    if (field === 'quantity') {
      parsedValue = parseInt(value) || 1;
      if (parsedValue < 1) parsedValue = 1;
    } else {
      parsedValue = parseFloat(value) || 0;
      if (parsedValue < 0) parsedValue = 0;
    }
    
    // Update the field
    item[field] = parsedValue;
    
    // Recalculate totals for this item
    const rate = parseFloat(item.rate) || 0;
    const quantity = parseInt(item.quantity) || 0;
    const discount = parseFloat(item.discount) || 0;
    const vatPercent = parseFloat(item.vat_percent) || 5;
    
    // Calculate subtotal (before discount)
    const subtotal = rate * quantity;
    
    // Calculate discount amount from percentage
    const discountAmount = (subtotal * discount / 100);
    
    // Calculate total after discount
    const totalAfterDiscount = subtotal - discountAmount;
    
    // Calculate VAT amount
    const vatAmount = (totalAfterDiscount * vatPercent) / 100;
    
    // Calculate final total
    const total = totalAfterDiscount + vatAmount;
    
    // Update item totals
    item.total = total;
    item.vat_amount = vatAmount;
    
    // Re-render table and update totals
    renderBillTable();
    updateTotals();
    
    // Show success message
    if (window.showSimpleToast) {
      window.showSimpleToast(`${field.charAt(0).toUpperCase() + field.slice(1)} updated!`, 'success');
    }
  };

  // Expose functions globally for debugging
  window.initializeSaveBill = initializeSaveBill;
  window.initializeWhatsApp = initializeWhatsApp;
  window.handleSaveBillClick = handleSaveBillClick;
  window.handleWhatsAppClick = handleWhatsAppClick;
  window.prepareBillData = prepareBillData;
}

// Loyalty helpers inside module scope
async function renderLoyaltySummary(customerId) {
  try {
    const summary = document.getElementById('loyaltySummary');
    const tierBadge = document.getElementById('loyaltyTierBadge');
    const pointsText = document.getElementById('loyaltyPointsText');
    const enrollBtn = document.getElementById('loyaltyEnrollBtn');
    const note = document.getElementById('loyaltyNote');
    if (!summary || !tierBadge || !pointsText || !enrollBtn || !note) return;

    // Load current user id via existing session endpoints isn't trivial here; just call the loyalty profile API
    const resp = await fetch(`/api/loyalty/customers/${customerId}`);
    
    // Check if response is successful (200) or not found (404)
    if (resp.ok) {
      const data = await resp.json();
      if (data && data.success) {
        const lp = data.loyalty_profile || {};
        summary.classList.remove('hidden');
        tierBadge.textContent = lp.tier_level || 'Bronze';
        pointsText.textContent = `Points: ${lp.available_points ?? 0}`;
        enrollBtn.classList.add('hidden');
        note.textContent = `Lifetime: ${lp.total_points ?? 0} • Purchases: ${lp.total_purchases ?? 0}`;
      } else {
        // API returned success: false
        showNotEnrolledState();
      }
    } else if (resp.status === 404) {
      // Customer not enrolled - this is expected for new customers
      showNotEnrolledState();
    } else {
      // Other error
      console.error('Loyalty API error:', resp.status, resp.statusText);
      showNotEnrolledState();
    }
    
    function showNotEnrolledState() {
      summary.classList.remove('hidden');
      tierBadge.textContent = 'Not enrolled';
      pointsText.textContent = 'Points: 0';
      enrollBtn.classList.remove('hidden');
      note.textContent = 'Enroll this customer to start earning points.';
      enrollBtn.onclick = async () => {
        try {
          const res = await fetch(`/api/loyalty/customers/${customerId}/enroll`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
          const j = await res.json();
          if (j && j.success) {
            if (window.showSimpleToast) window.showSimpleToast('Customer enrolled in loyalty', 'success');
            await renderLoyaltySummary(customerId);
          } else {
            if (window.showModernAlert) window.showModernAlert(j.error || 'Failed to enroll', 'error');
          }
        } catch (e) {
          console.error('Enroll failed', e);
        }
      };
    }
  } catch (e) {
    console.error('Loyalty summary error', e);
    // Show not enrolled state on any error
    const summary = document.getElementById('loyaltySummary');
    const tierBadge = document.getElementById('loyaltyTierBadge');
    const pointsText = document.getElementById('loyaltyPointsText');
    const enrollBtn = document.getElementById('loyaltyEnrollBtn');
    const note = document.getElementById('loyaltyNote');
    
    if (summary && tierBadge && pointsText && enrollBtn && note) {
      summary.classList.remove('hidden');
      tierBadge.textContent = 'Not enrolled';
      pointsText.textContent = 'Points: 0';
      enrollBtn.classList.remove('hidden');
      note.textContent = 'Enroll this customer to start earning points.';
    }
  }
}



// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      // First, load billing configuration
      await loadBillingConfiguration();
      
      // Apply configuration to show/hide fields
      applyBillingConfiguration();
      
      // Then call the original initialization
      initializeBillingSystem();
      // Attach VAT listeners
      try { attachVatChangeListeners(); } catch(e) {}
    } catch (error) {
      console.error('Error in async billing initialization:', error);
      // Fallback to original initialization
      initializeBillingSystem();
      try { attachVatChangeListeners(); } catch(e) {}
    }
  });
} else {
  // DOM is already loaded, run async initialization
  (async () => {
    try {
      // First, load billing configuration
      await loadBillingConfiguration();
      
      // Apply configuration to show/hide fields
      applyBillingConfiguration();
      
      // Then call the original initialization
      initializeBillingSystem();
      try { attachVatChangeListeners(); } catch(e) {}
    } catch (error) {
      console.error('Error in async billing initialization:', error);
      // Fallback to original initialization
      initializeBillingSystem();
      try { attachVatChangeListeners(); } catch(e) {}
    }
  })();
}

// VAT Functions - Global Scope
function recalcAllItemsForCurrentVat() {
  console.log('🚀 recalcAllItemsForCurrentVat function called!');
  
  const vatInput = document.getElementById('vatPercent') || document.getElementById('vatPercentMobile');
  const currentVat = parseFloat(vatInput?.value) || 0;
  
  console.log(`🔄 Recalculating VAT for all items with ${currentVat}%`);
  console.log(`VAT Input element:`, vatInput);
  console.log(`VAT Input value:`, vatInput?.value);
  
  // Try multiple ways to access the bill array
  let billArray = null;
  
  if (typeof bill !== 'undefined' && Array.isArray(bill)) {
    billArray = bill;
    console.log('✓ Found bill array:', billArray.length, 'items');
  } else if (typeof window.bill !== 'undefined' && Array.isArray(window.bill)) {
    billArray = window.bill;
    console.log('✓ Found window.bill array:', billArray.length, 'items');
  } else {
    console.error('❌ Bill array not found. Available globals:', Object.keys(window).filter(k => k.includes('bill')));
    return;
  }
  
  if (billArray && billArray.length > 0) {
    billArray.forEach((it, index) => {
      const rate = parseFloat(it.rate) || 0;
      const quantity = parseInt(it.quantity) || 0;
      const discount = parseFloat(it.discount) || 0;
      const subtotalBeforeDiscount = rate * quantity;
      const discountAmount = (subtotalBeforeDiscount * discount) / 100;
      const afterDiscount = subtotalBeforeDiscount - discountAmount;
      
      // Update VAT values
      it.vat_percent = currentVat;
      it.vat_amount = (afterDiscount * currentVat) / 100;
      it.total = afterDiscount + it.vat_amount;
      
      console.log(`Item ${index}: Rate=${rate}, Qty=${quantity}, Discount=${discount}%, VAT=${currentVat}%, VAT Amount=${it.vat_amount}, Total=${it.total}`);
    });
    
    // Call global functions if they exist
    if (typeof renderBillTable === 'function') {
      renderBillTable();
      console.log('✓ Bill table re-rendered');
    } else {
      console.error('❌ renderBillTable function not found');
    }
    
    if (typeof updateTotals === 'function') {
      updateTotals();
      console.log('✓ Totals updated');
    } else {
      console.error('❌ updateTotals function not found');
    }
    
    // Also update VAT display
    if (typeof updateVatDisplay === 'function') {
      updateVatDisplay();
      console.log('✓ VAT display updated');
    } else {
      console.error('❌ updateVatDisplay function not found');
    }
  } else {
    console.error('❌ Bill array is empty or not accessible');
  }
}

function attachVatChangeListeners() {
  const vatEls = [document.getElementById('vatPercent'), document.getElementById('vatPercentMobile')].filter(Boolean);
  console.log(`Found ${vatEls.length} VAT input elements:`, vatEls.map(el => el.id));
  
  vatEls.forEach((el) => {
    el.removeEventListener('input', recalcAllItemsForCurrentVat);
    el.addEventListener('input', recalcAllItemsForCurrentVat);
    el.removeEventListener('change', recalcAllItemsForCurrentVat);
    el.addEventListener('change', recalcAllItemsForCurrentVat);
    el.removeEventListener('blur', recalcAllItemsForCurrentVat);
    el.addEventListener('blur', recalcAllItemsForCurrentVat);
    console.log(`✓ VAT change listeners attached to ${el.id}`);
  });
  
  // Also try to attach listeners with a delay in case elements are not ready
  setTimeout(() => {
    const delayedVatEls = [document.getElementById('vatPercent'), document.getElementById('vatPercentMobile')].filter(Boolean);
    delayedVatEls.forEach((el) => {
      el.removeEventListener('input', recalcAllItemsForCurrentVat);
      el.addEventListener('input', recalcAllItemsForCurrentVat);
      el.removeEventListener('change', recalcAllItemsForCurrentVat);
      el.addEventListener('change', recalcAllItemsForCurrentVat);
      el.removeEventListener('blur', recalcAllItemsForCurrentVat);
      el.addEventListener('blur', recalcAllItemsForCurrentVat);
    });
    console.log(`✓ Delayed VAT change listeners attached to ${delayedVatEls.length} elements`);
  }, 1000);
}

// Test function to verify event listeners are working
function testVatEventListeners() {
  console.log('🧪 Testing VAT event listeners...');
  const vatInput = document.getElementById('vatPercent');
  if (vatInput) {
    console.log('VAT input found:', vatInput);
    console.log('VAT input value:', vatInput.value);
    
    // Simulate a change event
    const event = new Event('change', { bubbles: true });
    vatInput.dispatchEvent(event);
    console.log('✓ Change event dispatched');
  } else {
    console.error('❌ VAT input not found');
  }
}

// Make VAT functions globally available
window.recalcAllItemsForCurrentVat = recalcAllItemsForCurrentVat;
window.attachVatChangeListeners = attachVatChangeListeners;
window.testVatEventListeners = testVatEventListeners;
