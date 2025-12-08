// VAT Module

let editingVatId = null;

// Load and render VAT rates with loading effects
async function loadVatRates() {
  // Show loading overlay
  const overlay = document.getElementById('vatLoadingOverlay');
  const skeleton = document.getElementById('vatSkeleton');
  const table = document.getElementById('vatTable');
  const form = document.getElementById('vatForm');
  
  if (overlay) overlay.classList.remove('hidden');
  if (skeleton) skeleton.classList.remove('hidden');
  if (table) table.classList.add('opacity-0', 'translate-y-4');
  if (form) form.classList.add('opacity-0', 'translate-y-4');
  
  try {
    const resp = await fetch('/api/vat-rates');
    const vats = await resp.json();
    
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
      
    // Simulate loading delay for better UX
    await new Promise(resolve => setTimeout(resolve, 800));
    
    tbody.innerHTML = vats.length
      ? vats.map((v, index) => `
        <tr class="vat-item group hover:bg-neutral-800/50 transition-all duration-200 transform hover:scale-[1.01] hover:shadow-sm" style="animation-delay: ${index * 0.1}s;">
          <td class="px-3 py-3">
            <span class="font-semibold text-green-400 group-hover:text-green-300 transition-colors duration-200">${parseFloat(v.rate_percentage).toFixed(2)}%</span>
          </td>
          <td class="px-3 py-3">
            <span class="text-neutral-200 group-hover:text-white transition-colors duration-200">${v.effective_from}</span>
          </td>
          <td class="px-3 py-3">
            <span class="text-neutral-200 group-hover:text-white transition-colors duration-200">${v.effective_to}</span>
          </td>
          <td class="px-3 py-3 flex gap-2">
            <button class="edit-vat-btn text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 px-3 py-2 rounded transition-all duration-200 transform hover:scale-110 hover:shadow-sm" data-id="${v.vat_id}">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
            </button>
            <button class="delete-vat-btn text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-2 rounded transition-all duration-200 transform hover:scale-110 hover:shadow-sm" data-id="${v.vat_id}">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
            </button>
          </td>
        </tr>
      `).join('')
      : `
        <tr>
          <td colspan="4" class="px-6 py-8 text-center">
            <div class="w-16 h-16 mx-auto mb-4 bg-neutral-800/50 rounded-full flex items-center justify-center">
              <svg class="w-8 h-8 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
              </svg>
            </div>
            <p class="text-neutral-400 font-medium">No VAT rates found</p>
            <p class="text-neutral-500 text-sm mt-1">Create your first VAT rate above</p>
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
    console.error('Error loading VAT rates:', error);
    const tbody = table.querySelector('tbody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="px-6 py-8 text-center">
            <div class="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
              <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
            </div>
            <p class="text-red-400 font-medium">Failed to load VAT rates</p>
            <p class="text-neutral-500 text-sm mt-1">Please try again later</p>
          </td>
        </tr>
      `;
    }
  } finally {
    // Hide loading overlay and skeleton
    if (overlay) overlay.classList.add('hidden');
    if (skeleton) skeleton.classList.add('hidden');
    
    // Setup event handlers after VAT rates are loaded
    setupVatTableHandlers();
    setupVatFormHandler();
  }
}

// Setup VAT table event handlers
function setupVatTableHandlers() {
  const vatTable = document.getElementById('vatTable');
  
  if (vatTable) {
    // Remove existing event listener if any
    vatTable.removeEventListener('click', vatTableClickHandler);
    vatTable.addEventListener('click', vatTableClickHandler);
  }
}

// Setup VAT form submission handler
function setupVatFormHandler() {
  const vatForm = document.getElementById('vatForm');
  
  if (vatForm) {
    // Remove existing event listener if any
    vatForm.removeEventListener('submit', handleVatFormSubmit);
    vatForm.addEventListener('submit', handleVatFormSubmit);
  }
}

// Handle VAT form submission
async function handleVatFormSubmit(e) {
  e.preventDefault();
  
  const vatData = {
    rate_percentage: document.getElementById('vatRate').value,
    effective_from: document.getElementById('vatEffDate').value
  };
  
  // Set effective_to to end of year if not provided
  if (vatData.effective_from) {
    const year = new Date(vatData.effective_from).getFullYear();
    vatData.effective_to = `${year}-12-31`;
  }
  
  if (!vatData.rate_percentage || !vatData.effective_from) {
    alert('Rate and effective date are required');
    return;
  }
  
  try {
    const response = await fetch('/api/vat-rates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(vatData)
    });
    
    if (response.ok) {
      // Reset form
      resetVatForm();
      
      // Reload VAT rates
      await loadVatRates();
      
      // Show success message
      if (window.showToast) {
        window.showToast('VAT rate added successfully!', 'success');
      }
    } else {
      const errorText = await response.text();
      console.error('Server response:', response.status, errorText);
      throw new Error(`Failed to add VAT rate: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    console.error('Error adding VAT rate:', error);
    if (window.showToast) {
      window.showToast('Failed to add VAT rate. Please try again.', 'error');
    }
  }
}

// VAT table click handler function
async function vatTableClickHandler(e) {
  const editBtn = e.target.closest('.edit-vat-btn');
  const deleteBtn = e.target.closest('.delete-vat-btn');
  
  if (editBtn) {
    const id = editBtn.getAttribute('data-id');
    editVatRate(id);
  }
  if (deleteBtn) {
    const id = deleteBtn.getAttribute('data-id');
    const confirmed = await showConfirmDialog(
      'Are you sure you want to delete this VAT rate? This action cannot be undone.',
      'Delete VAT Rate',
      'delete'
    );
    if (confirmed) {
      fetch(`/api/vat-rates/${id}`, { method: 'DELETE' })
        .then(() => loadVatRates());
    }
  }
}

// Edit VAT rate function (Note: Backend doesn't support editing, so this is for future enhancement)
async function editVatRate(id) {
  try {
    // For now, we'll just show a message that editing is not supported
    if (window.showToast) {
      window.showToast('VAT rate editing is not currently supported. Please delete and recreate.', 'info');
    }
  } catch (error) {
    console.error('Error editing VAT rate:', error);
  }
}

// Function to reset VAT form
function resetVatForm() {
  const form = document.getElementById('vatForm');
  
  if (form) {
    form.reset();
  }
  
  editingVatId = null;
}

// Make functions globally available
window.loadVatRates = loadVatRates;
window.editVatRate = editVatRate;
window.resetVatForm = resetVatForm; 