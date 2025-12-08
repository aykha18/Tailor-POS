/**
 * AI Dashboard Module
 * Handles customer segmentation, charts, and AI-powered insights
 */

class AIDashboard {
    constructor() {
        this.customerData = null;
        this.segmentData = null;
        this.chartUpdateTimeout = null;
        this.initializeEventListeners();
        this.loadCustomerSegmentation();
        
        // Cleanup on page unload
        window.addEventListener('beforeunload', () => this.cleanup());
    }

    initializeEventListeners() {
        // Refresh buttons
        const refreshAllBtn = document.getElementById('refreshAllAIBtn');
        const refreshSegmentationBtn = document.getElementById('refreshSegmentationBtn');
        const exportBtn = document.getElementById('exportSegmentationBtn');
        const segmentFilter = document.getElementById('segmentFilter');

        if (refreshAllBtn) {
            refreshAllBtn.addEventListener('click', () => this.refreshAllInsights());
        }

        if (refreshSegmentationBtn) {
            refreshSegmentationBtn.addEventListener('click', () => this.loadCustomerSegmentation());
        }

        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportSegmentationData());
        }

        if (segmentFilter) {
            segmentFilter.addEventListener('change', (e) => this.filterCustomersBySegment(e.target.value));
        }

        // Mobile menu toggle
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        if (mobileMenuToggle) {
            mobileMenuToggle.addEventListener('click', () => this.toggleMobileMenu());
        }
    }

    async loadCustomerSegmentation() {
        try {
            this.showLoadingState();
            
            const response = await fetch('/api/ai/customer-segmentation');
            const data = await response.json();
            
            if (data.success) {
                this.customerData = data.customers;
                this.segmentData = data.segments;
                
                this.updateSegmentationDashboard();
                this.updateSegmentationChart();
                this.updateCustomerTable();
                this.updateSegmentInsights();
                
                this.hideLoadingState();
                this.showSuccessMessage('Customer segmentation analysis completed successfully!');
            } else {
                this.hideLoadingState();
                this.showErrorMessage('Failed to load segmentation data: ' + data.error);
            }
        } catch (error) {
            console.error('Error loading customer segmentation:', error);
            this.hideLoadingState();
            this.showErrorMessage('Network error while loading segmentation data');
        }
    }

    showLoadingState() {
        const loading = document.getElementById('segmentationLoading');
        const cards = document.getElementById('segmentationCards');
        
        if (loading) loading.classList.remove('hidden');
        if (cards) cards.classList.add('hidden');
    }

    hideLoadingState() {
        const loading = document.getElementById('segmentationLoading');
        const cards = document.getElementById('segmentationCards');
        
        if (loading) loading.classList.add('hidden');
        if (cards) cards.classList.remove('hidden');
    }

    updateSegmentationDashboard() {
        if (!this.segmentData) return;

        // Update segment counts
        const counts = {
            'Loyal VIPs': 0,
            'Regular Customers': 0,
            'At-Risk Customers': 0,
            'New Customers': 0,
            'Occasional Buyers': 0
        };

        // Count customers in each segment
        this.customerData.forEach(customer => {
            if (counts.hasOwnProperty(customer.segment_label)) {
                counts[customer.segment_label]++;
            }
        });

        // Update display
        document.getElementById('loyalVipsCount').textContent = counts['Loyal VIPs'];
        document.getElementById('regularCustomersCount').textContent = counts['Regular Customers'];
        document.getElementById('atRiskCount').textContent = counts['At-Risk Customers'];
        document.getElementById('newCustomersCount').textContent = counts['New Customers'];
        document.getElementById('occasionalCount').textContent = counts['Occasional Buyers'];
    }

    updateSegmentationChart() {
        if (!this.segmentData) return;

        // Clear any existing timeout
        if (this.chartUpdateTimeout) {
            clearTimeout(this.chartUpdateTimeout);
        }

        // Add a small delay to ensure DOM is ready
        this.chartUpdateTimeout = setTimeout(() => {
            try {
                // Check if page is visible to prevent updates in background
                if (document.hidden) {
                    console.log('Page not visible, skipping chart update');
                    return;
                }
                
                const chartContainer = document.getElementById('segmentationChart');
                if (!chartContainer) {
                    console.warn('Chart container element not found');
                    return;
                }

                // Remove any existing visualization
                const existingViz = chartContainer.querySelector('.html-visualization');
                if (existingViz) {
                    existingViz.remove();
                }

                // Clear the container
                chartContainer.innerHTML = '';
                
                // Prepare chart data
                const labels = this.segmentData.map(s => s.label);
                const data = this.segmentData.map(s => s.count);
                
                // Only create visualization if we have data
                if (data.length === 0 || data.every(count => count === 0)) {
                    console.log('No data available for visualization');
                    chartContainer.innerHTML = '<div class="text-neutral-400 text-center">No data available for visualization</div>';
                    return;
                }
                
                // Create robust HTML-based visualization
                this.createHTMLVisualization(labels, data);
                
            } catch (error) {
                console.error('Error in updateSegmentationChart:', error);
            }
        }, 100); // Reduced delay since no Chart.js
    }

    updateSegmentInsights() {
        if (!this.segmentData) return;

        const insightsContainer = document.getElementById('segmentInsights');
        if (!insightsContainer) return;

        insightsContainer.innerHTML = this.segmentData.map(segment => `
            <div class="bg-neutral-900/50 p-4 rounded-lg border border-neutral-700">
                <div class="flex items-center justify-between mb-3">
                    <h6 class="font-semibold text-white">${segment.label}</h6>
                    <span class="text-2xl font-bold text-indigo-400">${segment.count}</span>
                </div>
                
                <div class="space-y-2 text-sm text-neutral-300">
                    <div class="flex justify-between">
                        <span>Total Revenue:</span>
                        <span class="text-white">AED ${segment.total_spent.toFixed(2)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Avg Order Value:</span>
                        <span class="text-white">AED ${segment.avg_order_value.toFixed(2)}</span>
                    </div>
                </div>
                
                <div class="mt-3 pt-3 border-t border-neutral-700">
                    <div class="text-xs text-neutral-400">
                        ${this.getSegmentDescription(segment.label)}
                    </div>
                </div>
            </div>
        `).join('');
    }

    getSegmentDescription(segmentLabel) {
        const descriptions = {
            'Loyal VIPs': 'High-value customers with frequent visits and high spending. Focus on retention and exclusive offers.',
            'Regular Customers': 'Stable customer base with consistent purchasing behavior. Encourage loyalty programs.',
            'At-Risk Customers': 'Declining engagement, may need re-engagement strategies to prevent churn.',
            'New Customers': 'Recently acquired with high growth potential. Focus on onboarding and engagement.',
            'Occasional Buyers': 'Infrequent purchases, opportunity for increased engagement and promotions.'
        };
        
        return descriptions[segmentLabel] || 'Customer segment with unique characteristics.';
    }

    updateCustomerTable() {
        if (!this.customerData) return;

        const tbody = document.getElementById('customerSegmentsTable');
        if (!tbody) return;

        tbody.innerHTML = this.customerData.map(customer => `
            <tr class="hover:bg-neutral-800/50 transition-colors duration-200">
                <td class="px-3 py-2">
                    <div>
                        <div class="font-medium text-white">${customer.customer_name || 'Unknown'}</div>
                        <div class="text-sm text-neutral-400">${customer.customer_mobile || 'No mobile'}</div>
                    </div>
                </td>
                <td class="px-3 py-2">
                    <span class="px-2 py-1 rounded-full text-xs font-medium ${this.getSegmentColorClass(customer.segment_label)}">
                        ${customer.segment_label}
                    </span>
                </td>
                <td class="px-3 py-2 text-white">AED ${customer.total_spent.toFixed(2)}</td>
                <td class="px-3 py-2 text-white">${customer.total_orders}</td>
                <td class="px-3 py-2 text-neutral-400">${this.formatDate(customer.last_order_date)}</td>
                <td class="px-3 py-2">
                    <div class="flex gap-2">
                        <button onclick="showCustomerModal(${JSON.stringify(customer).replace(/"/g, '&quot;')})" 
                                class="text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
                            View Details
                        </button>
                        <button onclick="this.editCustomer(${customer.customer_id})" 
                                class="text-yellow-400 hover:text-yellow-300 text-sm transition-colors">
                            Edit
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    getSegmentColorClass(segmentLabel) {
        const colorClasses = {
            'Loyal VIPs': 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
            'Regular Customers': 'bg-green-500/20 text-green-300 border border-green-500/30',
            'At-Risk Customers': 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
            'New Customers': 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
            'Occasional Buyers': 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
        };
        
        return colorClasses[segmentLabel] || colorClasses['Occasional Buyers'];
    }

    formatDate(dateString) {
        if (!dateString) return 'Never';
        
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid Date';
            
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) return 'Today';
            if (diffDays === 1) return 'Yesterday';
            if (diffDays < 7) return `${diffDays} days ago`;
            if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
            if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
            
            return date.toLocaleDateString();
        } catch (error) {
            return 'Invalid Date';
        }
    }

    filterCustomersBySegment(segmentFilter) {
        if (!this.customerData) return;

        const tbody = document.getElementById('customerSegmentsTable');
        if (!tbody) return;

        let filteredCustomers = this.customerData;
        
        if (segmentFilter && segmentFilter !== '') {
            filteredCustomers = this.customerData.filter(customer => 
                customer.segment_label === segmentFilter
            );
        }

        // Update table with filtered data
        tbody.innerHTML = filteredCustomers.map(customer => `
            <tr class="hover:bg-neutral-800/50 transition-colors duration-200">
                <td class="px-3 py-2">
                    <div>
                        <div class="font-medium text-white">${customer.customer_name || 'Unknown'}</div>
                        <div class="text-sm text-neutral-400">${customer.customer_mobile || 'No mobile'}</div>
                    </div>
                </td>
                <td class="px-3 py-2">
                    <span class="px-2 py-1 rounded-full text-xs font-medium ${this.getSegmentColorClass(customer.segment_label)}">
                        ${customer.segment_label}
                    </span>
                </td>
                <td class="px-3 py-2 text-white">AED ${customer.total_spent.toFixed(2)}</td>
                <td class="px-3 py-2 text-white">${customer.total_orders}</td>
                <td class="px-3 py-2 text-neutral-400">${this.formatDate(customer.last_order_date)}</td>
                <td class="px-3 py-2">
                    <div class="flex gap-2">
                        <button onclick="showCustomerModal(${JSON.stringify(customer).replace(/"/g, '&quot;')})" 
                                class="text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
                            View Details
                        </button>
                        <button onclick="this.editCustomer(${customer.customer_id})" 
                                class="text-yellow-400 hover:text-yellow-300 text-sm transition-colors">
                            Edit
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Update count display
        const countDisplay = document.createElement('div');
        countDisplay.className = 'text-sm text-neutral-400 mb-2';
        countDisplay.textContent = `Showing ${filteredCustomers.length} of ${this.customerData.length} customers`;
        
        // Insert count display above table
        const tableContainer = tbody.parentElement.parentElement;
        const existingCount = tableContainer.querySelector('.filter-count');
        if (existingCount) {
            existingCount.remove();
        }
        
        countDisplay.className = 'filter-count text-sm text-neutral-400 mb-2';
        tableContainer.insertBefore(countDisplay, tableContainer.firstChild);
    }

    async exportSegmentationData() {
        if (!this.customerData) {
            this.showErrorMessage('No data available for export');
            return;
        }

        try {
            const response = await fetch('/api/ai/export-segmentation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    format: 'csv',
                    data: this.customerData
                })
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `customer-segmentation-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                this.showSuccessMessage('Data exported successfully!');
            } else {
                this.showErrorMessage('Failed to export data');
            }
        } catch (error) {
            console.error('Export error:', error);
            this.showErrorMessage('Error during export');
        }
    }

    refreshAllInsights() {
        // Safely refresh customer segmentation
        try {
            this.loadCustomerSegmentation();
        } catch (error) {
            console.error('Error refreshing insights:', error);
            this.showErrorMessage('Error refreshing insights');
        }
        // Future: Add other AI features refresh calls here
    }

    toggleMobileMenu() {
        const sidebar = document.querySelector('aside');
        if (sidebar) {
            sidebar.classList.toggle('hidden');
        }
    }

    editCustomer(customerId) {
        // Redirect to customer edit page
        window.location.href = `/customers/edit/${customerId}`;
    }

    showSuccessMessage(message) {
        this.showNotification(message, 'success');
    }

    showErrorMessage(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full`;
        
        const bgColor = type === 'success' ? 'bg-green-600' : 
                       type === 'error' ? 'bg-red-600' : 'bg-blue-600';
        
        notification.className += ` ${bgColor} text-white`;
        
        notification.innerHTML = `
            <div class="flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    ${type === 'success' ? 
                        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>' :
                        type === 'error' ?
                        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>' :
                        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>'
                    }
                </svg>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }

    cleanup() {
        try {
            // Remove any existing HTML visualizations
            const chartContainer = document.getElementById('segmentationChart');
            if (chartContainer) {
                const existingViz = chartContainer.querySelector('.html-visualization');
                if (existingViz) {
                    existingViz.remove();
                }
                // Reset container content
                chartContainer.innerHTML = '<div class="text-neutral-400 text-center">Chart visualization</div>';
            }
        } catch (error) {
            console.warn('Error during cleanup:', error);
        }
    }

    createHTMLVisualization(labels, data) {
        try {
            const chartContainer = document.getElementById('segmentationChart');
            if (!chartContainer) return;

            // Create HTML-based visualization directly in the container
            const visualizationDiv = document.createElement('div');
            visualizationDiv.className = 'html-visualization';
            
            // Define colors for segments
            const colors = [
                '#8b5cf6', // Purple - Loyal VIPs
                '#10b981', // Green - Regular Customers
                '#f59e0b', // Yellow - At-Risk
                '#3b82f6', // Blue - New Customers
                '#6b7280'  // Gray - Occasional
            ];

            // Calculate total for percentages
            const total = data.reduce((sum, count) => sum + count, 0);
            const maxValue = Math.max(...data);

            // Create main visualization container
            visualizationDiv.innerHTML = `
                <div class="visualization-container" style="
                    height: 256px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 20px;
                    padding: 20px;
                ">
                    <!-- Doughnut-like visualization using CSS -->
                    <div class="doughnut-container" style="
                        position: relative;
                        width: 200px;
                        height: 200px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">
                        <div class="doughnut-hole" style="
                            position: absolute;
                            width: 80px;
                            height: 80px;
                            background: #1f2937;
                            border-radius: 50%;
                            z-index: 2;
                        "></div>
                        
                        <!-- Center text -->
                        <div class="center-text" style="
                            position: absolute;
                            z-index: 3;
                            text-align: center;
                            color: #ffffff;
                        ">
                            <div style="font-size: 24px; font-weight: bold;">${total}</div>
                            <div style="font-size: 12px; color: #9ca3af;">Total</div>
                        </div>
                    </div>
                    
                    <!-- Legend -->
                    <div class="legend" style="
                        display: flex;
                        flex-wrap: wrap;
                        gap: 15px;
                        justify-content: center;
                        margin-top: 10px;
                    ">
                        ${labels.map((label, index) => `
                            <div class="legend-item" style="
                                display: flex;
                                align-items: center;
                                gap: 8px;
                                font-size: 12px;
                                color: #ffffff;
                            ">
                                <div class="legend-color" style="
                                    width: 12px;
                                    height: 12px;
                                    background: ${colors[index]};
                                    border-radius: 50%;
                                "></div>
                                <span>${label}: ${data[index]} (${((data[index] / total) * 100).toFixed(1)}%)</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            // Add the segments as DOM elements
            const doughnutContainer = visualizationDiv.querySelector('.doughnut-container');
            if (doughnutContainer) {
                const segments = this.createDoughnutSegments(data, total, colors);
                segments.forEach(segment => {
                    doughnutContainer.appendChild(segment);
                });
            }

            chartContainer.appendChild(visualizationDiv);
            console.log('HTML visualization created successfully');
            
        } catch (error) {
            console.error('Error creating HTML visualization:', error);
        }
    }

    createDoughnutSegments(data, total, colors) {
        let currentAngle = 0;
        const segments = [];
        
        data.forEach((count, index) => {
            if (count > 0) {
                const percentage = count / total;
                const angle = percentage * 360;
                const startAngle = currentAngle;
                const endAngle = currentAngle + angle;
                
                // Create segment using CSS conic-gradient
                const segment = document.createElement('div');
                segment.style.cssText = `
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    background: conic-gradient(
                        ${colors[index]} ${startAngle}deg,
                        ${colors[index]} ${endAngle}deg,
                        transparent ${endAngle}deg,
                        transparent 360deg
                    );
                    z-index: 1;
                `;
                
                segments.push(segment);
                currentAngle = endAngle;
            }
        });
        
        return segments;
    }

    // Utility method to get customer recommendations
    getCustomerRecommendations(segmentLabel) {
        const recommendations = {
            'Loyal VIPs': [
                'Exclusive VIP programs and early access',
                'Personalized service and dedicated support',
                'Premium loyalty rewards and special discounts',
                'Invitation to exclusive events and previews'
            ],
            'Regular Customers': [
                'Loyalty program enrollment and points',
                'Regular communication about new products',
                'Bundle offers and volume discounts',
                'Feedback surveys and improvement suggestions'
            ],
            'At-Risk Customers': [
                'Re-engagement campaigns with special offers',
                'Personalized outreach to understand concerns',
                'Win-back promotions and incentives',
                'Customer satisfaction surveys and feedback'
            ],
            'New Customers': [
                'Welcome package and onboarding information',
                'First-time buyer discounts and promotions',
                'Educational content about products and services',
                'Regular follow-up to ensure satisfaction'
            ],
            'Occasional Buyers': [
                'Seasonal promotions and limited-time offers',
                'Cross-selling and upselling opportunities',
                'Newsletter and product updates',
                'Referral programs and incentives'
            ]
        };
        
        return recommendations[segmentLabel] || ['General customer engagement strategies'];
    }
}

// Initialize AI Dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('customerSegmentation')) {
        window.aiDashboard = new AIDashboard();
    }
});

// Global functions for customer modal
window.showCustomerModal = function(customerData) {
    const modal = document.getElementById('customerDetailsModal');
    const title = document.getElementById('customerModalTitle');
    const content = document.getElementById('customerModalContent');
    
    if (!modal || !title || !content) return;
    
    title.textContent = customerData.customer_name || 'Customer Details';
    
    const recommendations = window.aiDashboard ? 
        window.aiDashboard.getCustomerRecommendations(customerData.segment_label) : 
        ['Personalized marketing campaigns', 'Targeted promotions', 'Customer retention strategies'];
    
    content.innerHTML = `
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="text-sm text-neutral-400">Mobile</label>
                    <p class="text-white">${customerData.customer_mobile || 'N/A'}</p>
                </div>
                <div>
                    <label class="text-sm text-neutral-400">Segment</label>
                    <span class="px-2 py-1 rounded-full text-xs font-medium ${window.aiDashboard ? window.aiDashboard.getSegmentColorClass(customerData.segment_label) : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'}">
                        ${customerData.segment_label}
                    </span>
                </div>
                <div>
                    <label class="text-sm text-neutral-400">Total Spent</label>
                    <p class="text-white">AED ${customerData.total_spent.toFixed(2)}</p>
                </div>
                <div>
                    <label class="text-sm text-neutral-400">Total Orders</label>
                    <p class="text-white">${customerData.total_orders}</p>
                </div>
                <div>
                    <label class="text-sm text-neutral-400">Last Visit</label>
                    <p class="text-white">${window.aiDashboard ? window.aiDashboard.formatDate(customerData.last_order_date) : (customerData.last_order_date || 'Never')}</p>
                </div>
                <div>
                    <label class="text-sm text-neutral-400">Average Order</label>
                    <p class="text-white">AED ${customerData.avg_order_value?.toFixed(2) || '0.00'}</p>
                </div>
            </div>
            
            <div class="border-t border-neutral-700 pt-4">
                <h4 class="text-lg font-semibold text-white mb-2">AI Recommendations</h4>
                <ul class="space-y-2 text-sm">
                    ${recommendations.map(rec => `
                        <li class="flex items-start gap-2">
                            <svg class="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                            </svg>
                            <span>${rec}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        </div>
    `;
    
    modal.classList.remove('hidden');
};

window.closeCustomerModal = function() {
    const modal = document.getElementById('customerDetailsModal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

