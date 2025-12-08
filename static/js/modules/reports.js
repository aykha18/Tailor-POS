// Reports Module

function initializeReports() {
  // Initialize tab switching functionality
  initializeTabSwitching();
  
  // Initialize all report sections
  initializeInvoicesReport();
  initializeEmployeesReport();
  initializeProductsReport();
}

function initializeTabSwitching() {
  const tabButtons = document.querySelectorAll('.report-tab-btn');
  const tabContents = document.querySelectorAll('.report-tab-content');
  
  // Hide all tab contents initially
  tabContents.forEach(content => {
    content.style.display = 'none';
  });
  
  // Show the first tab by default
  if (tabContents.length > 0) {
    tabContents[0].style.display = 'block';
    if (tabButtons.length > 0) {
      tabButtons[0].classList.add('text-indigo-400', 'border-indigo-400');
      tabButtons[0].classList.remove('text-neutral-300', 'border-transparent');
    }
  }
  
  // Add click event listeners to tab buttons
  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
             const targetTab = this.getAttribute('data-tab');
       
       // Remove active state from all buttons
      tabButtons.forEach(btn => {
        btn.classList.remove('text-indigo-400', 'border-indigo-400');
        btn.classList.add('text-neutral-300', 'border-transparent');
      });
      
      // Add active state to clicked button
      this.classList.add('text-indigo-400', 'border-indigo-400');
      this.classList.remove('text-neutral-300', 'border-transparent');
      
      // Hide all tab contents
      tabContents.forEach(content => {
        content.style.display = 'none';
      });
      
             // Show target tab content
       const targetContent = document.getElementById(targetTab);
       if (targetContent) {
         targetContent.style.display = 'block';
       }
    });
  });
}

function initializeInvoicesReport() {
  // Set default dates to current month
  setDefaultDates();
  
  // Populate filter dropdowns
  populateProducts('invProducts');
  populateEmployees('invEmployees');
  populateCities('invCity');
  populateAreas('invArea');
  
  // Set up event listeners for filters
  const filters = ['invFromDate', 'invToDate', 'invCity', 'invArea', 'invStatus', 'invProducts', 'invEmployees'];
  filters.forEach(filterId => {
    const element = document.getElementById(filterId);
    if (element) {
      element.addEventListener('change', fetchAndRenderInvoices);
    }
  });
  
  // Add Preview button event listener
  const previewBtn = document.getElementById('previewInvoicesBtn');
  if (previewBtn) {
    previewBtn.addEventListener('click', fetchAndRenderInvoices);
  }
  
  // Add Preview button event listener for Employees
  const previewEmployeesBtn = document.getElementById('previewEmployeesBtn');
  if (previewEmployeesBtn) {
    previewEmployeesBtn.addEventListener('click', fetchAndRenderEmployees);
  }
  
  // Add Preview button event listener for Products
  const previewProductsBtn = document.getElementById('previewProductsBtn');
  if (previewProductsBtn) {
    previewProductsBtn.addEventListener('click', fetchAndRenderProducts);
  }
  
  // Show initial state - encourage user to click Preview
  showInitialTableState('invoices-table-body', 'invoices');
}

function setDefaultDates() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const fromDateInput = document.getElementById('invFromDate');
  const toDateInput = document.getElementById('invToDate');
  
  if (fromDateInput) {
    fromDateInput.value = firstDay.toISOString().split('T')[0];
  }
  if (toDateInput) {
    toDateInput.value = lastDay.toISOString().split('T')[0];
  }
  
  
}

function initializeEmployeesReport() {
  // Populate filter dropdowns
  populateProducts('empProducts');
  populateCities('empCity');
  populateAreas('empArea');
  
  // Set up event listeners for filters
  const filters = ['empFromDate', 'empToDate', 'empCity', 'empArea', 'empStatus', 'empProducts'];
  filters.forEach(filterId => {
    const element = document.getElementById(filterId);
    if (element) {
      element.addEventListener('change', fetchAndRenderEmployees);
    }
  });
  
  // Show initial state - encourage user to click Preview
  showInitialTableState('employees-table-body', 'employees');
}

