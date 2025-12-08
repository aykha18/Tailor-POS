// Loyalty Program Module
class LoyaltyProgram {
  constructor() {
    this.currentTab = 'config';
    this.loyaltyConfig = null;
    this.customers = [];
    this.tiers = [];
    this.rewards = [];
    this.analytics = null;
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadLoyaltyConfig();
  }

  setupEventListeners() {
    // Tab switching
    document.getElementById('tabLoyaltyConfig')?.addEventListener('click', () => this.switchTab('config'));
    document.getElementById('tabLoyaltyCustomers')?.addEventListener('click', () => this.switchTab('customers'));
    document.getElementById('tabLoyaltyTiers')?.addEventListener('click', () => this.switchTab('tiers'));
    document.getElementById('tabLoyaltyAnalytics')?.addEventListener('click', () => this.switchTab('analytics'));

    // Form submissions
    document.getElementById('loyaltyConfigForm')?.addEventListener('submit', (e) => this.saveLoyaltyConfig(e));
    
    // Search functionality
    document.getElementById('loyaltyCustomerSearch')?.addEventListener('input', (e) => this.searchCustomers(e.target.value));
    
    // Add buttons
    document.getElementById('addTierBtn')?.addEventListener('click', () => this.showAddTierModal());
    document.getElementById('addRewardBtn')?.addEventListener('click', () => this.showAddRewardModal());
  }

