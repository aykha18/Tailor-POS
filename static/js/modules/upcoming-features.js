// Upcoming Features Module
class UpcomingFeatures {
  constructor() {
    this.features = {
      'ai-business-intelligence': {
        title: 'AI Business Intelligence & Insights',
        content: `
          <h4 class="text-xl font-semibold text-white mb-4">Data-Driven Business Growth</h4>
          <p class="mb-4">Transform your business data into actionable intelligence with advanced AI analytics:</p>
          <ul class="list-disc list-inside space-y-2 mb-4">
            <li><strong>Revenue Optimization:</strong> AI suggests optimal pricing strategies and product mix based on market analysis</li>
            <li><strong>Employee Performance Analysis:</strong> Identify top performers, training needs, and productivity optimization opportunities</li>
            <li><strong>Market Trend Analysis:</strong> Predict industry trends and adapt your business strategy proactively</li>
            <li><strong>Cash Flow Prediction:</strong> Forecast cash flow patterns and suggest optimal financial strategies</li>
            <li><strong>Growth Opportunities:</strong> Identify untapped markets, customer segments, and expansion possibilities</li>
            <li><strong>Competitive Intelligence:</strong> Monitor market changes and competitor activities to stay ahead</li>
          </ul>
          <p class="text-indigo-300"><strong>Business Impact:</strong> Increase revenue by 30%, optimize operations by 40%, and make strategic decisions that drive sustainable business growth.</p>
        `
      },
      'ai-smart-pricing': {
        title: 'AI-Powered Smart Pricing & Demand Forecasting',
        content: `
          <h4 class="text-xl font-semibold text-white mb-4">Intelligent Pricing & Inventory Management</h4>
          <p class="mb-4">Stay ahead of the market with AI-driven pricing and demand prediction:</p>
          <ul class="list-disc list-inside space-y-2 mb-4">
            <li><strong>Dynamic Pricing:</strong> AI analyzes market trends, competitor prices, and demand elasticity to suggest optimal pricing</li>
            <li><strong>Demand Forecasting:</strong> Predict which products will be in high demand based on seasonal patterns, events, and customer behavior</li>
            <li><strong>Price Optimization:</strong> Automatically adjust prices based on inventory levels, customer segments, and target profit margins</li>
            <li><strong>Competitive Analysis:</strong> Monitor competitor pricing in real-time and suggest competitive strategies</li>
            <li><strong>Seasonal Planning:</strong> Prepare for peak seasons with predictive analytics and optimal stock planning</li>
            <li><strong>Profit Maximization:</strong> Balance volume and margin to maximize overall profitability</li>
          </ul>
          <p class="text-indigo-300"><strong>Business Impact:</strong> Increase profit margins by 25%, reduce inventory costs by 35%, and eliminate stockouts while maximizing revenue opportunities.</p>
        `
      },
      'ai-inventory': {
        title: 'AI-Powered Inventory Management',
        content: `
          <h4 class="text-xl font-semibold text-white mb-4">Transform Your Inventory Management</h4>
          <p class="mb-4">Our AI-powered inventory system will revolutionize how you manage your stock:</p>
          <ul class="list-disc list-inside space-y-2 mb-4">
            <li><strong>Smart Demand Forecasting:</strong> AI algorithms predict future demand based on historical data, seasonal trends, and market conditions</li>
            <li><strong>Automatic Reorder Suggestions:</strong> Get intelligent recommendations for when and how much to reorder</li>
            <li><strong>Real-time Stock Alerts:</strong> Instant notifications when items are running low or out of stock</li>
            <li><strong>Waste Reduction:</strong> Minimize overstocking and reduce inventory carrying costs</li>
            <li><strong>Seasonal Planning:</strong> Prepare for peak seasons with predictive analytics</li>
          </ul>
          <p class="text-indigo-300"><strong>Business Impact:</strong> Reduce inventory costs by up to 30%, improve stock availability by 95%, and eliminate stockouts that lead to lost sales.</p>
        `
      },
      'multi-location': {
        title: 'Multi-Location Support',
        content: `
          <h4 class="text-xl font-semibold text-white mb-4">Scale Your Business Across Locations</h4>
          <p class="mb-4">Manage multiple store locations seamlessly from a single dashboard:</p>
          <ul class="list-disc list-inside space-y-2 mb-4">
            <li><strong>Centralized Management:</strong> Control all locations from one interface with role-based access</li>
            <li><strong>Unified Inventory:</strong> Real-time synchronization across all locations with transfer capabilities</li>
            <li><strong>Location-specific Reports:</strong> Compare performance across locations and identify top performers</li>
            <li><strong>Staff Management:</strong> Assign employees to specific locations with appropriate permissions</li>
            <li><strong>Unified Customer Database:</strong> Share customer information across all locations for better service</li>
          </ul>
          <p class="text-indigo-300"><strong>Business Impact:</strong> Expand your business footprint efficiently, reduce operational overhead by 40%, and provide consistent customer experience across all locations.</p>
        `
      },
      'analytics': {
        title: 'Advanced Analytics & Insights',
        content: `
          <h4 class="text-xl font-semibold text-white mb-4">Data-Driven Business Decisions</h4>
          <p class="mb-4">Unlock powerful insights to drive your business growth:</p>
          <ul class="list-disc list-inside space-y-2 mb-4">
            <li><strong>Predictive Analytics:</strong> Forecast sales trends and identify growth opportunities</li>
            <li><strong>Customer Behavior Analysis:</strong> Understand buying patterns and preferences</li>
            <li><strong>Performance Benchmarking:</strong> Compare your performance against industry standards</li>
            <li><strong>Profitability Analysis:</strong> Identify your most profitable products and customers</li>
            <li><strong>Real-time Dashboards:</strong> Monitor key metrics with customizable KPI dashboards</li>
          </ul>
          <p class="text-indigo-300"><strong>Business Impact:</strong> Make informed decisions that increase revenue by 25%, optimize pricing strategies, and identify new market opportunities.</p>
        `
      },
      'ecommerce': {
        title: 'E-commerce Integration',
        content: `
          <h4 class="text-xl font-semibold text-white mb-4">Unified Online & Offline Sales</h4>
          <p class="mb-4">Bridge the gap between your physical store and online presence:</p>
          <ul class="list-disc list-inside space-y-2 mb-4">
            <li><strong>Unified Inventory:</strong> Single inventory management for both online and offline sales</li>
            <li><strong>Order Synchronization:</strong> Process online orders through your POS system</li>
            <li><strong>Customer Sync:</strong> Unified customer profiles across all sales channels</li>
            <li><strong>Multi-channel Fulfillment:</strong> Offer buy online, pick up in store (BOPIS) options</li>
            <li><strong>Integrated Marketing:</strong> Coordinate promotions across all channels</li>
          </ul>
          <p class="text-indigo-300"><strong>Business Impact:</strong> Increase sales by 35% through omnichannel presence, reduce operational complexity, and provide seamless customer experience.</p>
        `
      },
      'loyalty': {
        title: 'Customer Loyalty Program',
        content: `
          <h4 class="text-xl font-semibold text-white mb-4">Build Lasting Customer Relationships</h4>
          <p class="mb-4">Create a powerful loyalty program that drives repeat business:</p>
          <ul class="list-disc list-inside space-y-2 mb-4">
            <li><strong>Points System:</strong> Reward customers for every purchase with customizable point values</li>
            <li><strong>Tiered Rewards:</strong> Create VIP tiers with exclusive benefits and higher rewards</li>
            <li><strong>Personalized Offers:</strong> AI-driven personalized promotions based on purchase history</li>
            <li><strong>Referral Program:</strong> Encourage word-of-mouth marketing with referral rewards</li>
            <li><strong>Birthday & Anniversary Rewards:</strong> Automated special offers on important dates</li>
          </ul>
          <p class="text-indigo-300"><strong>Business Impact:</strong> Increase customer retention by 60%, boost average order value by 20%, and create brand advocates who bring in new customers.</p>
        `
      },
      'mobile-app': {
        title: 'Native Mobile Applications',
        content: `
          <h4 class="text-xl font-semibold text-white mb-4">Take Your Business Mobile</h4>
          <p class="mb-4">Native mobile apps for iOS and Android with powerful features:</p>
          <ul class="list-disc list-inside space-y-2 mb-4">
            <li><strong>Offline Capabilities:</strong> Continue working even without internet connection</li>
            <li><strong>Push Notifications:</strong> Real-time alerts for sales, inventory, and customer updates</li>
            <li><strong>Mobile POS:</strong> Process sales anywhere with mobile payment integration</li>
            <li><strong>Inventory Scanning:</strong> Use device camera for barcode scanning and inventory management</li>
            <li><strong>Customer Management:</strong> Access customer information and history on the go</li>
          </ul>
          <p class="text-indigo-300"><strong>Business Impact:</strong> Increase employee productivity by 45%, provide better customer service, and enable flexible business operations from anywhere.</p>
        `
      }
    };
  }

  showFeatureModal(featureId) {
    const feature = this.features[featureId];
    if (!feature) return;

    const modalContainer = document.getElementById('featureModalContainer');
    const modalTitle = document.getElementById('featureModalTitle');
    const modalContent = document.getElementById('featureModalContent');

    if (modalContainer && modalTitle && modalContent) {
      modalTitle.textContent = feature.title;
      modalContent.innerHTML = feature.content;
      modalContainer.classList.remove('hidden');
    }
  }

  hideFeatureModal() {
    const modalContainer = document.getElementById('featureModalContainer');
    if (modalContainer) {
      modalContainer.classList.add('hidden');
    }
  }

  notifyWhenAvailable() {
    // Show notification that feature is coming soon
    if (window.showSimpleToast) {
      window.showSimpleToast('Thank you! We\'ll notify you when this feature becomes available.', 'success');
    } else {
      alert('Thank you! We\'ll notify you when this feature becomes available.');
    }
    this.hideFeatureModal();
  }
}

// Initialize the UpcomingFeatures class
window.UpcomingFeatures = new UpcomingFeatures();