function initializeProductsReport() {
  // Populate filter dropdowns
  populateCities('prodCity');
  populateAreas('prodArea');
  
  // Set up event listeners for filters
  const filters = ['prodFromDate', 'prodToDate', 'prodCity', 'prodArea', 'prodStatus'];
  filters.forEach(filterId => {
    const element = document.getElementById(filterId);
    if (element) {
      element.addEventListener('change', fetchAndRenderProducts);
    }
  });
  
  // Show initial state - encourage user to click Preview
  showInitialTableState('products-table-body', 'products');
}

async function populateProducts(selectId) {
  try {
    const response = await fetch('/api/products', { credentials: 'include' });
    const products = await response.json();
    const select = document.getElementById(selectId);
    
    if (select) {
      select.innerHTML = '<option value="All">All Products</option>';
      products.forEach(product => {
        select.innerHTML += `<option value="${product.product_id}">${product.product_name}</option>`;
      });
    }
  } catch (error) {
    console.error('Error loading products:', error);
  }
}

async function populateEmployees(selectId) {
  try {
    const response = await fetch('/api/employees', { credentials: 'include' });
    const employees = await response.json();
    const select = document.getElementById(selectId);
    
    if (select) {
      select.innerHTML = '<option value="All">All Employees</option>';
      employees.forEach(employee => {
        select.innerHTML += `<option value="${employee.employee_id}">${employee.name}</option>`;
      });
    }
  } catch (error) {
    console.error('Error loading employees:', error);
  }
}

async function populateCities(selectId) {
  try {
    const response = await fetch('/api/cities', { credentials: 'include' });
    const cities = await response.json();
    const select = document.getElementById(selectId);
    
    if (select) {
      select.innerHTML = '<option value="All">All Cities</option>';
      cities.forEach(city => {
        select.innerHTML += `<option value="${city}">${city}</option>`;
      });
    }
  } catch (error) {
    console.error('Error loading cities:', error);
  }
}

async function populateAreas(selectId, city = null) {
  try {
    const url = city ? `/api/areas?city=${encodeURIComponent(city)}` : '/api/areas';
    const response = await fetch(url, { credentials: 'include' });
    const areas = await response.json();
    const select = document.getElementById(selectId);
    
    if (select) {
      select.innerHTML = '<option value="All">All Areas</option>';
      areas.forEach(area => {
        select.innerHTML += `<option value="${area}">${area}</option>`;
      });
    }
  } catch (error) {
    console.error('Error loading areas:', error);
  }
}