  switchTab(tabName) {
    this.currentTab = tabName;
    
    // Update tab buttons
    const tabs = ['config', 'customers', 'tiers', 'analytics'];
    tabs.forEach(tab => {
      const btn = document.getElementById(`tabLoyalty${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
      const content = document.getElementById(`loyalty${tab.charAt(0).toUpperCase() + tab.slice(1)}Tab`);
      
      if (btn && content) {
        if (tab === tabName) {
          btn.classList.add('bg-neutral-700', 'text-white');
          btn.classList.remove('bg-transparent', 'text-neutral-300');
          content.classList.remove('hidden');
        } else {
          btn.classList.remove('bg-neutral-700', 'text-white');
          btn.classList.add('bg-transparent', 'text-neutral-300');
          content.classList.add('hidden');
        }
      }
    });

    // Load tab-specific data
    switch (tabName) {
      case 'customers':
        this.loadLoyaltyCustomers();
        break;
      case 'tiers':
        this.loadLoyaltyTiers();
        this.loadLoyaltyRewards();
        break;
      case 'analytics':
        this.loadLoyaltyAnalytics();
        break;
    }
  }

  async loadLoyaltyConfig() {
    try {
      this.showLoading('loyaltyLoadingOverlay');
      
      const response = await fetch('/api/loyalty/config');
      const data = await response.json();
      
      if (data.success) {
        this.loyaltyConfig = data.config;
        this.populateConfigForm();
      } else {
        console.error('Failed to load loyalty config:', data.error);
        this.showNotification('Failed to load loyalty configuration', 'error');
      }
    } catch (error) {
      console.error('Error loading loyalty config:', error);
      this.showNotification('Error loading loyalty configuration', 'error');
    } finally {
      this.hideLoading('loyaltyLoadingOverlay');
    }
  }

  populateConfigForm() {
    if (!this.loyaltyConfig) return;

    const config = this.loyaltyConfig;
    
    // Populate form fields
    document.getElementById('enableLoyaltyProgram').checked = config.enable_loyalty_program || false;
    document.getElementById('loyaltyProgramName').value = config.loyalty_program_name || 'Loyalty Program';
    document.getElementById('pointsPerAed').value = config.loyalty_points_per_aed || 1.00;
    document.getElementById('aedPerPoint').value = config.loyalty_aed_per_point || 0.01;
    document.getElementById('minPointsRedemption').value = config.min_points_redemption || 100;
    document.getElementById('maxRedemptionPercent').value = config.max_points_redemption_percent || 20;
    document.getElementById('birthdayBonusPoints').value = config.birthday_bonus_points || 50;
    document.getElementById('anniversaryBonusPoints').value = config.anniversary_bonus_points || 100;
    document.getElementById('referralBonusPoints').value = config.referral_bonus_points || 200;
  }

  async saveLoyaltyConfig(event) {
    event.preventDefault();
    
    try {
      const formData = {
        enable_loyalty_program: document.getElementById('enableLoyaltyProgram').checked,
        loyalty_program_name: document.getElementById('loyaltyProgramName').value,
        loyalty_points_per_aed: parseFloat(document.getElementById('pointsPerAed').value) || 1.00,
        loyalty_aed_per_point: parseFloat(document.getElementById('aedPerPoint').value) || 0.01,
        min_points_redemption: parseInt(document.getElementById('minPointsRedemption').value) || 100,
        max_points_redemption_percent: parseInt(document.getElementById('maxRedemptionPercent').value) || 20,
        birthday_bonus_points: parseInt(document.getElementById('birthdayBonusPoints').value) || 50,
        anniversary_bonus_points: parseInt(document.getElementById('anniversaryBonusPoints').value) || 100,
        referral_bonus_points: parseInt(document.getElementById('referralBonusPoints').value) || 200
      };

      const response = await fetch('/api/loyalty/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (data.success) {
        this.showNotification('Loyalty configuration saved successfully', 'success');
        this.loyaltyConfig = { ...this.loyaltyConfig, ...formData };
      } else {
        this.showNotification('Failed to save loyalty configuration', 'error');
      }
    } catch (error) {
      console.error('Error saving loyalty config:', error);
      this.showNotification('Error saving loyalty configuration', 'error');
    }
  }

  async loadLoyaltyCustomers() {
    try {
      const response = await fetch('/api/loyalty/customers');
      const data = await response.json();
      
      if (data.success) {
        this.customers = data.customers;
        this.renderLoyaltyCustomers();
      } else {
        console.error('Failed to load loyalty customers:', data.error);
      }
    } catch (error) {
      console.error('Error loading loyalty customers:', error);
    }
  }

  renderLoyaltyCustomers() {
    const container = document.getElementById('loyaltyCustomersList');
    if (!container) return;

    if (this.customers.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-neutral-400">
          <svg class="w-12 h-12 mx-auto mb-4 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
          </svg>
          <p>No customers enrolled in loyalty program</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.customers.map(customer => `
      <div class="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4 hover:bg-neutral-800/70 transition-colors">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
              <span class="text-white font-semibold text-sm">${customer.name?.charAt(0)?.toUpperCase() || 'C'}</span>
            </div>
            <div>
              <h4 class="text-white font-medium">${customer.name || 'Unknown'}</h4>
              <p class="text-neutral-400 text-sm">${customer.phone || 'No phone'}</p>
            </div>
          </div>
          <div class="text-right">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style="background-color: ${this.getTierColor(customer.tier_level)}; color: white;">
                ${customer.tier_level || 'Not Enrolled'}
              </span>
            </div>
            <p class="text-neutral-400 text-sm mt-1">
              ${customer.available_points || 0} points
            </p>
          </div>
        </div>
        ${customer.loyalty_id ? `
          <div class="mt-3 pt-3 border-t border-neutral-700">
            <div class="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p class="text-neutral-400">Total Spent</p>
                <p class="text-white font-medium">AED ${customer.total_spent || 0}</p>
              </div>
              <div>
                <p class="text-neutral-400">Purchases</p>
                <p class="text-white font-medium">${customer.total_purchases || 0}</p>
              </div>
              <div>
                <p class="text-neutral-400">Join Date</p>
                <p class="text-white font-medium">${customer.join_date ? new Date(customer.join_date).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>
          </div>
        ` : `
          <div class="mt-3 pt-3 border-t border-neutral-700">
            <button onclick="loyaltyProgram.enrollCustomer(${customer.customer_id})" class="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Enroll in Loyalty Program
            </button>
          </div>
        `}
      </div>
    `).join('');
  }

  getTierColor(tierLevel) {
    const colors = {
      'Bronze': '#CD7F32',
      'Silver': '#C0C0C0',
      'Gold': '#FFD700',
      'Platinum': '#E5E4E2'
    };
    return colors[tierLevel] || '#6B7280';
  }

  searchCustomers(query) {
    if (!query.trim()) {
      this.renderLoyaltyCustomers();
      return;
    }

    const filtered = this.customers.filter(customer => 
      customer.name?.toLowerCase().includes(query.toLowerCase()) ||
      customer.phone?.includes(query) ||
      customer.email?.toLowerCase().includes(query.toLowerCase())
    );

    this.renderFilteredCustomers(filtered);
  }

  renderFilteredCustomers(customers) {
    const container = document.getElementById('loyaltyCustomersList');
    if (!container) return;

    if (customers.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-neutral-400">
          <p>No customers found matching your search</p>
        </div>
      `;
      return;
    }

    // Use the same rendering logic as renderLoyaltyCustomers but with filtered data
    container.innerHTML = customers.map(customer => `
      <div class="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4 hover:bg-neutral-800/70 transition-colors">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
              <span class="text-white font-semibold text-sm">${customer.name?.charAt(0)?.toUpperCase() || 'C'}</span>
            </div>
            <div>
              <h4 class="text-white font-medium">${customer.name || 'Unknown'}</h4>
              <p class="text-neutral-400 text-sm">${customer.phone || 'No phone'}</p>
            </div>
          </div>
          <div class="text-right">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style="background-color: ${this.getTierColor(customer.tier_level)}; color: white;">
                ${customer.tier_level || 'Not Enrolled'}
              </span>
            </div>
            <p class="text-neutral-400 text-sm mt-1">
              ${customer.available_points || 0} points
            </p>
          </div>
        </div>
        ${customer.loyalty_id ? `
          <div class="mt-3 pt-3 border-t border-neutral-700">
            <div class="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p class="text-neutral-400">Total Spent</p>
                <p class="text-white font-medium">AED ${customer.total_spent || 0}</p>
              </div>
              <div>
                <p class="text-neutral-400">Purchases</p>
                <p class="text-white font-medium">${customer.total_purchases || 0}</p>
              </div>
              <div>
                <p class="text-neutral-400">Join Date</p>
                <p class="text-white font-medium">${customer.join_date ? new Date(customer.join_date).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>
          </div>
        ` : `
          <div class="mt-3 pt-3 border-t border-neutral-700">
            <button onclick="loyaltyProgram.enrollCustomer(${customer.customer_id})" class="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Enroll in Loyalty Program
            </button>
          </div>
        `}
      </div>
    `).join('');
  }

  async enrollCustomer(customerId) {
    try {
      const response = await fetch(`/api/loyalty/customers/${customerId}/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });

      const data = await response.json();
      
      if (data.success) {
        this.showNotification('Customer enrolled successfully', 'success');
        this.loadLoyaltyCustomers(); // Refresh the list
      } else {
        this.showNotification(data.error || 'Failed to enroll customer', 'error');
      }
    } catch (error) {
      console.error('Error enrolling customer:', error);
      this.showNotification('Error enrolling customer', 'error');
    }
  }

  async loadLoyaltyTiers() {
    try {
      const response = await fetch('/api/loyalty/tiers');
      const data = await response.json();
      
      if (data.success) {
        this.tiers = data.tiers;
        this.renderLoyaltyTiers();
      } else {
        console.error('Failed to load loyalty tiers:', data.error);
      }
    } catch (error) {
      console.error('Error loading loyalty tiers:', error);
    }
  }

  renderLoyaltyTiers() {
    const container = document.getElementById('loyaltyTiersList');
    if (!container) return;

    if (this.tiers.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-neutral-400">
          <p>No loyalty tiers configured</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.tiers.map(tier => `
      <div class="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full flex items-center justify-center" style="background-color: ${tier.color_code}">
              <span class="text-white font-semibold text-xs">${(tier.tier_name || tier.tier_level || 'T').charAt(0)}</span>
            </div>
            <div>
              <h4 class="text-white font-medium">${tier.tier_name}</h4>
              <p class="text-neutral-400 text-sm">${tier.points_threshold} points required</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-white font-medium">${tier.discount_percent}% discount</p>
            <p class="text-neutral-400 text-sm">${tier.bonus_points_multiplier}x points</p>
          </div>
        </div>
        <div class="mt-3 pt-3 border-t border-neutral-700">
          <div class="flex flex-wrap gap-2">
            ${tier.free_delivery ? '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">Free Delivery</span>' : ''}
            ${tier.priority_service ? '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-400">Priority Service</span>' : ''}
            ${tier.exclusive_offers ? '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-500/20 text-purple-400">Exclusive Offers</span>' : ''}
          </div>
        </div>
      </div>
    `).join('');
  }

  async loadLoyaltyRewards() {
    try {
      const response = await fetch('/api/loyalty/rewards');
      const data = await response.json();
      
      if (data.success) {
        this.rewards = data.rewards;
        this.renderLoyaltyRewards();
      } else {
        console.error('Failed to load loyalty rewards:', data.error);
      }
    } catch (error) {
      console.error('Error loading loyalty rewards:', error);
    }
  }

  renderLoyaltyRewards() {
    const container = document.getElementById('loyaltyRewardsList');
    if (!container) return;

    if (this.rewards.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-neutral-400">
          <p>No loyalty rewards configured</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.rewards.map(reward => `
      <div class="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4">
        <div class="flex items-center justify-between">
          <div>
            <h4 class="text-white font-medium">${reward.reward_name}</h4>
            <p class="text-neutral-400 text-sm">${reward.description || 'No description'}</p>
          </div>
          <div class="text-right">
            <p class="text-white font-medium">${reward.points_cost} points</p>
            <p class="text-neutral-400 text-sm capitalize">${reward.reward_type.replace('_', ' ')}</p>
          </div>
        </div>
        ${reward.discount_percent > 0 || reward.discount_amount > 0 ? `
          <div class="mt-3 pt-3 border-t border-neutral-700">
            <p class="text-neutral-400 text-sm">
              ${reward.discount_percent > 0 ? `${reward.discount_percent}% discount` : ''}
              ${reward.discount_amount > 0 ? `AED ${reward.discount_amount} off` : ''}
            </p>
          </div>
        ` : ''}
      </div>
    `).join('');
  }

  async loadLoyaltyAnalytics() {
    try {
      const response = await fetch('/api/loyalty/analytics');
      const data = await response.json();
      
      if (data.success) {
        this.analytics = data.analytics;
        this.renderLoyaltyAnalytics();
      } else {
        console.error('Failed to load loyalty analytics:', data.error);
      }
    } catch (error) {
      console.error('Error loading loyalty analytics:', error);
    }
  }

  renderLoyaltyAnalytics() {
    if (!this.analytics) return;

    // Update analytics cards
    document.getElementById('totalEnrolledCustomers').textContent = this.analytics.total_customers || 0;
    document.getElementById('totalPointsIssued').textContent = this.analytics.total_points_issued || 0;
    document.getElementById('totalPointsRedeemed').textContent = this.analytics.total_points_redeemed || 0;
    document.getElementById('activePoints').textContent = this.analytics.active_points || 0;

    // Render tier distribution chart
    this.renderTierDistributionChart();
  }

  renderTierDistributionChart() {
    const chartContainer = document.getElementById('tierDistributionChart');
    if (!chartContainer || !this.analytics.tier_distribution) return;

    // Simple chart using CSS
    const tiers = Object.entries(this.analytics.tier_distribution);
    const total = tiers.reduce((sum, [_, count]) => sum + count, 0);

    chartContainer.innerHTML = `
      <div class="space-y-4">
        ${tiers.map(([tier, count]) => {
          const percentage = total > 0 ? (count / total) * 100 : 0;
          return `
            <div class="flex items-center gap-3">
              <div class="w-4 h-4 rounded" style="background-color: ${this.getTierColor(tier)}"></div>
              <span class="text-white font-medium min-w-[80px]">${tier}</span>
              <div class="flex-1 bg-neutral-700 rounded-full h-2">
                <div class="h-2 rounded-full transition-all duration-500" style="width: ${percentage}%; background-color: ${this.getTierColor(tier)}"></div>
              </div>
              <span class="text-neutral-400 text-sm min-w-[60px] text-right">${count} (${percentage.toFixed(1)}%)</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  showAddTierModal() {
    // Simple modal for adding tiers
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center';
    modal.innerHTML = `
      <div class="bg-neutral-900 border border-neutral-700 rounded-xl p-6 w-full max-w-md">
        <h3 class="text-lg font-semibold text-white mb-4">Add Loyalty Tier</h3>
        <form id="addTierForm" class="space-y-4">
          <div>
            <label class="text-sm font-medium text-neutral-300 mb-1">Tier Name</label>
            <input type="text" id="tierName" required class="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400/60">
          </div>
          <div>
            <label class="text-sm font-medium text-neutral-300 mb-1">Tier Level</label>
            <select id="tierLevel" required class="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400/60">
              <option value="Bronze">Bronze</option>
              <option value="Silver">Silver</option>
              <option value="Gold">Gold</option>
              <option value="Platinum">Platinum</option>
            </select>
          </div>
          <div>
            <label class="text-sm font-medium text-neutral-300 mb-1">Points Threshold</label>
            <input type="number" id="pointsThreshold" required min="0" class="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400/60">
          </div>
          <div>
            <label class="text-sm font-medium text-neutral-300 mb-1">Discount %</label>
            <input type="number" id="discountPercent" min="0" max="100" step="0.1" class="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400/60">
          </div>
          <div>
            <label class="text-sm font-medium text-neutral-300 mb-1">Points Multiplier</label>
            <input type="number" id="pointsMultiplier" min="0" step="0.1" value="1.0" class="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400/60">
          </div>
          <div class="flex gap-2">
            <button type="submit" class="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Add Tier
            </button>
            <button type="button" onclick="this.closest('.fixed').remove()" class="flex-1 bg-neutral-700 hover:bg-neutral-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    // Handle form submission
    document.getElementById('addTierForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = {
        tier_name: document.getElementById('tierName').value,
        tier_level: document.getElementById('tierLevel').value,
        points_threshold: parseInt(document.getElementById('pointsThreshold').value),
        discount_percent: parseFloat(document.getElementById('discountPercent').value) || 0,
        bonus_points_multiplier: parseFloat(document.getElementById('pointsMultiplier').value) || 1.0
      };

      try {
        const response = await fetch('/api/loyalty/tiers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData)
        });

        const data = await response.json();
        
        if (data.success) {
          this.showNotification('Tier added successfully', 'success');
          modal.remove();
          this.loadLoyaltyTiers();
        } else {
          this.showNotification('Failed to add tier', 'error');
        }
      } catch (error) {
        console.error('Error adding tier:', error);
        this.showNotification('Error adding tier', 'error');
      }
    });
  }

  showAddRewardModal() {
    // Simple modal for adding rewards
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center';
    modal.innerHTML = `
      <div class="bg-neutral-900 border border-neutral-700 rounded-xl p-6 w-full max-w-md">
        <h3 class="text-lg font-semibold text-white mb-4">Add Loyalty Reward</h3>
        <form id="addRewardForm" class="space-y-4">
          <div>
            <label class="text-sm font-medium text-neutral-300 mb-1">Reward Name</label>
            <input type="text" id="rewardName" required class="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400/60">
          </div>
          <div>
            <label class="text-sm font-medium text-neutral-300 mb-1">Reward Type</label>
            <select id="rewardType" required class="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400/60">
              <option value="discount">Discount</option>
              <option value="free_item">Free Item</option>
              <option value="points_bonus">Points Bonus</option>
              <option value="free_delivery">Free Delivery</option>
              <option value="priority_service">Priority Service</option>
            </select>
          </div>
          <div>
            <label class="text-sm font-medium text-neutral-300 mb-1">Points Cost</label>
            <input type="number" id="pointsCost" required min="0" class="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400/60">
          </div>
          <div>
            <label class="text-sm font-medium text-neutral-300 mb-1">Discount %</label>
            <input type="number" id="rewardDiscountPercent" min="0" max="100" step="0.1" class="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400/60">
          </div>
          <div>
            <label class="text-sm font-medium text-neutral-300 mb-1">Description</label>
            <textarea id="rewardDescription" rows="3" class="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400/60"></textarea>
          </div>
          <div class="flex gap-2">
            <button type="submit" class="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Add Reward
            </button>
            <button type="button" onclick="this.closest('.fixed').remove()" class="flex-1 bg-neutral-700 hover:bg-neutral-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    // Handle form submission
    document.getElementById('addRewardForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = {
        reward_name: document.getElementById('rewardName').value,
        reward_type: document.getElementById('rewardType').value,
        points_cost: parseInt(document.getElementById('pointsCost').value),
        discount_percent: parseFloat(document.getElementById('rewardDiscountPercent').value) || 0,
        description: document.getElementById('rewardDescription').value
      };

      try {
        const response = await fetch('/api/loyalty/rewards', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData)
        });

        const data = await response.json();
        
        if (data.success) {
          this.showNotification('Reward added successfully', 'success');
          modal.remove();
          this.loadLoyaltyRewards();
        } else {
          this.showNotification('Failed to add reward', 'error');
        }
      } catch (error) {
        console.error('Error adding reward:', error);
        this.showNotification('Error adding reward', 'error');
      }
    });
  }

  showLoading(overlayId) {
    const overlay = document.getElementById(overlayId);
    if (overlay) {
      overlay.classList.remove('hidden');
    }
  }

  hideLoading(overlayId) {
    const overlay = document.getElementById(overlayId);
    if (overlay) {
      overlay.classList.add('hidden');
    }
  }

  showNotification(message, type = 'info') {
    // Use existing notification system if available
    if (window.showModernAlert) {
      window.showModernAlert(message, type);
    } else if (window.showSimpleToast) {
      window.showSimpleToast(message, type);
    } else {
      // Fallback notification
      const notification = document.createElement('div');
      notification.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg text-white font-medium ${
        type === 'success' ? 'bg-green-600' : 
        type === 'error' ? 'bg-red-600' : 
        'bg-blue-600'
      }`;
      notification.textContent = message;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.remove();
      }, 3000);
    }
  }
}

// Initialize loyalty program when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.loyaltyProgram = new LoyaltyProgram();
});

// Export for use in other modules
window.LoyaltyProgram = LoyaltyProgram;
