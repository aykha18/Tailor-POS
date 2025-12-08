// Employees Module

let editingEmployeeId = null;

// Detect mobile/tablet
function isMobileOrTablet() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 1024;
}

// Mobile-only: enhance employee mobile input UX (digits-only, 9–10 length, no clearing)
function setupEmployeeMobileInputEnhancements() {
  if (!isMobileOrTablet()) return;
  const employeeMobileElement = document.getElementById('employeeMobile');
  if (!employeeMobileElement) return;

  // Set mobile-friendly attributes without affecting desktop markup
  employeeMobileElement.setAttribute('inputmode', 'numeric');
  employeeMobileElement.setAttribute('maxlength', '10');
  employeeMobileElement.setAttribute('pattern', '\\d{9,10}');

  // Sanitize input to digits only and cap to 10
  employeeMobileElement.addEventListener('input', function(e) {
    const sanitized = (e.target.value || '').replace(/\D/g, '').slice(0, 10);
    if (e.target.value !== sanitized) {
      e.target.value = sanitized;
    }
  });

  // Validate on blur: require at least 9 digits; do not clear value
  employeeMobileElement.addEventListener('blur', function(e) {
    const digits = (e.target.value || '').replace(/\D/g, '');
    if (digits && digits.length < 9) {
      if (window.showToast) {
        window.showToast('Please enter at least 9 digits for mobile number', 'warning');
      } else {
        alert('Please enter at least 9 digits for mobile number');
      }
      // Refocus to let user correct
      setTimeout(() => e.target.focus(), 0);
    }
  });
}

// Setup employee mobile autocomplete
function setupEmployeeMobileAutocomplete() {
  const employeeMobileElement = document.getElementById('employeeMobile');
  if (employeeMobileElement) {
    let employeeMobileDropdown = null;
    let debounceTimer = null;

    // Create employee mobile dropdown
    function createEmployeeMobileDropdown() {
      if (employeeMobileDropdown) {
        document.body.removeChild(employeeMobileDropdown);
      }
      
      employeeMobileDropdown = document.createElement('div');
      employeeMobileDropdown.id = 'employeeMobileDropdown';
      employeeMobileDropdown.className = 'fixed bg-neutral-900 border border-neutral-700 rounded-lg shadow-lg max-h-48 overflow-y-auto z-99999';
      employeeMobileDropdown.style.display = 'none';
      document.body.appendChild(employeeMobileDropdown);
      
      return employeeMobileDropdown;
    }

    // Show employee mobile suggestions
    function showEmployeeMobileSuggestions(employees) {
      if (!employeeMobileDropdown) {
        employeeMobileDropdown = createEmployeeMobileDropdown();
      }
      
      if (employees.length === 0) {
        employeeMobileDropdown.style.display = 'none';
        return;
      }

      const rect = employeeMobileElement.getBoundingClientRect();
      employeeMobileDropdown.style.left = rect.left + 'px';
      employeeMobileDropdown.style.top = (rect.bottom + 5) + 'px';
      employeeMobileDropdown.style.width = rect.width + 'px';
      employeeMobileDropdown.style.display = 'block';

      employeeMobileDropdown.innerHTML = employees.map(employee => `
        <div class="employee-mobile-suggestion-item px-3 py-2 hover:bg-neutral-800 cursor-pointer border-b border-neutral-700 last:border-b-0" 
             data-phone="${employee.phone}" 
             data-employee='${JSON.stringify(employee)}'>
          <div class="flex items-center justify-between">
            <div>
              <div class="text-white font-medium">${employee.name}</div>
              <div class="text-neutral-400 text-sm">${employee.phone}</div>
              <div class="text-neutral-500 text-xs">${employee.position || 'Employee'}</div>
            </div>
            <div class="text-xs text-neutral-500">
              ${employee.address || ''}
            </div>
          </div>
        </div>
      `).join('');

      // Add click handlers
      employeeMobileDropdown.querySelectorAll('.employee-mobile-suggestion-item').forEach(item => {
        item.addEventListener('click', function() {
          const employee = JSON.parse(this.dataset.employee);
          populateEmployeeFields(employee);
          employeeMobileElement.value = employee.phone;
          hideEmployeeMobileDropdown();
        });
      });
    }

    // Hide employee mobile dropdown
    function hideEmployeeMobileDropdown() {
      if (employeeMobileDropdown) {
        employeeMobileDropdown.style.display = 'none';
      }
    }

    // Search employees by mobile number
    async function searchEmployeesByMobile(query) {
      try {
        const response = await fetch(`/api/employees?search=${encodeURIComponent(query)}`);
        if (response.ok) {
          const employees = await response.json();
          // Filter employees whose phone number starts with the query
          const filteredEmployees = employees.filter(employee => 
            employee.phone && employee.phone.startsWith(query)
          );
          return filteredEmployees.slice(0, 5); // Limit to 5 suggestions
        }
        return [];
      } catch (error) {
        console.error('Error searching employees by mobile:', error);
        return [];
      }
    }

    // Debounced search function
    function debouncedEmployeeMobileSearch(query) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        if (query.length >= 5) {
          const employees = await searchEmployeesByMobile(query);
          showEmployeeMobileSuggestions(employees);
        } else {
          hideEmployeeMobileDropdown();
        }
      }, 300);
    }

    // Input event for real-time autocomplete
    employeeMobileElement.addEventListener('input', function(e) {
      const phone = e.target.value.trim();
      if (phone.length >= 5) {
        debouncedEmployeeMobileSearch(phone);
      } else {
        hideEmployeeMobileDropdown();
      }
    });

    // Focus event to show suggestions if there's a value
    employeeMobileElement.addEventListener('focus', function(e) {
      const phone = e.target.value.trim();
      if (phone.length >= 5) {
        debouncedEmployeeMobileSearch(phone);
      }
    });

    // Handle escape key
    employeeMobileElement.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        hideEmployeeMobileDropdown();
      }
    });

    // Hide dropdown when clicking outside
    document.addEventListener('click', function(e) {
      if (employeeMobileDropdown && !employeeMobileElement.contains(e.target) && !employeeMobileDropdown.contains(e.target)) {
        hideEmployeeMobileDropdown();
      }
    });
  }
}