async function fetchAndRenderInvoices() {
  const tbody = document.getElementById('invoices-table-body');
  if (!tbody) return;
  
  // Show loading state for both table and summary
  tbody.innerHTML = `
    <tr>
      <td colspan="9" class="px-6 py-8 text-center">
        <div class="w-8 h-8 mx-auto mb-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-neutral-400">Loading invoices...</p>
      </td>
    </tr>
  `;
  
  // Show loading state for summary cards
  updateSummaryCardsLoading();
  
  try {
    // Build query parameters
    const params = new URLSearchParams();
    const fromDate = document.getElementById('invFromDate')?.value;
    const toDate = document.getElementById('invToDate')?.value;
    const city = document.getElementById('invCity')?.value;
    const area = document.getElementById('invArea')?.value;
    const status = document.getElementById('invStatus')?.value;
    const productsSelect = document.getElementById('invProducts');
    const employeesSelect = document.getElementById('invEmployees');
    
    if (fromDate) params.append('from_date', fromDate);
    if (toDate) params.append('to_date', toDate);
    if (city && city !== 'All') params.append('city', city);
    if (area && area !== 'All') params.append('area', area);
    if (status && status !== 'All') params.append('status', status);
    
    // Add client_id for testing (you can make this dynamic later)
    params.append('client_id', '2');
    
    const selectedProducts = Array.from(productsSelect?.selectedOptions || [])
      .map(opt => opt.value)
      .filter(val => val && val !== 'All');
    selectedProducts.forEach(p => params.append('products[]', p));
    
    const selectedEmployees = Array.from(employeesSelect?.selectedOptions || [])
      .map(opt => opt.value)
      .filter(val => val && val !== 'All');
    selectedEmployees.forEach(e => params.append('employees[]', e));
    
    const response = await fetch(`/api/reports/invoices?${params.toString()}`, { credentials: 'include' });
    const data = await response.json();
    
    if (data.success) {
      const invoices = data.invoices || [];
      
             tbody.innerHTML = invoices.length
         ? invoices.map((invoice, index) => {
             // Calculate total discount amount from discount percentages and amounts
             let totalDiscountAmount = 0;
             if (invoice.discount_amounts && invoice.discount_amounts.length > 0) {
                 totalDiscountAmount = invoice.discount_amounts.reduce((sum, amount) => sum + parseFloat(amount || 0), 0);
             }
             
             return `
           <tr class="hover:bg-neutral-800/50 transition-colors" style="animation-delay: ${index * 0.1}s;">
             <td class="px-4 py-3">${invoice.bill_number}</td>
             <td class="px-4 py-3">${invoice.bill_date}</td>
             <td class="px-4 py-3">${invoice.customer_name}</td>
             <td class="px-4 py-3">${invoice.delivery_date}</td>
             <td class="px-4 py-3">AED ${parseFloat(invoice.subtotal || invoice.total_amount).toFixed(2)}</td>
             <td class="px-4 py-3">AED ${totalDiscountAmount.toFixed(2)}</td>
             <td class="px-4 py-3">AED ${parseFloat(invoice.vat_amount || 0).toFixed(2)}</td>
             <td class="px-4 py-3">AED ${parseFloat(invoice.total_amount).toFixed(2)}</td>
             <td class="px-4 py-3">
               <span class="px-2 py-1 rounded-full text-xs font-medium ${
                 invoice.status === 'Completed' ? 'bg-green-500/20 text-green-400' :
                 invoice.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400' :
                 'bg-red-500/20 text-red-400'
               }">${invoice.status}</span>
             </td>
             <td class="px-4 py-3">${invoice.products || 'N/A'}</td>
           </tr>
         `;
         }).join('')
                 : `
           <tr>
             <td colspan="9" class="px-6 py-8 text-center">
               <div class="w-16 h-16 mx-auto mb-4 bg-neutral-800/50 rounded-full flex items-center justify-center">
                 <svg class="w-8 h-8 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                 </svg>
               </div>
               <p class="text-neutral-400 font-medium">No invoices found</p>
               <p class="text-neutral-500 text-sm mt-1">Try adjusting your filters</p>
             </td>
           </tr>
         `;
    } else {
      throw new Error(data.error || 'Failed to load invoices');
    }
    
    // Update summary cards with filtered data
    await updateInvoiceSummary();
    
  } catch (error) {
    console.error('Error loading invoices:', error);
         tbody.innerHTML = `
       <tr>
         <td colspan="9" class="px-6 py-8 text-center">
           <div class="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
             <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
             </svg>
           </div>
           <p class="text-red-400 font-medium">Failed to load invoices</p>
           <p class="text-neutral-500 text-sm mt-1">Please try again later</p>
         </td>
       </tr>
     `;
  }
}

