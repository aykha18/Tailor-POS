// Product Types Module

async function loadProductTypes() {
  // Show loading overlay
  const overlay = document.getElementById('productTypeLoadingOverlay');
  const skeleton = document.getElementById('productTypeSkeleton');
  const list = document.getElementById('productTypeList');
  const form = document.getElementById('productTypeForm');
  
  if (overlay) overlay.classList.remove('hidden');
  if (skeleton) skeleton.classList.remove('hidden');
  if (list) list.classList.add('opacity-0', 'translate-y-4');
  if (form) form.classList.add('opacity-0', 'translate-y-4');
  
      try {
      const resp = await fetch('/api/product-types');
      const types = await resp.json();

      if (!list) {
        return;
      }
    
    // Simulate loading delay for better UX
    await new Promise(resolve => setTimeout(resolve, 800));
    
    list.innerHTML = types.length
      ? types.map((t, index) => `
        <li class="product-type-item group flex justify-between px-3 py-3 hover:bg-neutral-800/50 transition-all duration-200 transform hover:scale-[1.02] hover:shadow-sm hover-glow" style="animation-delay: ${index * 0.1}s;">
          <div class="flex items-center gap-3 flex-1">
            <div class="w-2 h-2 bg-indigo-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
            <div class="flex flex-col">
              <span class="font-medium text-neutral-200 group-hover:text-white transition-colors duration-200">${t.type_name}</span>
              ${t.description ? `<span class="text-xs text-neutral-500 group-hover:text-neutral-400 transition-colors duration-200">${t.description}</span>` : ''}
            </div>
          </div>
          <button data-id="${t.type_id}" class="delete-type-btn text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 rounded transition-all duration-200 transform hover:scale-110 hover:shadow-sm">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </li>
      `).join('')
      : `
        <li class="px-6 py-8 text-center">
          <div class="w-16 h-16 mx-auto mb-4 bg-neutral-800/50 rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
            </svg>
          </div>
          <p class="text-neutral-400 font-medium">No product types found</p>
          <p class="text-neutral-500 text-sm mt-1">Create your first product type above</p>
        </li>
      `;
    
    // Animate in the content
    setTimeout(() => {
      if (form) {
        form.classList.remove('opacity-0', 'translate-y-4');
        form.classList.add('opacity-100', 'translate-y-0');
      }
    }, 200);
    
    setTimeout(() => {
      if (list) {
        list.classList.remove('opacity-0', 'translate-y-4');
        list.classList.add('opacity-100', 'translate-y-0');
      }
    }, 400);
    
    // Also populate the product type dropdown in the products section
    if (window.populateProductTypeDropdown) {
      window.populateProductTypeDropdown();
    }
    
  } catch (error) {
    console.error('Error loading product types:', error);
    if (list) {
      list.innerHTML = `
        <li class="px-6 py-8 text-center">
          <div class="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
          <p class="text-red-400 font-medium">Failed to load product types</p>
          <p class="text-neutral-500 text-sm mt-1">Please try again later</p>
        </li>
      `;
    }
  } finally {
    // Hide loading elements
    if (overlay) overlay.classList.add('hidden');
    if (skeleton) skeleton.classList.add('hidden');
    
    // Setup form and list handlers
    setupProductTypeFormHandler();
    setupProductTypeListHandlers();
  }
}

// Setup product type form submission handler
function setupProductTypeFormHandler() {
  const productTypeForm = document.getElementById('productTypeForm');
  
  if (productTypeForm) {
    // Remove existing event listener if any
    productTypeForm.removeEventListener('submit', handleProductTypeFormSubmit);
    
    // Add new event listener
    productTypeForm.addEventListener('submit', handleProductTypeFormSubmit);
    
    // Also add click listener to the submit button as backup
    const submitButton = productTypeForm.querySelector('button[type="submit"], button:last-child');
    if (submitButton) {
      submitButton.removeEventListener('click', handleProductTypeFormSubmit);
      submitButton.addEventListener('click', handleProductTypeFormSubmit);
    }
  }
}

// Setup product type list click handlers
function setupProductTypeListHandlers() {
  const productTypeList = document.getElementById('productTypeList');
  
  if (productTypeList) {
    // Remove existing event listener if any
    productTypeList.removeEventListener('click', handleProductTypeListClick);
    productTypeList.addEventListener('click', handleProductTypeListClick);
  }
}

// Handle product type list clicks (for delete buttons)
async function handleProductTypeListClick(e) {
  const deleteBtn = e.target.closest('.delete-type-btn');
  
  if (deleteBtn) {
    const typeId = deleteBtn.getAttribute('data-id');
    const confirmed = await showConfirmDialog(
      'Are you sure you want to delete this product type? This action cannot be undone.',
      'Delete Product Type',
      'delete'
    );
    if (confirmed) {
      try {
        const response = await fetch(`/api/product-types/${typeId}`, { 
          method: 'DELETE' 
        });
        if (response.ok) {
          await loadProductTypes();
          if (window.showToast) {
            window.showToast('Product type deleted successfully!', 'success');
          }
        } else {
          throw new Error('Failed to delete product type');
        }
      } catch (error) {
        console.error('Error deleting product type:', error);
        if (window.showToast) {
          window.showToast('Failed to delete product type. Please try again.', 'error');
        }
      }
    }
  }
}

// Handle product type form submission
async function handleProductTypeFormSubmit(e) {
  console.log('📝 handleProductTypeFormSubmit() called');
  console.log('📋 Event type:', e.type);
  console.log('📋 Event target:', e.target);
  console.log('📋 Event currentTarget:', e.currentTarget);
  
  e.preventDefault();
  console.log('🛑 Prevented default form submission');
  
  const typeName = document.getElementById('productTypeName').value.trim();
  const description = document.getElementById('productTypeDescription').value.trim();
  
  console.log('📝 Form data:', { typeName, description });
  
  if (!typeName) {
    console.warn('⚠️ Type name is empty');
    alert('Please enter a product type name');
    return;
  }
  
  console.log('🚀 Submitting product type to API...');
  
  try {
    const response = await fetch('/api/product-types', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        name: typeName,
        description: description || null
      })
    });
    
    console.log('📡 API response status:', response.status);
    
    if (response.ok) {
      console.log('✅ Product type added successfully');
      
      // Reset form - always reference the form element
      const form = document.getElementById('productTypeForm');
      if (form) {
        form.reset();
        console.log('🔄 Form reset');
      }
      
      // Reload product types
      await loadProductTypes();
      console.log('🔄 Product types reloaded');
      
      // Show success message
      if (window.showToast) {
        window.showToast('Product type added successfully!', 'success');
      }
    } else {
      const errorText = await response.text();
      console.error('❌ API error:', errorText);
      
      // Try to parse the error response for better user feedback
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error && errorData.error.includes('already exists')) {
          throw new Error('A product type with this name already exists. Please use a different name.');
        } else {
          throw new Error('Failed to add product type: ' + errorData.error);
        }
      } catch (parseError) {
        throw new Error('Failed to add product type: ' + errorText);
      }
    }
  } catch (error) {
    console.error('❌ Error adding product type:', error);
    if (window.showToast) {
      window.showToast('Failed to add product type. Please try again.', 'error');
    }
  }
}

// Make functions globally available
window.loadProductTypes = loadProductTypes;
window.setupProductTypeFormHandler = setupProductTypeFormHandler;
window.setupProductTypeListHandlers = setupProductTypeListHandlers;

console.log('📦 Product Types module loaded'); 