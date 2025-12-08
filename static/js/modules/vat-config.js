// VAT Configuration Module

// Default VAT settings
let vatSettings = {
  defaultPercent: 5,
  displayOption: 'show', // 'show' or 'hide_zero'
  includeVatInPrice: false, // New setting for including VAT in item price
  billTemplate: 'default' // Bill template selection
};

// Initialize VAT configuration
function initVatConfig() {
  loadVatSettings();
  setupVatConfigHandlers();
  updateVatDisplay();
}

// Load VAT settings from shop settings API
async function loadVatSettings() {
  try {
    // Load from shop settings API
    const response = await fetch('/api/shop-settings/billing-config');
    const data = await response.json();
    
    if (data.success && data.config) {
      // Update include_vat_in_price setting
      vatSettings.includeVatInPrice = data.config.include_vat_in_price || false;
      // Update bill template setting
      vatSettings.billTemplate = data.config.bill_template || 'default';
    }
  } catch (error) {
    console.warn('Failed to load VAT settings from API:', error);
  }
  
  // Also load from localStorage for backward compatibility
  const savedSettings = localStorage.getItem('vatSettings');
  if (savedSettings) {
    try {
      const localSettings = JSON.parse(savedSettings);
      vatSettings.defaultPercent = localSettings.defaultPercent || vatSettings.defaultPercent;
      vatSettings.displayOption = localSettings.displayOption || vatSettings.displayOption;
    } catch (e) {
      console.warn('Failed to parse saved VAT settings:', e);
    }
  }
  
  // Update input fields with loaded settings
  const defaultVatInput = document.getElementById('defaultVatPercent');
  const displayOptionSelect = document.getElementById('vatDisplayOption');
  const includeVatInPriceCheckbox = document.getElementById('includeVatInPrice');
  const billTemplateSelect = document.getElementById('billTemplate');
  
  if (defaultVatInput) defaultVatInput.value = vatSettings.defaultPercent;
  if (displayOptionSelect) displayOptionSelect.value = vatSettings.displayOption;
  if (includeVatInPriceCheckbox) includeVatInPriceCheckbox.checked = vatSettings.includeVatInPrice;
  if (billTemplateSelect) billTemplateSelect.value = vatSettings.billTemplate;
  
  // Update VAT input fields with default value
  updateVatInputs();
}

// Save VAT settings to localStorage
function saveVatSettings() {
  localStorage.setItem('vatSettings', JSON.stringify(vatSettings));
}

// Setup VAT configuration event handlers
function setupVatConfigHandlers() {
  // Desktop VAT config button
  const vatConfigBtn = document.getElementById('vatConfigBtn');
  if (vatConfigBtn) {
    vatConfigBtn.addEventListener('click', openVatConfigModal);
  }
  
  // Mobile VAT config button
  const vatConfigBtnMobile = document.getElementById('vatConfigBtnMobile');
  if (vatConfigBtnMobile) {
    vatConfigBtnMobile.addEventListener('click', openVatConfigModal);
  }
  
  // Modal close button
  const closeVatConfig = document.getElementById('closeVatConfig');
  if (closeVatConfig) {
    closeVatConfig.addEventListener('click', closeVatConfigModal);
  }
  
  // Cancel button
  const cancelVatConfig = document.getElementById('cancelVatConfig');
  if (cancelVatConfig) {
    cancelVatConfig.addEventListener('click', closeVatConfigModal);
  }
  
  // Save button
  const saveVatConfig = document.getElementById('saveVatConfig');
  if (saveVatConfig) {
    saveVatConfig.addEventListener('click', handleSaveVatConfig);
  }
  
  // Close modal when clicking outside
  const vatConfigModal = document.getElementById('vatConfigModal');
  if (vatConfigModal) {
    vatConfigModal.addEventListener('click', (e) => {
      if (e.target === vatConfigModal) {
        closeVatConfigModal();
      }
    });
  }
}

// Open VAT configuration modal
function openVatConfigModal() {
  const modal = document.getElementById('vatConfigModal');
  if (modal) {
    modal.classList.remove('hidden');
    // Focus on the default VAT input
    const defaultVatInput = document.getElementById('defaultVatPercent');
    if (defaultVatInput) {
      setTimeout(() => defaultVatInput.focus(), 100);
    }
  }
}