async function fetchAndRenderEmployees() {
  const tbody = document.getElementById('employees-table-body');
  if (!tbody) return;
  
  // Show loading state
  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="px-6 py-8 text-center">
        <div class="w-8 h-8 mx-auto mb-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-neutral-400">Loading employees...</p>
      </td>
    </tr>
  `;
  
  try {
    // Build query parameters
    const params = new URLSearchParams();
    const fromDate = document.getElementById('empFromDate')?.value;
    const toDate = document.getElementById('empToDate')?.value;
    const city = document.getElementById('empCity')?.value;
    const area = document.getElementById('empArea')?.value;
    const status = document.getElementById('empStatus')?.value;
    const productsSelect = document.getElementById('empProducts');
    
    if (fromDate) params.append('from_date', fromDate);
    if (toDate) params.append('to_date', toDate);
    if (city && city !== 'All') params.append('city', city);
    if (area && area !== 'All') params.append('area', area);
    if (status && status !== 'All') params.append('status', status);
    
    // Add client_id for testing
    params.append('client_id', '2');
    
    const selectedProducts = Array.from(productsSelect?.selectedOptions || [])
      .map(opt => opt.value)
      .filter(val => val && val !== 'All');
    selectedProducts.forEach(p => params.append('products[]', p));
    
    const response = await fetch(`/api/reports/employees?${params.toString()}`, { credentials: 'include' });
    const data = await response.json();
    
    if (data.success) {
      const employees = data.employees || [];
      
      tbody.innerHTML = employees.length
        ? employees.map((employee, index) => `
          <tr class="hover:bg-neutral-800/50 transition-colors" style="animation-delay: ${index * 0.1}s;">
            <td class="px-4 py-3">${employee.name}</td>
            <td class="px-4 py-3">${employee.bills_handled}</td>
            <td class="px-4 py-3">AED ${parseFloat(employee.total_billed).toFixed(2)}</td>
            <td class="px-4 py-3">
              <div class="flex flex-wrap gap-1">
                ${employee.products_handled.slice(0, 3).map(product => 
                  `<span class="px-2 py-1 bg-indigo-500/20 text-indigo-400 rounded-full text-xs">${product}</span>`
                ).join('')}
                ${employee.products_handled.length > 3 ? 
                  `<span class="px-2 py-1 bg-neutral-500/20 text-neutral-400 rounded-full text-xs cursor-help" title="${employee.products_handled.slice(3).join(', ')}">+${employee.products_handled.length - 3} more</span>` : 
                  ''
                }
              </div>
            </td>
            <td class="px-4 py-3">
              <span class="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">Active</span>
            </td>
          </tr>
        `).join('')
        : `
          <tr>
            <td colspan="5" class="px-6 py-8 text-center">
              <div class="w-16 h-16 mx-auto mb-4 bg-neutral-800/50 rounded-full flex items-center justify-center">
                <svg class="w-8 h-8 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>
              </div>
              <p class="text-neutral-400 font-medium">No employees found</p>
              <p class="text-neutral-500 text-sm mt-1">Try adjusting your filters</p>
            </td>
          </tr>
        `;
    } else {
      throw new Error(data.error || 'Failed to load employees');
    }
  } catch (error) {
    console.error('Error loading employees:', error);
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="px-6 py-8 text-center">
          <div class="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
          <p class="text-red-400 font-medium">Failed to load employees</p>
          <p class="text-neutral-500 text-sm mt-1">Please try again later</p>
        </td>
      </tr>
    `;
  }
}

