// Products Module

let editingProductId = null;
let searchTimeout = null;
let productFormHandlerAttached = false;

// Debounce function for search
function debounce(func, wait) {
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(searchTimeout);
      func(...args);
    };
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(later, wait);
  };
}

// Populate product type dropdown
async function populateProductTypeDropdown() {
  try {
    const response = await fetch('/api/product-types');
    const types = await response.json();
    const select = document.getElementById('productTypeSelect');
    
    if (select) {
      select.innerHTML = '<option value="">Select type</option>';
      types.forEach(type => {
        select.innerHTML += `<option value="${type.type_id}">${type.type_name}</option>`;
      });
    }
  } catch (error) {
    console.error('Error loading product types for dropdown:', error);
  }
}

// Products: Load and render products with loading effects
async function loadProducts() {
  // Show loading overlay
  const overlay = document.getElementById('productLoadingOverlay');
  const skeleton = document.getElementById('productSkeleton');
  const table = document.getElementById('productTable');
  const form = document.getElementById('productForm');
  
  if (overlay) overlay.classList.remove('hidden');
  if (skeleton) skeleton.classList.remove('hidden');
  if (table) table.classList.add('opacity-0', 'translate-y-4');
  if (form) form.classList.add('opacity-0', 'translate-y-4');
  
  try {
    const resp = await fetch('/api/products');
    const prods = await resp.json();

    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    
    // Simulate loading delay for better UX
    await new Promise(resolve => setTimeout(resolve, 800));
    
    tbody.innerHTML = prods.length
      ? prods.map((p, index) => `
        <tr class="product-item group hover:bg-neutral-800/50 transition-all duration-200 transform hover:scale-[1.01] hover:shadow-sm" style="animation-delay: ${index * 0.1}s;">
          <td class="px-3 py-3">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 bg-indigo-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              <span class="font-medium text-neutral-200 group-hover:text-white transition-colors duration-200">${p.type_name}</span>
            </div>
          </td>
          <td class="px-3 py-3">
            <span class="text-neutral-200 group-hover:text-white transition-colors duration-200">${p.product_name}</span>
          </td>
          <td class="px-3 py-3">
            <span class="font-semibold text-green-400 group-hover:text-green-300 transition-colors duration-200">AED ${parseFloat(p.rate).toFixed(2)}</span>
          </td>
          <td class="px-3 py-3 flex gap-2">
            <button class="edit-product-btn text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 px-3 py-2 rounded transition-all duration-200 transform hover:scale-110 hover:shadow-sm" data-id="${p.product_id}">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
            </button>
            <button class="delete-product-btn text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-2 rounded transition-all duration-200 transform hover:scale-110 hover:shadow-sm" data-id="${p.product_id}">
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
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
              </svg>
            </div>
            <p class="text-neutral-400 font-medium">No products found</p>
            <p class="text-neutral-500 text-sm mt-1">Create your first product above</p>
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
    console.error('Error loading products:', error);
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
            <p class="text-red-400 font-medium">Failed to load products</p>
            <p class="text-neutral-500 text-sm mt-1">Please try again later</p>
          </td>
        </tr>
      `;
    }
  } finally {
    // Hide loading elements
    if (overlay) overlay.classList.add('hidden');
    if (skeleton) skeleton.classList.add('hidden');
    
    // Populate product type dropdown
    await populateProductTypeDropdown();
    
    // Setup event handlers after products are loaded
    setupProductTableHandlers();
    
    // Add a small delay to ensure form is available
    setTimeout(() => {
      setupProductFormHandler();
      setupProductSearchHandler();
    }, 100);
  }
}

// Setup product table event handlers after products are loaded
function setupProductTableHandlers() {
  const productTable = document.getElementById('productTable');
  
  if (productTable) {
    // Remove existing event listener if any
    productTable.removeEventListener('click', productTableClickHandler);
    productTable.addEventListener('click', productTableClickHandler);
  }
}

// Setup product form submission handler
function setupProductFormHandler() {
  const productForm = document.getElementById('productForm');
  
  console.log('Setting up product form handler, form found:', !!productForm);
  
  if (productForm && !productFormHandlerAttached) {
    // Remove existing event listener if any
    productForm.removeEventListener('submit', handleProductFormSubmit);
    productForm.addEventListener('submit', handleProductFormSubmit);
    productFormHandlerAttached = true;
    console.log('Product form event listener attached');
  } else if (!productForm) {
    console.error('Product form not found!');
  } else {
    console.log('Product form handler already attached');
  }
}

// Setup product search handler
function setupProductSearchHandler() {
  const productSearch = document.getElementById('productSearch');
  
  if (productSearch) {
    // Remove existing event listener if any
    productSearch.removeEventListener('input', debouncedProductSearch);
    productSearch.addEventListener('input', debouncedProductSearch);
  }
}

// Debounced product search
const debouncedProductSearch = debounce(handleProductSearch, 300);