// Populate employee fields
function populateEmployeeFields(employee) {
  const employeeNameElement = document.getElementById('employeeName');
  const employeeMobileElement = document.getElementById('employeeMobile');
  const employeeRoleElement = document.getElementById('employeeRole');
  
  if (employeeNameElement) employeeNameElement.value = employee.name || '';
  if (employeeMobileElement) employeeMobileElement.value = employee.phone || '';
  if (employeeRoleElement) employeeRoleElement.value = employee.position || '';
}

// Load and render employees with loading effects
async function loadEmployees() {
  // Show loading overlay
  const overlay = document.getElementById('employeeLoadingOverlay');
  const skeleton = document.getElementById('employeeSkeleton');
  const table = document.getElementById('employeeTable');
  const tableWrapper = document.getElementById('employeeTableWrapper');
  const form = document.getElementById('employeeForm');
  
  if (overlay) overlay.classList.remove('hidden');
  if (skeleton) skeleton.classList.remove('hidden');
  const tableContainer = tableWrapper || table;
  if (tableContainer) tableContainer.classList.add('opacity-0', 'translate-y-4');
  if (form) form.classList.add('opacity-0', 'translate-y-4');
  
  try {
    const resp = await fetch('/api/employees');
    const employees = await resp.json();
    const tbody = document.getElementById('employeeTableBody');
    if (!tbody) return;
    
    // Simulate loading delay for better UX
    await new Promise(resolve => setTimeout(resolve, 800));
    
    tbody.innerHTML = employees.length
      ? employees.map((e, index) => `
        <tr class="employee-item group hover:bg-neutral-800/50 transition-all duration-200 transform hover:scale-[1.01] hover:shadow-sm" data-id="${e.employee_id}" style="animation-delay: ${index * 0.1}s;">
          <td class="px-3 py-3">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 bg-indigo-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              <span class="font-medium text-neutral-200 group-hover:text-white transition-colors duration-200">${e.name || ''}</span>
            </div>
          </td>
          <td class="px-3 py-3">
            <span class="text-neutral-200 group-hover:text-white transition-colors duration-200">${e.phone || ''}</span>
          </td>
          <td class="px-3 py-3">
            <span class="text-neutral-200 group-hover:text-white transition-colors duration-200">${e.position || ''}</span>
          </td>
          <td class="px-3 py-3">
            <span class="text-neutral-200 group-hover:text-white transition-colors duration-200">${e.address || ''}</span>
          </td>
          <td class="px-3 py-3 flex gap-2">
            <button class="edit-employee-btn text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 px-3 py-2 rounded transition-all duration-200 transform hover:scale-110 hover:shadow-sm" data-id="${e.employee_id}">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
            </button>
            <button class="delete-employee-btn text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-2 rounded transition-all duration-200 transform hover:scale-110 hover:shadow-sm" data-id="${e.employee_id}">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
            </button>
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
            <p class="text-neutral-500 text-sm mt-1">Create your first employee above</p>
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
      if (tableContainer) {
        tableContainer.classList.remove('opacity-0', 'translate-y-4');
        tableContainer.classList.add('opacity-100', 'translate-y-0');
      }
    }, 400);
    
  } catch (error) {
    console.error('Error loading employees:', error);
    const tbody = document.getElementById('employeeTableBody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="px-6 py-8 text-center">
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
  } finally {
    // Hide loading elements
    if (overlay) overlay.classList.add('hidden');
    if (skeleton) skeleton.classList.add('hidden');
    
    // Setup event handlers after employees are loaded
    setupEmployeeTableHandlers();
    setupEmployeeFormHandler();
    setupEmployeeSwipeActions();
  }
}

// Setup employee table event handlers
function setupEmployeeTableHandlers() {
  const employeeTable = document.getElementById('employeeTable');
  const wrapper = document.getElementById('employeeTableWrapper');
  
  if (employeeTable) {
    // Remove existing event listener if any
    employeeTable.removeEventListener('click', employeeTableClickHandler);
    employeeTable.addEventListener('click', employeeTableClickHandler, { passive: true });
    // Also delegate touchend for mobile to mirror customers behavior
    employeeTable.removeEventListener('touchend', employeeTableClickHandler);
    employeeTable.addEventListener('touchend', employeeTableClickHandler, { passive: true });

    // Note: Removed direct event listeners to prevent double execution
    // Event delegation through employeeTableClickHandler is sufficient

    // Ensure horizontal scroll container has momentum on iOS
    if (wrapper) {
      wrapper.style.overflowX = 'auto';
      wrapper.style.webkitOverflowScrolling = 'touch';
    }
  }
}

function directEditEmployeeClick(e) {
  e.preventDefault();
  const id = e.currentTarget.getAttribute('data-id');
  if (id) editEmployee(id);
}

async function directDeleteEmployeeClick(e) {
  e.preventDefault();
  const id = e.currentTarget.getAttribute('data-id');
  if (!id) return;
  let confirmed = true;
  if (typeof showConfirmDialog === 'function') {
    confirmed = await showConfirmDialog('Are you sure you want to delete this employee? This action cannot be undone.', 'Delete Employee', 'delete');
  } else {
    confirmed = window.confirm('Delete this employee?');
  }
  if (confirmed) {
    try {
      const response = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      await loadEmployees();
      if (window.showToast) {
        window.showToast('Employee deleted successfully', 'success');
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
      if (window.showToast) {
        window.showToast(`Failed to delete employee: ${error.message}`, 'error');
      } else {
        alert(`Failed to delete employee: ${error.message}`);
      }
    }
  }
}

// Setup employee form submission handler
function setupEmployeeFormHandler() {
  const employeeForm = document.getElementById('employeeForm');
  
  if (employeeForm) {
    // Remove existing event listener if any
    employeeForm.removeEventListener('submit', handleEmployeeFormSubmit);
    employeeForm.addEventListener('submit', handleEmployeeFormSubmit);
  }
  
  // Setup employee mobile autocomplete
  setupEmployeeMobileAutocomplete();

  // Mobile/tablet-only enhancements for mobile input
  setupEmployeeMobileInputEnhancements();

  // Mobile/tablet-only responsive layout adjustments
  setupEmployeeMobileLayout();
}

// Make employee form stack on mobile/tablet without changing desktop
function setupEmployeeMobileLayout() {
  if (!isMobileOrTablet()) return;
  const form = document.getElementById('employeeForm');
  if (!form) return;

  // Force single-column grid on mobile/tablet
  form.style.display = 'grid';
  form.style.gridTemplateColumns = '1fr';
  form.style.gap = '12px';

  // Make each child take full width (one per row)
  Array.from(form.children).forEach(child => {
    if (child.tagName === 'DIV' || child.tagName === 'BUTTON') {
      child.style.gridColumn = '1 / -1';
    }
  });

  // Make submit button full width
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.style.width = '100%';
  }
}

// Mobile/tablet-only: swipe-to-edit/delete on employee rows
function setupEmployeeSwipeActions() {
  // Temporarily disabled to mirror customers behavior (buttons only)
  return; // No-op for now on all devices
  const table = document.getElementById('employeeTable');
  if (!table) return;

  let touchStartX = 0;
  let touchStartY = 0;
  let activeRow = null;
  let isSwiping = false;

  const removeActions = (row) => {
    const existing = row && row.querySelector('.emp-swipe-actions');
    if (existing) existing.remove();
    if (row) row.style.transform = '';
  };

  table.addEventListener('touchstart', (e) => {
    const row = e.target.closest('tr.employee-item');
    if (!row || e.target.closest('button')) return;
    activeRow = row;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    isSwiping = false;
  }, { passive: true });

  table.addEventListener('touchmove', (e) => {
    if (!activeRow) return;
    const dx = e.touches[0].clientX - touchStartX;
    const dy = Math.abs(e.touches[0].clientY - touchStartY);
    if (Math.abs(dx) > 10 && dy < 50) {
      e.preventDefault();
      isSwiping = true;
      const max = 120;
      const transform = Math.max(-max, Math.min(dx, max));
      activeRow.style.transform = `translateX(${transform}px)`;
    }
  }, { passive: false });

  table.addEventListener('touchend', async (e) => {
    if (!activeRow || !isSwiping) { activeRow = null; return; }
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 60) {
      // Show actions
      removeActions(activeRow);
      const actions = document.createElement('div');
      actions.className = 'emp-swipe-actions';
      actions.style.position = 'absolute';
      actions.style.right = '8px';
      actions.style.top = '50%';
      actions.style.transform = 'translateY(-50%)';
      actions.style.display = 'flex';
      actions.style.gap = '8px';
      actions.style.zIndex = '10';

      const editBtn = document.createElement('button');
      editBtn.textContent = 'Edit';
      editBtn.style.padding = '6px 10px';
      editBtn.style.background = 'rgba(59,130,246,0.15)';
      editBtn.style.color = '#93c5fd';
      editBtn.style.border = '1px solid #3b82f6';
      editBtn.style.borderRadius = '8px';
      editBtn.addEventListener('click', () => {
        const id = activeRow.getAttribute('data-id');
        if (id) editEmployee(id);
        removeActions(activeRow);
      });

      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete';
      delBtn.style.padding = '6px 10px';
      delBtn.style.background = 'rgba(239,68,68,0.15)';
      delBtn.style.color = '#fca5a5';
      delBtn.style.border = '1px solid #ef4444';
      delBtn.style.borderRadius = '8px';
      delBtn.addEventListener('click', async () => {
        const id = activeRow.getAttribute('data-id');
        if (!id) return;
        const confirmed = await showConfirmDialog(
          'Are you sure you want to delete this employee? This action cannot be undone.',
          'Delete Employee',
          'delete'
        );
        if (confirmed) {
          fetch(`/api/employees/${id}`, { method: 'DELETE' }).then(() => loadEmployees());
        }
        removeActions(activeRow);
      });

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);
      // Ensure row has positioning context
      activeRow.style.position = 'relative';
      activeRow.appendChild(actions);
      activeRow.style.transform = 'translateX(-120px)';
    } else {
      removeActions(activeRow);
    }
    activeRow = null;
    isSwiping = false;
  }, { passive: true });
}

// Handle employee form submission
async function handleEmployeeFormSubmit(e) {
  e.preventDefault();
  const form = e.target;
  
  const employeeData = {
    name: (form.querySelector('#employeeName') || {}).value || '',
    mobile: (form.querySelector('#employeeMobile') || {}).value || '',
    address: (form.querySelector('#employeeAddress') || {}).value || ''
  };
  // Optional role -> send as position if provided
  const roleEl = form.querySelector('#employeeRole');
  if (roleEl && roleEl.value) {
    employeeData.position = roleEl.value;
  }
  
  if (!employeeData.name) {
    alert('Employee name is required');
    return;
  }
  
  // Basic mobile number validation
  const mobileDigits = (employeeData.mobile || '').replace(/\D/g, '');
  if (mobileDigits && (mobileDigits.length < 9 || mobileDigits.length > 10)) {
    alert('Please enter a valid mobile number (9-10 digits)');
    return;
  }
  employeeData.mobile = mobileDigits;
  
  try {
    const url = editingEmployeeId ? `/api/employees/${editingEmployeeId}` : '/api/employees';
    const method = editingEmployeeId ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(employeeData)
    });
    
    if (response.ok) {
      // Reset form
      resetEmployeeForm();
      
      // Reload employees
      await loadEmployees();
      
      // Show success message
      if (window.showToast) {
        window.showToast('Employee saved successfully!', 'success');
      }
    } else {
      const errorData = await response.json();
      console.error('Server response:', response.status, errorData);
      
      // Show specific error message for duplicate mobile
      if (errorData.error && errorData.error.includes('Mobile number')) {
        if (window.showToast) {
          window.showToast(errorData.error, 'error');
        } else {
          alert(errorData.error);
        }
      } else {
        throw new Error(`Failed to save employee: ${response.status} - ${JSON.stringify(errorData)}`);
      }
    }
  } catch (error) {
    console.error('Error saving employee:', error);
    if (window.showToast) {
      window.showToast('Failed to save employee. Please try again.', 'error');
    }
  }
}

// Employee table click handler function
async function employeeTableClickHandler(e) {
  const target = e.target.closest('button');
  const editBtn = target && target.classList.contains('edit-employee-btn') ? target : e.target.closest('.edit-employee-btn');
  const deleteBtn = target && target.classList.contains('delete-employee-btn') ? target : e.target.closest('.delete-employee-btn');
  
  if (editBtn) {
    const id = editBtn.getAttribute('data-id');
    editEmployee(id);
  }
  if (deleteBtn) {
    const id = deleteBtn.getAttribute('data-id');
    let confirmed = true;
    if (typeof showConfirmDialog === 'function') {
      confirmed = await showConfirmDialog(
        'Are you sure you want to delete this employee? This action cannot be undone.',
        'Delete Employee',
        'delete'
      );
    } else {
      confirmed = window.confirm('Delete this employee?');
    }
    if (confirmed) {
      try {
        const response = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        await loadEmployees();
        if (window.showToast) {
          window.showToast('Employee deleted successfully', 'success');
        }
      } catch (error) {
        console.error('Error deleting employee:', error);
        if (window.showToast) {
          window.showToast(`Failed to delete employee: ${error.message}`, 'error');
        } else {
          alert(`Failed to delete employee: ${error.message}`);
        }
      }
    }
  }
}

// Edit employee function
async function editEmployee(id) {
  try {

    
    const response = await fetch(`/api/employees/${id}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const employee = await response.json();
    
    if (employee) {
  
      
      const nameEl = document.getElementById('employeeName');
      const mobileEl = document.getElementById('employeeMobile');
      const addressEl = document.getElementById('employeeAddress');
      const roleEl = document.getElementById('employeeRole');
      
      if (nameEl) nameEl.value = employee.name || '';
      if (mobileEl) mobileEl.value = employee.phone || '';
      if (addressEl) addressEl.value = employee.address || '';
      if (roleEl) {
        roleEl.value = employee.position || '';
    
      }
      
      editingEmployeeId = id;
      
      // Update button text to indicate editing mode
      const submitBtn = document.querySelector('#employeeForm button[type="submit"]');
      if (submitBtn) {
        submitBtn.innerHTML = `
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          Update Employee
        `;
      }
      
      // Show success message
      if (window.showToast) {
        window.showToast('Employee loaded for editing', 'success');
      }
    } else {
      throw new Error('No employee data received');
    }
  } catch (error) {
    console.error('Error editing employee:', error);
    
    // Show user-friendly error message
    if (window.showToast) {
      window.showToast(`Failed to load employee: ${error.message}`, 'error');
    } else {
      alert(`Failed to load employee: ${error.message}`);
    }
    
    // Reset form to clear any partial data
    resetEmployeeForm();
  }
}

// Function to reset employee form
function resetEmployeeForm() {
  const form = document.getElementById('employeeForm');
  
  if (form) {
    form.reset();
  }
  
  editingEmployeeId = null;
  
  // Reset button text
  const submitBtn = document.querySelector('#employeeForm button[type="submit"]');
  if (submitBtn) {
    submitBtn.innerHTML = `
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
      </svg>
      Add/Update
    `;
  }
}

// Make functions globally available
window.loadEmployees = loadEmployees;
window.editEmployee = editEmployee;
window.resetEmployeeForm = resetEmployeeForm;
window.deleteEmployee = directDeleteEmployeeClick; 