async function fetchAndRenderProducts() {
  const tbody = document.getElementById('products-table-body');
  if (!tbody) return;
  
  // Show loading state
  tbody.innerHTML = `
    <tr>
      <td colspan="4" class="px-6 py-8 text-center">
        <div class="w-8 h-8 mx-auto mb-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-neutral-400">Loading products...</p>
      </td>
    </tr>
  `;
  
  try {
    // Build query parameters
    const params = new URLSearchParams();
    const fromDate = document.getElementById('prodFromDate')?.value;
    const toDate = document.getElementById('prodToDate')?.value;
    const city = document.getElementById('prodCity')?.value;
    const area = document.getElementById('prodArea')?.value;
    const status = document.getElementById('prodStatus')?.value;
    
    if (fromDate) params.append('from_date', fromDate);
    if (toDate) params.append('to_date', toDate);
    if (city && city !== 'All') params.append('city', city);
    if (area && area !== 'All') params.append('area', area);
    if (status && status !== 'All') params.append('status', status);
    
    // Add client_id for testing
    params.append('client_id', '2');
    
    const response = await fetch(`/api/reports/products?${params.toString()}`, { credentials: 'include' });
    const data = await response.json();
    
    if (data.success) {
      const products = data.products || [];
      
      tbody.innerHTML = products.length
        ? products.map((product, index) => `
          <tr class="hover:bg-neutral-800/50 transition-colors" style="animation-delay: ${index * 0.1}s;">
            <td class="px-4 py-3">${product.product_name}</td>
            <td class="px-4 py-3">${product.type_name}</td>
            <td class="px-4 py-3">${product.total_quantity}</td>
            <td class="px-4 py-3">AED ${parseFloat(product.total_revenue).toFixed(2)}</td>
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
              <p class="text-neutral-500 text-sm mt-1">Try adjusting your filters</p>
            </td>
          </tr>
        `;
    } else {
      throw new Error(data.error || 'Failed to load products');
    }
  } catch (error) {
    console.error('Error loading products:', error);
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
}

function initializeDownloadAndPrint() {
  console.log('initializeDownloadAndPrint called');
  
  // Invoices Download button functionality
  const downloadInvoicesBtn = document.getElementById('downloadInvoicesBtn');
  const spinner = document.getElementById('download-spinner');
  
  if (downloadInvoicesBtn && spinner) {
    downloadInvoicesBtn.addEventListener('click', function() {
      spinner.classList.remove('hidden');
      setTimeout(() => {
        spinner.classList.add('hidden');
      }, 2000);
      const fromDate = document.getElementById('invFromDate')?.value || '';
      const toDate = document.getElementById('invToDate')?.value || '';
      const city = document.getElementById('invCity')?.value || '';
      const area = document.getElementById('invArea')?.value || '';
      const status = document.getElementById('invStatus')?.value || '';
      const productsSelect = document.getElementById('invProducts');
      const selectedProducts = Array.from(productsSelect?.selectedOptions || [])
        .map(opt => opt.value)
        .filter(val => val && val !== 'All');
      const employeesSelect = document.getElementById('invEmployees');
      const selectedEmployees = Array.from(employeesSelect?.selectedOptions || [])
        .map(opt => opt.value)
        .filter(val => val && val !== 'All');
      const params = new URLSearchParams();
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);
      if (city && city !== 'All') params.append('city', city);
      if (area && area !== 'All') params.append('area', area);
      if (status && status !== 'All') params.append('status', status);
      selectedProducts.forEach(p => params.append('products[]', p));
      selectedEmployees.forEach(e => params.append('employees[]', e));
      params.append('client_id', '2');
      const downloadUrl = '/api/reports/invoices/download?' + params.toString();
      window.location = downloadUrl;
    });
  }
  
  // Employees Download button functionality
  const downloadEmployeesBtn = document.getElementById('downloadEmployeesBtn');
  if (downloadEmployeesBtn) {
    downloadEmployeesBtn.addEventListener('click', function() {
      const fromDate = document.getElementById('empFromDate')?.value || '';
      const toDate = document.getElementById('empToDate')?.value || '';
      const city = document.getElementById('empCity')?.value || '';
      const area = document.getElementById('empArea')?.value || '';
      const status = document.getElementById('empStatus')?.value || '';
      const productsSelect = document.getElementById('empProducts');
      const selectedProducts = Array.from(productsSelect?.selectedOptions || [])
        .map(opt => opt.value)
        .filter(val => val && val !== 'All');
      const params = new URLSearchParams();
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);
      if (city && city !== 'All') params.append('city', city);
      if (area && area !== 'All') params.append('area', area);
      if (status && status !== 'All') params.append('status', status);
      selectedProducts.forEach(p => params.append('products[]', p));
      params.append('client_id', '2');
      const downloadUrl = '/api/reports/employees/download?' + params.toString();
      window.location = downloadUrl;
    });
  }
  
  // Products Download button functionality
  const downloadProductsBtn = document.getElementById('downloadProductsBtn');
  if (downloadProductsBtn) {
    downloadProductsBtn.addEventListener('click', function() {
      const fromDate = document.getElementById('prodFromDate')?.value || '';
      const toDate = document.getElementById('prodToDate')?.value || '';
      const city = document.getElementById('prodCity')?.value || '';
      const area = document.getElementById('prodArea')?.value || '';
      const status = document.getElementById('prodStatus')?.value || '';
      const params = new URLSearchParams();
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);
      if (city && city !== 'All') params.append('city', city);
      if (area && area !== 'All') params.append('area', area);
      if (status && status !== 'All') params.append('status', status);
      params.append('client_id', '2');
      const downloadUrl = '/api/reports/products/download?' + params.toString();
      window.location = downloadUrl;
    });
  }

  // Invoices Print button functionality
  const invoicePrintBtn = document.getElementById('invoicePrintBtn');
  if (invoicePrintBtn) {
    invoicePrintBtn.addEventListener('click', function() {
      const fromDate = document.getElementById('invFromDate')?.value || '';
      const toDate = document.getElementById('invToDate')?.value || '';
      const city = document.getElementById('invCity')?.value || '';
      const area = document.getElementById('invArea')?.value || '';
      const status = document.getElementById('invStatus')?.value || '';
      const productsSelect = document.getElementById('invProducts');
      const selectedProducts = Array.from(productsSelect?.selectedOptions || [])
        .map(opt => opt.value)
        .filter(val => val && val !== 'All');
      const employeesSelect = document.getElementById('invEmployees');
      const selectedEmployees = Array.from(employeesSelect?.selectedOptions || [])
        .map(opt => opt.value)
        .filter(val => val && val !== 'All');
      const params = new URLSearchParams();
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);
      if (city && city !== 'All') params.append('city', city);
      if (area && area !== 'All') params.append('area', area);
      if (status && status !== 'All') params.append('status', status);
      selectedProducts.forEach(p => params.append('products[]', p));
      selectedEmployees.forEach(e => params.append('employees[]', e));
      window.open('/api/reports/invoices/print?' + params.toString(), '_blank');
    });
  }
  
  // Employees Print button functionality
  const employeesPrintBtn = document.getElementById('employeesPrintBtn');
  if (employeesPrintBtn) {
    employeesPrintBtn.addEventListener('click', function() {
      const fromDate = document.getElementById('empFromDate')?.value || '';
      const toDate = document.getElementById('empToDate')?.value || '';
      const city = document.getElementById('empCity')?.value || '';
      const area = document.getElementById('empArea')?.value || '';
      const status = document.getElementById('empStatus')?.value || '';
      const productsSelect = document.getElementById('empProducts');
      const selectedProducts = Array.from(productsSelect?.selectedOptions || [])
        .map(opt => opt.value)
        .filter(val => val && val !== 'All');
      const params = new URLSearchParams();
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);
      if (city && city !== 'All') params.append('city', city);
      if (area && area !== 'All') params.append('area', area);
      if (status && status !== 'All') params.append('status', status);
      selectedProducts.forEach(p => params.append('products[]', p));
      window.open('/api/reports/employees/print?' + params.toString(), '_blank');
    });
  }
  
  // Products Print button functionality
  const productsPrintBtn = document.getElementById('productsPrintBtn');
  if (productsPrintBtn) {
    productsPrintBtn.addEventListener('click', function() {
      const fromDate = document.getElementById('prodFromDate')?.value || '';
      const toDate = document.getElementById('prodToDate')?.value || '';
      const city = document.getElementById('prodCity')?.value || '';
      const area = document.getElementById('prodArea')?.value || '';
      const status = document.getElementById('prodStatus')?.value || '';
      const params = new URLSearchParams();
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);
      if (city && city !== 'All') params.append('city', city);
      if (area && area !== 'All') params.append('area', area);
      if (status && status !== 'All') params.append('status', status);
      window.open('/api/reports/products/print?' + params.toString(), '_blank');
    });
  }
}