// Handle product search
async function handleProductSearch(e) {
  const searchTerm = e.target.value.trim();
  
  if (searchTerm.length < 2) {
    // If search term is too short, show all products
    await loadProducts();
    return;
  }
  
  try {
    const response = await fetch(`/api/products?search=${encodeURIComponent(searchTerm)}`);
    const products = await response.json();
    
    const table = document.getElementById('productTable');
    const tbody = table.querySelector('tbody');
    
    if (!tbody) return;
    
    tbody.innerHTML = products.length
      ? products.map((p, index) => `
        <tr class="product-item group hover:bg-neutral-800/50 transition-all duration-200 transform hover:scale-[1.01] hover:shadow-sm" style="animation-delay: ${index * 0.1}s;">
          <td class="px-3 py-3">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 bg-indigo-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              <span class="font-medium text-neutral-200 group-hover:text-white transition-colors duration-200">${p.type_name}</span>
            </div>
          </td>
          <td class="px-3 py-3">
            <span class="text-neutral-200 group-hover:text-white transition-colors duration-200">${p.product_name}</span>
          </td>
          <td class="px-3 py-3">
            <span class="font-semibold text-green-400 group-hover:text-green-300 transition-colors duration-200">AED ${parseFloat(p.rate).toFixed(2)}</span>
          </td>
          <td class="px-3 py-3 flex gap-2">
            <button class="edit-product-btn text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 px-3 py-2 rounded transition-all duration-200 transform hover:scale-110 hover:shadow-sm" data-id="${p.product_id}">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
            </button>
            <button class="delete-product-btn text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-2 rounded transition-all duration-200 transform hover:scale-110 hover:shadow-sm" data-id="${p.product_id}">
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
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
            <p class="text-neutral-400 font-medium">No products found</p>
            <p class="text-neutral-500 text-sm mt-1">Try a different search term</p>
          </td>
        </tr>
      `;
    
    // Setup event handlers for search results
    setupProductTableHandlers();
    
  } catch (error) {
    console.error('Error searching products:', error);
  }
}

// Handle product form submission
async function handleProductFormSubmit(e) {
  console.log('Product form submitted!');
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const productData = {
    type_id: document.getElementById('productTypeSelect').value,
    rate: document.getElementById('productPrice').value,
    barcode: document.getElementById('productBarcode')?.value?.trim() || ''
  };
  
  // For updates, use product_name; for creation, use name
  if (editingProductId) {
    productData.product_name = document.getElementById('productName').value;
  } else {
    productData.name = document.getElementById('productName').value;
  }
  
  console.log('Sending product data:', productData);
  
  // Check for required fields based on whether we're editing or creating
  const nameField = editingProductId ? productData.product_name : productData.name;
  if (!productData.type_id || !nameField || !productData.rate) {
    alert('Please fill in all fields');
    return;
  }
  
  try {
    const url = editingProductId ? `/api/products/${editingProductId}` : '/api/products';
    const method = editingProductId ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productData)
    });
    
    if (response.ok) {
      // Reset form
      resetProductForm();
      
      // Reload products
      await loadProducts();
      
      // Show success message
      if (window.showToast) {
        window.showToast('Product saved successfully!', 'success');
      }
    } else {
      const errorText = await response.text();
      console.error('Server response:', response.status, errorText);
      throw new Error(`Failed to save product: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    console.error('Error saving product:', error);
    if (window.showToast) {
      window.showToast('Failed to save product. Please try again.', 'error');
    }
  }
}

// Product table click handler function
async function productTableClickHandler(e) {
  const editBtn = e.target.closest('.edit-product-btn');
  const deleteBtn = e.target.closest('.delete-product-btn');
  
  if (editBtn) {
    const id = editBtn.getAttribute('data-id');
    editProduct(id);
  }
  if (deleteBtn) {
    const id = deleteBtn.getAttribute('data-id');
    const confirmed = await showConfirmDialog(
      'Are you sure you want to delete this product? This action cannot be undone.',
      'Delete Product',
      'delete'
    );
    if (confirmed) {
      fetch(`/api/products/${id}`, { method: 'DELETE' })
        .then(() => loadProducts());
    }
  }
}

async function editProduct(id) {
  try {
    const response = await fetch(`/api/products/${id}`);
    const product = await response.json();
    
    console.log('Product data for editing:', product);
    
    if (product) {
      document.getElementById('productTypeSelect').value = product.type_id;
      document.getElementById('productName').value = product.product_name || product.name || '';
      document.getElementById('productPrice').value = product.rate || product.price || '';
      if (document.getElementById('productBarcode')) {
        document.getElementById('productBarcode').value = product.barcode || '';
      }
      editingProductId = id;
    }
  } catch (error) {
    console.error('Error editing product:', error);
  }
}

// Function to reset product form
function resetProductForm() {
  const form = document.getElementById('productForm');
  const productTypeSelect = document.getElementById('productTypeSelect');
  const productName = document.getElementById('productName');
  const productPrice = document.getElementById('productPrice');
  
  if (form) form.reset();
  if (productTypeSelect) productTypeSelect.value = '';
  if (productName) productName.value = '';
  if (productPrice) productPrice.value = '';
  
  editingProductId = null;
  productFormHandlerAttached = false; // Reset flag to allow re-attachment
}

// Make functions globally available
window.loadProducts = loadProducts;
window.populateProductTypeDropdown = populateProductTypeDropdown;
window.editProduct = editProduct;
window.resetProductForm = resetProductForm; 