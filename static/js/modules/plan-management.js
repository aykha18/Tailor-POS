// Plan Management Module

// Plan management variables
let userPlan = null;
let enabledFeatures = [];
let lockedFeatures = [];
let planConfig = null;
let isPlanLoaded = false;

async function initializePlanManagement() {
  try {

    // Load plan status and config
    const [planStatus, configData] = await Promise.all([
      fetch('/api/plan/status').then(r => r.json()),
      fetch('/api/plan/config').then(r => r.json())
    ]);
    
    userPlan = planStatus;
    planConfig = configData;
    enabledFeatures = planStatus.enabled_features || [];
    lockedFeatures = planStatus.locked_features || [];
    isPlanLoaded = true;
    
    // Store plan data
    userPlan = {
      plan: planStatus.plan,
      expired: planStatus.expired,
      enabledFeatures,
      lockedFeatures
    };
    
    // Apply plan restrictions
    applyPlanRestrictions();
    
    // Show warnings if any
    if (planStatus.warnings && planStatus.warnings.length > 0) {
      showPlanWarnings(planStatus.warnings);
    }
    
    // Show upgrade prompt if trial expired
    if (planStatus.expired && planStatus.plan === 'trial') {
      showUpgradePrompt();
    }
    
  } catch (error) {
    console.error('Error loading plan:', error);
    // Default to trial if error
    userPlan = { plan: 'trial', expired: false };
    enabledFeatures = ['billing', 'product_management', 'customer_management'];
    lockedFeatures = ['dashboard', 'customer_search', 'db_backup_restore'];
    isPlanLoaded = true;
    applyPlanRestrictions();
  }
}

function applyPlanRestrictions() {
  if (!isPlanLoaded) return;
  

  
  // Lock navigation buttons for disabled features
  const navButtons = {
    'dashboard': document.querySelector('[data-go="dashSec"]'),
    'customer_search': document.querySelector('[data-go="customerSec"]'),
    'db_backup_restore': null
  };
  
  // Apply restrictions to navigation
  Object.entries(navButtons).forEach(([feature, button]) => {
    if (button && lockedFeatures.includes(feature)) {
      button.disabled = true;
      button.classList.add('opacity-50', 'cursor-not-allowed');
      button.title = `Upgrade to PRO to access ${feature.replace('_', ' ')}`;
      
      // Add lock icon
      const lockIcon = document.createElement('svg');
      lockIcon.className = 'w-3 h-3 ml-1';
      lockIcon.innerHTML = '<path fill="currentColor" d="M12 1a3 3 0 0 1 3 3v3a1 1 0 0 0 1 1h1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1V4a3 3 0 0 1 3-3z"/>';
      button.appendChild(lockIcon);
    }
  });
  
  // Lock sections based on plan
  if (userPlan.expired && userPlan.plan === 'trial') {

    // Lock all sections except billing
    const sections = ['productsSec', 'customerSec', 'employeeSec', 'dashSec'];
    sections.forEach(sectionId => {
      const section = document.getElementById(sectionId);
      if (section) {
        section.innerHTML = `
          <div class="flex flex-col items-center justify-center py-20">
            <div class="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
              <svg class="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-white mb-2">Feature Locked</h3>
            <p class="text-neutral-400 text-center mb-6 max-w-md">
              Your trial has expired. Upgrade to continue using all features.
            </p>
            <button onclick="showUpgradePrompt()" class="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-lg font-medium transition-colors">
              Upgrade Now
            </button>
          </div>
        `;
      }
    });
  }
  
  // Lock specific features for basic plan after expiry
  if (userPlan.expired && userPlan.plan === 'basic') {

    const proFeatures = ['dashboard', 'customer_search', 'db_backup_restore'];
    proFeatures.forEach(feature => {
      if (lockedFeatures.includes(feature)) {
        const sectionId = feature === 'dashboard' ? 'dashSec' : 
                         feature === 'customer_search' ? 'customerSec' : 'dashSec';
        const section = document.getElementById(sectionId);
        if (section) {
          section.innerHTML = `
            <div class="flex flex-col items-center justify-center py-20">
              <div class="w-24 h-24 bg-orange-500/20 rounded-full flex items-center justify-center mb-6">
                <svg class="w-12 h-12 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                </svg>
              </div>
              <h3 class="text-xl font-semibold text-white mb-2">PRO Feature</h3>
              <p class="text-neutral-400 text-center mb-6 max-w-md">
                This feature is only available in the PRO plan. Upgrade to unlock.
              </p>
              <button onclick="showUpgradePrompt()" class="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-lg font-medium transition-colors">
                Upgrade to PRO
              </button>
            </div>
          `;
        }
      }
    });
  }
}