// Make functions globally available
window.initializeReports = initializeReports;

// Initialize when DOM is ready, but only if we're on the reports page
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if we're on the reports page (check for reports-specific elements)
    if (document.getElementById('advancedReportsSec') || document.getElementById('invFromDate')) {
      initializeReports();
      initializeDownloadAndPrint();
    }
  });
} else {
  // Only initialize if we're on the reports page (check for reports-specific elements)
  if (document.getElementById('advancedReportsSec') || document.getElementById('invFromDate')) {
    initializeReports();
    initializeDownloadAndPrint();
  }
}

// Helper Functions
function showInitialTableState(tableBodyId, reportType) {
  const tbody = document.getElementById(tableBodyId);
  if (!tbody) return;
  
  const reportNames = {
    'invoices': 'Invoice',
    'employees': 'Employee', 
    'products': 'Product'
  };
  
  const reportName = reportNames[reportType] || 'Report';
  
  // Set appropriate colspan based on table type
  const colSpans = {
    'invoices': 10, // Updated to include discount column
    'employees': 5,
    'products': 4
  };
  
  const colspan = colSpans[reportType] || 9;
  
  tbody.innerHTML = `
    <tr>
      <td colspan="${colspan}" class="px-6 py-12 text-center">
        <div class="w-20 h-20 mx-auto mb-6 bg-neutral-800/50 rounded-full flex items-center justify-center">
          <svg class="w-10 h-10 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-neutral-300 mb-2">Ready to Generate ${reportName} Report</h3>
        <p class="text-neutral-400 mb-4">Set your filters and click "Preview" to load detailed data</p>
        <div class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/20 border border-indigo-500/30 rounded-lg">
          <svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
          </svg>
          <span class="text-indigo-400 text-sm font-medium">Click Preview to load data</span>
        </div>
      </td>
    </tr>
  `;
}

