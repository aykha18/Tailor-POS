// Dashboard Module

// Check if Chart.js is available
if (typeof Chart === 'undefined') {
  console.warn('Chart.js is not loaded. Dashboard charts will not be displayed.');
  // Create a fallback Chart constructor that does nothing
  window.Chart = function() {
    console.warn('Chart.js not available - chart creation skipped');
    return {
      destroy: function() {},
      update: function() {}
    };
  };
}

// Dashboard data loading function
async function loadDashboardData() {
  try {
    const refreshBtn = document.getElementById('refreshDashboardBtn');
    const originalText = refreshBtn.innerHTML;
    refreshBtn.innerHTML = '<svg data-lucide="loader-2" class="w-4 h-4 inline mr-2 animate-spin"></svg> Loading...';
    refreshBtn.disabled = true;
    
    const dashboardData = await fetch('/api/dashboard').then(res => res.json());
    
    if (dashboardData) {
      document.getElementById('todayRevenue').textContent = `AED ${parseFloat(dashboardData.total_revenue || 0).toFixed(2)}`;
      document.getElementById('todayBills').textContent = dashboardData.total_bills_today || 0;
      document.getElementById('pendingBills').textContent = dashboardData.pending_bills || 0;
      document.getElementById('totalCustomers').textContent = dashboardData.total_customers || 0;
      document.getElementById('todayExpenses').textContent = `AED ${parseFloat(dashboardData.total_expenses_today || 0).toFixed(2)}`;
      document.getElementById('monthExpenses').textContent = `AED ${parseFloat(dashboardData.total_expenses_month || 0).toFixed(2)}`;
      
      createRevenueChart(dashboardData.monthly_revenue || []);
      createRegionsChart(dashboardData.top_regions || []);
      createTrendingProductsChart(dashboardData.trending_products || []);
      createRepeatedCustomersChart(dashboardData.repeated_customers || []);
      
      const empAnalytics = await fetch('/api/employee-analytics').then(res => res.json());
      if (empAnalytics) {
        createEmployeeBarChart(empAnalytics.top5 || []);
        createEmployeePieChart(empAnalytics.shares || []);
      }
    } else {
      document.getElementById('todayRevenue').textContent = 'Error';
      document.getElementById('todayBills').textContent = 'Error';
      document.getElementById('pendingBills').textContent = 'Error';
      document.getElementById('totalCustomers').textContent = 'Error';
      document.getElementById('todayExpenses').textContent = 'Error';
      document.getElementById('monthExpenses').textContent = 'Error';
    }
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    document.getElementById('todayRevenue').textContent = 'Error';
    document.getElementById('todayBills').textContent = 'Error';
    document.getElementById('pendingBills').textContent = 'Error';
    document.getElementById('totalCustomers').textContent = 'Error';
    document.getElementById('todayExpenses').textContent = 'Error';
    document.getElementById('monthExpenses').textContent = 'Error';
  } finally {
    const refreshBtn = document.getElementById('refreshDashboardBtn');
    refreshBtn.innerHTML = '<svg data-lucide="refresh-cw" class="w-4 h-4 inline mr-2"></svg> Refresh';
    refreshBtn.disabled = false;
    
    // Safe lucide icon creation with fallback
    try {
      if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
      } else {
        console.warn('Lucide library not available, using fallback icons');
        // Fallback: replace lucide icons with simple text or emoji
        const lucideIcons = document.querySelectorAll('[data-lucide]');
        lucideIcons.forEach(icon => {
          const iconName = icon.getAttribute('data-lucide');
          if (iconName === 'refresh-cw') {
            icon.innerHTML = '🔄';
          } else if (iconName === 'loader-2') {
            icon.innerHTML = '⏳';
          }
        });
      }
    } catch (lucideError) {
      console.warn('Error creating lucide icons:', lucideError);
    }
  }
}