// Close VAT configuration modal
function closeVatConfigModal() {
  const modal = document.getElementById('vatConfigModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// Handle saving VAT configuration
async function handleSaveVatConfig() {
  const defaultVatInput = document.getElementById('defaultVatPercent');
  const displayOptionSelect = document.getElementById('vatDisplayOption');
  const includeVatInPriceCheckbox = document.getElementById('includeVatInPrice');
  const billTemplateSelect = document.getElementById('billTemplate');
  
  if (!defaultVatInput || !displayOptionSelect) return;
  
  const newDefaultPercent = parseFloat(defaultVatInput.value) || 0;
  const newDisplayOption = displayOptionSelect.value;
  const newIncludeVatInPrice = includeVatInPriceCheckbox ? includeVatInPriceCheckbox.checked : false;
  const newBillTemplate = billTemplateSelect ? billTemplateSelect.value : 'default';
  
  // Validate input
  if (newDefaultPercent < 0 || newDefaultPercent > 100) {
    if (window.showSimpleToast) {
      window.showSimpleToast('VAT percentage must be between 0 and 100', 'error');
    }
    return;
  }
  
  // Update settings
  vatSettings.defaultPercent = newDefaultPercent;
  vatSettings.displayOption = newDisplayOption;
  vatSettings.includeVatInPrice = newIncludeVatInPrice;
  vatSettings.billTemplate = newBillTemplate;
  
  // Save include_vat_in_price to VAT config API
  try {
    const response = await fetch('/api/shop-settings/vat-config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        include_vat_in_price: newIncludeVatInPrice,
        bill_template: newBillTemplate
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to save VAT include setting');
    }
  } catch (error) {
    console.error('Error saving VAT include setting:', error);
    if (window.showSimpleToast) {
      window.showSimpleToast('Failed to save VAT include setting', 'error');
    }
    return;
  }
  
  // Save other settings to localStorage
  saveVatSettings();
  
  // Update VAT input fields
  updateVatInputs();
  
      // Update VAT display
      updateVatDisplay();
      
      // Refresh bill table to show/hide VAT column
      if (window.renderBillTable) {
        window.renderBillTable();
      }
      
      // Close modal
      closeVatConfigModal();
      
      // Show success message
      if (window.showSimpleToast) {
        window.showSimpleToast('VAT settings saved successfully!', 'success');
      }
}

// Update VAT input fields with default value
function updateVatInputs() {
  const vatInputs = [
    document.getElementById('vatPercent'),
    document.getElementById('vatPercentMobile')
  ];
  
  vatInputs.forEach(input => {
    if (input) {
      input.value = vatSettings.defaultPercent;
    }
  });
}

// Update VAT display based on current settings
function updateVatDisplay() {
  const vatSummaryRow = document.getElementById('vatSummaryRow');
  const vatLabel = document.getElementById('vatLabel');
  
  if (!vatSummaryRow || !vatLabel) return;
  
  // Get current VAT percentage from the active input
  let currentVatPercent = 5; // Default fallback
  const activeVatInput = document.getElementById('vatPercent') || document.getElementById('vatPercentMobile');
  if (activeVatInput) {
    currentVatPercent = parseFloat(activeVatInput.value) || 0;
  }
  
  // Check if we should hide VAT
  const shouldHideVat = vatSettings.displayOption === 'hide_zero' && currentVatPercent === 0;
  
  if (shouldHideVat) {
    vatSummaryRow.style.display = 'none';
  } else {
    vatSummaryRow.style.display = 'flex';
    
    // Update the label based on VAT include setting
    if (vatSettings.includeVatInPrice) {
      vatLabel.textContent = `Tax (${currentVatPercent}% included):`;
    } else {
      vatLabel.textContent = `Tax (${currentVatPercent}%):`;
    }
  }
}

// Function to check if VAT should be displayed (for external use)
function shouldDisplayVat(vatPercent) {
  if (vatSettings.displayOption === 'hide_zero' && vatPercent === 0) {
    return false;
  }
  return true;
}

// Function to get default VAT percentage (for external use)
function getDefaultVatPercent() {
  return vatSettings.defaultPercent;
}

// Function to get VAT include in price setting (for external use)
function getIncludeVatInPrice() {
  return vatSettings.includeVatInPrice;
}

// Function to update VAT display when VAT input changes (for external use)
function onVatInputChange() {
  updateVatDisplay();
}

// Make functions globally available
window.initVatConfig = initVatConfig;
window.shouldDisplayVat = shouldDisplayVat;
window.getDefaultVatPercent = getDefaultVatPercent;
window.getIncludeVatInPrice = getIncludeVatInPrice;
window.onVatInputChange = onVatInputChange;
window.openVatConfigModal = openVatConfigModal;