// Invoice Summary Functions
function updateSummaryCardsLoading() {
  // Update main summary cards
  const summaryElements = [
    'summary-total-revenue',
    'summary-total-invoices', 
    'summary-vat-collected',
    'summary-avg-invoice',
    'summary-paid-invoices',
    'summary-paid-amount',
    'summary-pending-invoices',
    'summary-pending-amount',
    'summary-unique-customers'
  ];
  
  summaryElements.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = '...';
    }
  });
  
  // Update top performers sections
  const topProductsContainer = document.getElementById('summary-top-products');
  const topCustomersContainer = document.getElementById('summary-top-customers');
  
  if (topProductsContainer) {
    topProductsContainer.innerHTML = `
      <div class="flex items-center justify-center py-4">
        <div class="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mr-2"></div>
        <span class="text-neutral-400 text-sm">Loading...</span>
      </div>
    `;
  }
  
  if (topCustomersContainer) {
    topCustomersContainer.innerHTML = `
      <div class="flex items-center justify-center py-4">
        <div class="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
        <span class="text-neutral-400 text-sm">Loading...</span>
      </div>
    `;
  }
  
  // Update summary info
  const dateRangeElement = document.getElementById('summary-date-range');
  const recordCountElement = document.getElementById('summary-record-count');
  
  if (dateRangeElement) dateRangeElement.textContent = 'Loading...';
  if (recordCountElement) recordCountElement.textContent = '(0 records)';
}