// Chart creation functions
function createRevenueChart(data) {
  const ctx = document.getElementById('revenueChart');
  if (!ctx) return;
  
  if (window.revenueChart && typeof window.revenueChart.destroy === 'function') {
    window.revenueChart.destroy();
  }
  
  // Ensure data is an array
  if (!data || !Array.isArray(data)) {
    data = [];
  }
  
  const labels = data.map(item => {
    const [year, month] = item.month.split('-');
    return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  });
  const values = data.map(item => parseFloat(item.revenue || 0));
  
  const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 260);
  gradient.addColorStop(0, '#6366f1');
  gradient.addColorStop(0.5, '#8b5cf6');
  gradient.addColorStop(1, '#06b6d4');
  
  window.revenueChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Revenue (AED)',
        data: values,
        backgroundColor: gradient,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#fff',
        hoverBackgroundColor: '#a5b4fc',
        hoverBorderColor: '#6366f1',
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `AED ${Number(ctx.raw).toLocaleString()}`
          }
        }
      },
      scales: {
        y: { 
          beginAtZero: true, 
          ticks: { color: '#9ca3af' }, 
          grid: { color: 'rgba(255,255,255,0.1)' } 
        },
        x: { 
          ticks: { color: '#9ca3af' }, 
          grid: { color: 'rgba(255,255,255,0.1)' } 
        }
      }
    }
  });
}

function createRegionsChart(data) {
  const ctx = document.getElementById('regionsChart');
  if (!ctx) return;
  
  if (window.regionsChart && typeof window.regionsChart.destroy === 'function') {
    window.regionsChart.destroy();
  }
  
  // Ensure data is an array
  if (!data || !Array.isArray(data)) {
    data = [];
  }
  
  const labels = data.map(item => item.area || 'Unknown');
  const values = data.map(item => parseFloat(item.sales || 0));
  
  window.regionsChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: [
          '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
          '#84cc16', '#f97316', '#ec4899', '#6366f1', '#14b8a6'
        ],
        hoverOffset: 24,
        offset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#9ca3af', padding: 10 }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              return `${label}: AED ${value.toLocaleString()}`;
            }
          }
        }
      }
    }
  });
}

function createTrendingProductsChart(data) {
  const ctx = document.getElementById('trendingProductsChart');
  if (!ctx) return;
  
  if (window.trendingProductsChart && typeof window.trendingProductsChart.destroy === 'function') {
    window.trendingProductsChart.destroy();
  }
  
  // Ensure data is an array
  if (!data || !Array.isArray(data)) {
    data = [];
  }
  
  const labels = data.map(item => item.product_name || 'Unknown');
  const values = data.map(item => parseInt(item.qty_sold || 0));
  const revenues = data.map(item => parseFloat(item.total_revenue || 0));
  
  window.trendingProductsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Quantity Sold',
        data: values,
        backgroundColor: '#8b5cf6',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: function(context) { return context[0].label; },
            label: function(context) {
              const idx = context.dataIndex;
              const qty = values[idx];
              const revenue = revenues[idx];
              return [`${qty} sold`, `Total Revenue: AED ${revenue.toLocaleString()}`];
            }
          }
        }
      },
      scales: {
        x: { 
          beginAtZero: true, 
          grid: { color: 'rgba(255, 255, 255, 0.1)' }, 
          ticks: { color: '#9ca3af' } 
        },
        y: { 
          grid: { color: 'rgba(255, 255, 255, 0.1)' }, 
          ticks: { color: '#9ca3af' } 
        }
      }
    }
  });
}