function showPlanWarnings(warnings) {
  warnings.forEach(warning => {
    showToast(warning.message, 'warning');
  });
}

function showUpgradePrompt() {
  
  // Create upgrade modal
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center';
  modal.innerHTML = `
    <div class="bg-neutral-900 border border-neutral-700 rounded-xl p-8 max-w-md w-full mx-4">
      <div class="text-center mb-6">
        <div class="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-white mb-2">Upgrade Your Plan</h3>
        <p class="text-neutral-400">
          ${userPlan.plan === 'trial' ? 'Your trial has expired. Choose a plan to continue:' : 'Upgrade to unlock more features:'}
        </p>
      </div>
      
      <div class="space-y-3 mb-6">
        <div class="bg-neutral-800 border border-neutral-700 rounded-lg p-4">
          <div class="flex justify-between items-center mb-2">
            <h4 class="font-medium text-white">Basic Plan</h4>
            <span class="text-indigo-400 font-semibold">AED 3,000</span>
          </div>
          <p class="text-sm text-neutral-400 mb-3">All features for 30 days, then basic features only</p>
          <button onclick="upgradePlan('basic')" class="w-full bg-indigo-600 hover:bg-indigo-500 py-2 rounded-lg font-medium transition-colors">
            Choose Basic
          </button>
        </div>
        
        <div class="bg-neutral-800 border border-indigo-500/50 rounded-lg p-4">
          <div class="flex justify-between items-center mb-2">
            <h4 class="font-medium text-white">PRO Plan</h4>
            <span class="text-indigo-400 font-semibold">AED 5,000</span>
          </div>
          <p class="text-sm text-neutral-400 mb-3">Lifetime access to all features</p>
          <button onclick="upgradePlan('pro')" class="w-full bg-indigo-600 hover:bg-indigo-500 py-2 rounded-lg font-medium transition-colors">
            Choose PRO
          </button>
        </div>
      </div>
      
      <button onclick="closeUpgradeModal()" class="w-full text-neutral-400 hover:text-white transition-colors">
        Maybe Later
      </button>
    </div>
  `;
  
  document.body.appendChild(modal);
}

async function upgradePlan(planType) {
  try {

    const response = await fetch('/api/plan/upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_type: planType })
    });
    
    if (response.ok) {
      const result = await response.json();
      showToast(`Successfully upgraded to ${planType} plan!`, 'success');
      
      // Reload plan and reapply restrictions
      await initializePlanManagement();
      
      // Close modal
      closeUpgradeModal();
      
      // Reload page to refresh all features
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } else {
      throw new Error('Upgrade failed');
    }
  } catch (error) {
    console.error('Error upgrading plan:', error);
    showToast('Failed to upgrade plan. Please try again.', 'error');
  }
}

function closeUpgradeModal() {
  const modal = document.querySelector('.fixed.inset-0.bg-black\\/50');
  if (modal) {
    modal.remove();
  }
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg font-medium transition-all duration-300 transform translate-x-full`;
  
  const colors = {
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
    warning: 'bg-orange-600 text-white',
    info: 'bg-blue-600 text-white'
  };
  
  toast.classList.add(colors[type] || colors.info);
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  // Animate in
  setTimeout(() => {
    toast.classList.remove('translate-x-full');
  }, 100);
  
  // Animate out and remove
  setTimeout(() => {
    toast.classList.add('translate-x-full');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
} 