async function updateInvoiceSummary() {
  try {
    // Build filters object
    const filters = {};
    
    const fromDate = document.getElementById('invFromDate')?.value;
    const toDate = document.getElementById('invToDate')?.value;
    const city = document.getElementById('invCity')?.value;
    const area = document.getElementById('invArea')?.value;
    const status = document.getElementById('invStatus')?.value;
    const productsSelect = document.getElementById('invProducts');
    const employeesSelect = document.getElementById('invEmployees');
    
    if (fromDate) filters.from_date = fromDate;
    if (toDate) filters.to_date = toDate;
    if (city && city !== 'All') filters.city = city;
    if (area && area !== 'All') filters.area = area;
    if (status && status !== 'All') filters.status = status;
    
    const selectedProducts = Array.from(productsSelect?.selectedOptions || [])
      .map(opt => opt.value)
      .filter(val => val && val !== 'All');
    if (selectedProducts.length > 0) {
      filters.products = selectedProducts;
    }
    
    const selectedEmployees = Array.from(employeesSelect?.selectedOptions || [])
      .map(opt => opt.value)
      .filter(val => val && val !== 'All');
    if (selectedEmployees.length > 0) {
      filters.employees = selectedEmployees;
    }
    
    // Fetch summary data
    const response = await fetch('/api/invoice-summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ filters })
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch summary data');
    }
    
    const data = await response.json();
    const summary = data.summary;
    
    // Update main summary cards
    document.getElementById('summary-total-revenue').textContent = `AED ${parseFloat(summary.total_revenue || 0).toFixed(2)}`;
    document.getElementById('summary-total-invoices').textContent = summary.total_invoices || 0;
    document.getElementById('summary-vat-collected').textContent = `AED ${parseFloat(summary.total_vat_collected || 0).toFixed(2)}`;
    document.getElementById('summary-avg-invoice').textContent = `AED ${parseFloat(summary.avg_invoice_value || 0).toFixed(2)}`;
    
    // Update status breakdown
    document.getElementById('summary-paid-invoices').textContent = summary.paid_invoices || 0;
    document.getElementById('summary-paid-amount').textContent = `AED ${parseFloat(summary.paid_amount || 0).toFixed(2)}`;
    document.getElementById('summary-pending-invoices').textContent = summary.pending_invoices || 0;
    document.getElementById('summary-pending-amount').textContent = `AED ${parseFloat(summary.pending_amount || 0).toFixed(2)}`;
    
    // Update unique customers
    document.getElementById('summary-unique-customers').textContent = summary.unique_customers || 0;
    
    // Update top products
    const topProductsContainer = document.getElementById('summary-top-products');
    if (topProductsContainer) {
      if (data.top_products && data.top_products.length > 0) {
        topProductsContainer.innerHTML = data.top_products.map((product, index) => `
          <div class="flex items-center justify-between p-3 bg-neutral-700/30 rounded-lg">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <span class="text-emerald-400 font-semibold text-sm">${index + 1}</span>
              </div>
              <div>
                <p class="text-white font-medium text-sm">${product.product_name}</p>
                <p class="text-neutral-400 text-xs">${product.invoice_count} invoices</p>
              </div>
            </div>
            <div class="text-right">
              <p class="text-emerald-400 font-semibold">AED ${parseFloat(product.total_revenue).toFixed(2)}</p>
              <p class="text-neutral-400 text-xs">${product.total_quantity} units</p>
            </div>
          </div>
        `).join('');
      } else {
        topProductsContainer.innerHTML = `
          <div class="text-center text-neutral-500 py-4">
            <svg class="w-8 h-8 mx-auto mb-2 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
            </svg>
            <p class="text-sm">No products found</p>
          </div>
        `;
      }
    }
    
    // Update top customers
    const topCustomersContainer = document.getElementById('summary-top-customers');
    if (topCustomersContainer) {
      if (data.top_customers && data.top_customers.length > 0) {
        topCustomersContainer.innerHTML = data.top_customers.map((customer, index) => `
          <div class="flex items-center justify-between p-3 bg-neutral-700/30 rounded-lg">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <span class="text-blue-400 font-semibold text-sm">${index + 1}</span>
              </div>
              <div>
                <p class="text-white font-medium text-sm">${customer.customer_name}</p>
                <p class="text-neutral-400 text-xs">${customer.invoice_count} invoices</p>
              </div>
            </div>
            <div class="text-right">
              <p class="text-blue-400 font-semibold">AED ${parseFloat(customer.total_spent).toFixed(2)}</p>
              <p class="text-neutral-400 text-xs">Avg: AED ${parseFloat(customer.avg_invoice_value).toFixed(2)}</p>
            </div>
          </div>
        `).join('');
      } else {
        topCustomersContainer.innerHTML = `
          <div class="text-center text-neutral-500 py-4">
            <svg class="w-8 h-8 mx-auto mb-2 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
            <p class="text-sm">No customers found</p>
          </div>
        `;
      }
    }
    
    // Update summary info
    const dateRangeElement = document.getElementById('summary-date-range');
    const recordCountElement = document.getElementById('summary-record-count');
    
    if (dateRangeElement) {
      if (fromDate && toDate) {
        const fromDateObj = new Date(fromDate);
        const toDateObj = new Date(toDate);
        dateRangeElement.textContent = `${fromDateObj.toLocaleDateString()} - ${toDateObj.toLocaleDateString()}`;
      } else if (fromDate) {
        dateRangeElement.textContent = `From ${new Date(fromDate).toLocaleDateString()}`;
      } else if (toDate) {
        dateRangeElement.textContent = `Until ${new Date(toDate).toLocaleDateString()}`;
      } else {
        dateRangeElement.textContent = 'All Time';
      }
    }
    
    if (recordCountElement) {
      recordCountElement.textContent = `(${summary.total_invoices || 0} records)`;
    }
    
  } catch (error) {
    console.error('Error updating invoice summary:', error);
    
    // Show error state in summary cards
    const summaryElements = [
      'summary-total-revenue',
      'summary-total-invoices', 
      'summary-vat-collected',
      'summary-avg-invoice',
      'summary-paid-invoices',
      'summary-paid-amount',
      'summary-pending-invoices',
      'summary-pending-amount',
      'summary-unique-customers'
    ];
    
    summaryElements.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = 'Error';
      }
    });
    
    const topProductsContainer = document.getElementById('summary-top-products');
    const topCustomersContainer = document.getElementById('summary-top-customers');
    
    if (topProductsContainer) {
      topProductsContainer.innerHTML = `
        <div class="text-center text-red-400 py-4">
          <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
          <p class="text-sm">Failed to load</p>
        </div>
      `;
    }
    
    if (topCustomersContainer) {
      topCustomersContainer.innerHTML = `
        <div class="text-center text-red-400 py-4">
          <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
          <p class="text-sm">Failed to load</p>
        </div>
      `;
    }
  }
} 