function createRepeatedCustomersChart(data) {
  const ctx = document.getElementById('repeatedCustomersChart');
  if (!ctx) return;
  
  if (window.repeatedCustomersChart && typeof window.repeatedCustomersChart.destroy === 'function') {
    window.repeatedCustomersChart.destroy();
  }
  
  // Ensure data is an array
  if (!data || !Array.isArray(data)) {
    data = [];
  }
  
  const labels = data.map(item => item.customer_name || 'Unknown');
  const invoiceCounts = data.map(item => item.invoice_count || 0);
  const revenues = data.map(item => parseFloat(item.total_revenue || 0));
  
  window.repeatedCustomersChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Invoices',
        data: invoiceCounts,
        backgroundColor: '#06b6d4',
        borderRadius: 4,
        maxBarThickness: 32
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: function(context) { return context[0].label; },
            label: function(context) {
              const idx = context.dataIndex;
              const invoices = invoiceCounts[idx];
              const revenue = revenues[idx];
              return [`${invoices} invoices`, `Total Revenue: AED ${revenue.toLocaleString()}`];
            }
          }
        }
      },
      scales: {
        x: { 
          beginAtZero: true, 
          grid: { color: 'rgba(255,255,255,0.1)' }, 
          ticks: { color: '#9ca3af' } 
        },
        y: { 
          grid: { color: 'rgba(255,255,255,0.1)' }, 
          ticks: { color: '#9ca3af' } 
        }
      }
    }
  });
}

function createEmployeeBarChart(data) {
  const ctx = document.getElementById('employeeBarChart');
  if (!ctx) return;
  
  if (window.employeeBarChart && typeof window.employeeBarChart.destroy === 'function') {
    window.employeeBarChart.destroy();
  }
  
  // Ensure data is an array
  if (!data || !Array.isArray(data)) {
    data = [];
  }
  
  const labels = data.map(e => e.name || 'Unknown');
  const values = data.map(e => Number(e.total_revenue) || 0);
  
  window.employeeBarChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Revenue (AED)',
        data: values,
        backgroundColor: '#f59e0b',
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#fff',
        hoverBackgroundColor: '#fbbf24',
        hoverBorderColor: '#f59e0b',
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `AED ${Number(ctx.raw).toLocaleString()}`
          }
        }
      },
      indexAxis: 'y',
      scales: {
        x: { 
          beginAtZero: true, 
          ticks: { color: '#9ca3af' }, 
          grid: { color: 'rgba(255,255,255,0.1)' } 
        },
        y: { 
          ticks: { color: '#9ca3af' }, 
          grid: { color: 'rgba(255,255,255,0.1)' } 
        }
      }
    }
  });
}

function createEmployeePieChart(data) {
  const ctx = document.getElementById('employeePieChart');
  if (!ctx) return;
  
  if (window.employeePieChart && typeof window.employeePieChart.destroy === 'function') {
    window.employeePieChart.destroy();
  }
  
  // Ensure data is an array
  if (!data || !Array.isArray(data)) {
    data = [];
  }
  
  const labels = data.map(e => e.name || 'Unknown');
  const values = data.map(e => parseFloat(e.total_revenue || 0));
  
  window.employeePieChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: [
          '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
          '#84cc16', '#f97316', '#ec4899', '#6366f1', '#14b8a6'
        ],
        hoverOffset: 24,
        offset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          position: 'bottom', 
          labels: { color: '#9ca3af', padding: 10 } 
        },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.label}: AED ${ctx.parsed.toLocaleString()}`
          }
        }
      }
    }
  });
}

// Backup table functionality
async function loadBackupTable() {
  try {
    const resp = await fetch('/api/backups');
    const backups = await resp.json();
    const tbody = document.getElementById('backupTableBody');
    
    if (!Array.isArray(backups)) {
      showToast(backups.error || 'Failed to load backups', 'error');
      tbody.innerHTML = '';
      return;
    }
    
    tbody.innerHTML = backups.map(b => `
      <tr>
        <td class="px-3 py-2">${b.date}</td>
        <td class="px-3 py-2">${b.name}</td>
        <td class="px-3 py-2 flex gap-2">
          <button class="download-backup-btn bg-blue-600 hover:bg-blue-500 text-white rounded px-3 py-1" data-fn="${b.name}">Download</button>
          <button class="restore-backup-btn bg-green-600 hover:bg-green-500 text-white rounded px-3 py-1" data-fn="${b.name}">Restore</button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading backup table:', error);
    showToast('Failed to load backups', 'error');
  }
}

// Utility functions
function showToast(msg, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg text-white font-medium transform translate-x-full transition-transform duration-300 ${
    type === 'success' ? 'bg-green-600' :
    type === 'error' ? 'bg-red-600' :
    type === 'warning' ? 'bg-yellow-600' :
    'bg-blue-600'
  }`;
  toast.textContent = msg;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.remove('translate-x-full');
  }, 100);
  
  setTimeout(() => {
    toast.classList.add('translate-x-full');
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, duration);
}

function showConfirmDialog(message, title = 'Confirm Action', type = 'delete') {
  return new Promise((resolve) => {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center';
    
    const colors = {
      delete: 'bg-red-600 hover:bg-red-700',
      warning: 'bg-yellow-600 hover:bg-yellow-700',
      info: 'bg-blue-600 hover:bg-blue-700'
    };
    
    modalOverlay.innerHTML = `
      <div class="bg-neutral-900 border border-neutral-700 rounded-xl p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold mb-2">${title}</h3>
        <p class="text-neutral-300 mb-6">${message}</p>
        <div class="flex gap-3 justify-end">
          <button class="px-4 py-2 rounded-lg border border-neutral-600 hover:bg-neutral-800 transition-colors cancel-btn">
            Cancel
          </button>
          <button class="px-4 py-2 rounded-lg text-white transition-colors confirm-btn ${colors[type] || colors.delete}">
            Confirm
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modalOverlay);
    
    function cleanup(result) {
      document.body.removeChild(modalOverlay);
      resolve(result);
    }
    
    function onConfirm() {
      cleanup(true);
    }
    
    function onCancel() {
      cleanup(false);
    }
    
    modalOverlay.querySelector('.confirm-btn').addEventListener('click', onConfirm);
    modalOverlay.querySelector('.cancel-btn').addEventListener('click', onCancel);
    
    modalOverlay.addEventListener('click', function(e) {
      if (e.target === modalOverlay) {
        onCancel();
      }
    });
  });
}

// Make functions globally available
window.showToast = showToast;
window.showConfirmDialog = showConfirmDialog;
window.createRevenueChart = createRevenueChart;
window.createRegionsChart = createRegionsChart;
window.createTrendingProductsChart = createTrendingProductsChart;
window.createRepeatedCustomersChart = createRepeatedCustomersChart;
window.createEmployeeBarChart = createEmployeeBarChart;
window.createEmployeePieChart = createEmployeePieChart;
window.loadBackupTable = loadBackupTable;
window.loadDashboardData = loadDashboardData;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    // Set up dashboard refresh button
    const refreshBtn = document.getElementById('refreshDashboardBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', loadDashboardData);
    }
    
    // Set up dashboard navigation button
    const dashboardBtn = document.querySelector('[data-go="dashSec"]');
    if (dashboardBtn) {
      dashboardBtn.addEventListener('click', loadDashboardData);
    }
    
    // Settings button is now disabled, so no need to set up event listener
    // const settingsBtn = document.querySelector('.nav-btn[data-go="settingsSec"]');
    // if (settingsBtn) {
    //   settingsBtn.addEventListener('click', loadBackupTable);
    // }
  });
} else {
  // Initialize immediately if DOM is already loaded
  const refreshBtn = document.getElementById('refreshDashboardBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadDashboardData);
  }
  
  const dashboardBtn = document.querySelector('[data-go="dashSec"]');
  if (dashboardBtn) {
    dashboardBtn.addEventListener('click', loadDashboardData);
  }
  
  // Settings button is now disabled, so no need to set up event listener
  // const settingsBtn = document.querySelector('.nav-btn[data-go="settingsSec"]');
  // if (settingsBtn) {
  //   settingsBtn.addEventListener('click', loadBackupTable);
  // }
} 