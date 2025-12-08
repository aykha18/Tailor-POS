/**
 * Catalog Scanner Module
 * 
 * Provides functionality to scan shop catalogs and automatically create 
 * product types and products in the Tajir POS system.
 * 
 * Features:
 * - CSV/Excel file upload and parsing
 * - Manual data entry with JSON support
 * - Intelligent catalog analysis
 * - Automatic product type and product suggestions
 * - Batch product creation
 * 
 * @author Tajir POS Team
 * @version 1.0.0
 */

class CatalogScanner {
    /**
     * Initialize the Catalog Scanner
     */
    constructor() {
        this.catalogData = [];
        this.analysis = null;
        this.suggestions = null;
        this.isProcessing = false;
        this.maxFileSize = 10 * 1024 * 1024; // 10MB limit
        this.supportedFormats = ['.csv', '.xlsx', '.xls'];
        
        this.init();
    }

    /**
     * Initialize the scanner
     */
    init() {
        this.createUI();
        this.bindEvents();
        console.log('Catalog Scanner initialized successfully');
    }

    /**
     * Create the modal UI
     */
    createUI() {
        const modalHTML = `
            <div id="catalogScannerModal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50">
                <div class="flex items-center justify-center min-h-screen p-4">
                    <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full overflow-y-auto modal-scroll" style="max-height: 90vh;">
                        <!-- Header -->
                        <div class="flex items-center justify-between p-6 border-b">
                            <h2 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                Upload Products
                            </h2>
                            <button onclick="window.catalogScanner.closeModal()" class="text-gray-500 hover:text-gray-700 transition-colors">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                        
                        <!-- Content -->
                        <div class="p-6">
                            <!-- Step 1: Upload Catalog -->
                            <div id="step1" class="step-content">
                                <h3 class="text-lg font-semibold mb-4">Step 1: Upload Your Catalog</h3>
                                
                                <!-- File Upload Section -->
                                <div class="mb-6">
                                    <label class="block text-sm font-medium text-gray-700 mb-2">
                                        Upload CSV/Excel file or paste catalog data
                                    </label>
                                    
                                    <!-- Sample Template Download -->
                                    <div class="mb-3">
                                        <a href="/static/sample_catalog.csv" download 
                                           class="text-blue-600 hover:text-blue-800 text-sm underline flex items-center gap-1">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                            </svg>
                                            Download Sample CSV Template
                                        </a>
                                    </div>
                                    
                                    <!-- Upload Area -->
                                    <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 transition-colors">
                                        <input type="file" id="catalogFile" accept=".csv,.xlsx,.xls" class="hidden">
                                        <div class="space-y-4">
                                            <svg class="w-12 h-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                                            </svg>
                                            <div>
                                                <button onclick="document.getElementById('catalogFile').click()" 
                                                        class="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                                                    Choose File
                                                </button>
                                                <p class="text-sm text-gray-500 mt-2">or drag and drop files here</p>
                                                <p class="text-xs text-gray-400 mt-1">Supported: CSV, Excel (max 10MB)</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Manual Input Option -->
                                    <div class="mt-4 text-center">
                                        <p class="text-sm text-gray-500">or</p>
                                        <button onclick="window.catalogScanner.showManualInput()" 
                                                class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors mt-2">
                                            Enter Data Manually
                                        </button>
                                    </div>
                                </div>
                                
                                <!-- Manual Input Section -->
                                <div id="manualInput" class="hidden">
                                    <label class="block text-sm font-medium text-gray-700 mb-2">
                                        Paste your catalog data (JSON format)
                                    </label>
                                    <textarea id="catalogDataInput" rows="10" 
                                              class="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                              placeholder='[{"name": "Product Name", "price": 25.00, "category": "Category Name", "description": "Product description"}]'></textarea>
                                    <button onclick="window.catalogScanner.processManualData()" 
                                            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors mt-2">
                                        Process Data
                                    </button>
                                </div>
                            </div>
                            
                            <!-- Step 2: Analysis Results -->
                            <div id="step2" class="step-content hidden">
                                <h3 class="text-lg font-semibold mb-4">Step 2: Analysis Results</h3>
                                <div id="analysisResults" class="space-y-4"></div>
                                <div class="flex justify-between mt-6">
                                    <button onclick="window.catalogScanner.showStep(1)" 
                                            class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                                        Back
                                    </button>
                                    <button onclick="window.catalogScanner.showStep(3)" 
                                            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                                        Continue to Suggestions
                                    </button>
                                </div>
                            </div>
                            
                            <!-- Step 3: Product Suggestions -->
                            <div id="step3" class="step-content hidden">
                                <h3 class="text-lg font-semibold mb-4">Step 3: Product Suggestions</h3>
                                <div id="suggestionsResults" class="space-y-4"></div>
                                <div class="flex justify-between mt-6">
                                    <button onclick="window.catalogScanner.showStep(2)" 
                                            class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                                        Back
                                    </button>
                                    <button onclick="window.catalogScanner.createProducts()" 
                                            class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                                        Create Products
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to body if it doesn't exist
        if (!document.getElementById('catalogScannerModal')) {
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // File upload handling
        document.addEventListener('change', (e) => {
            if (e.target.id === 'catalogFile') {
                this.handleFileUpload(e.target.files[0]);
            }
        });

        // Drag and drop events
        const dropZone = document.querySelector('#catalogScannerModal .border-dashed');
        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('border-green-400', 'bg-green-50');
            });

            dropZone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                dropZone.classList.remove('border-green-400', 'bg-green-50');
            });

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('border-green-400', 'bg-green-50');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleFileUpload(files[0]);
                }
            });
        }
    }

    /**
     * Show the modal
     */
    showModal() {
        document.getElementById('catalogScannerModal').classList.remove('hidden');
        this.showStep(1);
        this.resetData();
    }

    /**
     * Close the modal
     */
    closeModal() {
        document.getElementById('catalogScannerModal').classList.add('hidden');
        this.resetData();
    }

    /**
     * Show specific step
     * @param {number} step - Step number to show
     */
    showStep(step) {
        // Hide all steps
        document.querySelectorAll('.step-content').forEach(el => el.classList.add('hidden'));
        
        // Show selected step
        document.getElementById(`step${step}`).classList.remove('hidden');
        
        // Update step-specific content
        if (step === 2 && this.analysis) {
            this.displayAnalysis();
        } else if (step === 3 && this.suggestions) {
            this.displaySuggestions();
        }
    }

    /**
     * Show manual input section
     */
    showManualInput() {
        document.getElementById('manualInput').classList.remove('hidden');
    }

    /**
     * Handle file upload
     * @param {File} file - File to process
     */
    async handleFileUpload(file) {
        if (!file) return;

        // Validate file size
        if (file.size > this.maxFileSize) {
            showModernAlert(`File size too large. Maximum size is ${this.maxFileSize / 1024 / 1024}MB.`, 'error');
            return;
        }

        // Validate file type
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        if (!this.supportedFormats.includes(fileExtension)) {
            showModernAlert(`Unsupported file type. Please use: ${this.supportedFormats.join(', ')}`, 'error');
            return;
        }

        try {
            this.isProcessing = true;
            showSimpleToast('Processing file...', 'info');
            
            const data = await this.readFile(file);
            await this.processCatalogData(data);
            
        } catch (error) {
            console.error('File upload error:', error);
            showModernAlert('Error reading file: ' + error.message, 'error');
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Read file content
     * @param {File} file - File to read
     * @returns {Promise<Array>} Parsed data
     */
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const content = e.target.result;
                    let data;
                    
                    if (file.name.endsWith('.csv')) {
                        data = this.parseCSV(content);
                    } else {
                        // For Excel files, assume JSON format for now
                        data = JSON.parse(content);
                    }
                    
                    resolve(data);
                } catch (error) {
                    reject(new Error(`Failed to parse file: ${error.message}`));
                }
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    /**
     * Parse CSV content
     * @param {string} content - CSV content
     * @returns {Array} Parsed data
     */
    parseCSV(content) {
        const lines = content.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            throw new Error('CSV file must have at least a header row and one data row');
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const requiredHeaders = ['name', 'price'];
        
        // Validate required headers
        for (const required of requiredHeaders) {
            if (!headers.includes(required)) {
                throw new Error(`Missing required column: ${required}`);
            }
        }

        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const values = lines[i].split(',').map(v => v.trim());
                const item = {};
                
                headers.forEach((header, index) => {
                    item[header] = values[index] || '';
                });
                
                data.push(item);
            }
        }
        
        return data;
    }

    /**
     * Process manual data input
     */
    processManualData() {
        const input = document.getElementById('catalogDataInput').value.trim();
        if (!input) {
            showModernAlert('Please enter catalog data.', 'warning');
            return;
        }

        try {
            const data = JSON.parse(input);
            if (!Array.isArray(data)) {
                throw new Error('Data must be an array of products');
            }
            this.processCatalogData(data);
        } catch (error) {
            showModernAlert('Invalid JSON format. Please check your data structure.', 'error');
        }
    }

    /**
     * Process catalog data
     * @param {Array} data - Catalog data to process
     */
    async processCatalogData(data) {
        try {
            this.isProcessing = true;
            showSimpleToast('Analyzing catalog data...', 'info');
            
            // Validate and clean data
            const cleanedData = this.cleanCatalogData(data);
            
            if (cleanedData.length === 0) {
                showModernAlert('No valid catalog data found. Please check your data format.', 'error');
                return;
            }
            
            this.catalogData = cleanedData;
            
            // Send to backend for analysis
            const response = await fetch('/api/catalog/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ catalog: cleanedData })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.analysis = result.analysis;
                this.suggestions = result.suggestions;
                this.showStep(2);
                showSimpleToast('Analysis completed successfully!', 'success');
            } else {
                throw new Error(result.error || 'Analysis failed');
            }
            
        } catch (error) {
            console.error('Catalog processing error:', error);
            showModernAlert('Error processing catalog data: ' + error.message, 'error');
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Clean and validate catalog data
     * @param {Array} data - Raw catalog data
     * @returns {Array} Cleaned data
     */
    cleanCatalogData(data) {
        const cleaned = [];
        
        for (const item of data) {
            const name = item.name || item.product_name || item.title || '';
            const price = parseFloat(item.price || item.rate || item.cost || 0);
            const category = item.category || item.type || item.product_type || '';
            const description = item.description || item.desc || '';
            
            if (name && price > 0) {
                cleaned.push({
                    name: name.trim(),
                    price: price,
                    category: category.trim() || 'General',
                    description: description.trim()
                });
            }
        }
        
        return cleaned;
    }

    /**
     * Display analysis results
     */
    displayAnalysis() {
        const container = document.getElementById('analysisResults');
        
        const html = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-semibold mb-2 text-gray-800">Summary</h4>
                    <div class="space-y-1 text-sm">
                        <p><strong>Total Items:</strong> ${this.analysis.total_items}</p>
                        <p><strong>Categories Found:</strong> ${Object.keys(this.analysis.categories).length}</p>
                        <p><strong>Price Ranges:</strong> ${Object.keys(this.analysis.price_ranges).length}</p>
                    </div>
                </div>
                
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-semibold mb-2 text-gray-800">Categories</h4>
                    <div class="space-y-2 text-sm">
                        ${Object.entries(this.analysis.categories).map(([category, data]) => `
                            <div class="flex justify-between">
                                <span><strong>${category}:</strong></span>
                                <span>${data.count} items (Avg: AED ${data.avg_price.toFixed(2)})</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-semibold mb-2 text-gray-800">Price Distribution</h4>
                    <div class="space-y-2 text-sm">
                        ${Object.entries(this.analysis.price_ranges).map(([range, count]) => `
                            <div class="flex justify-between">
                                <span><strong>${range}:</strong></span>
                                <span>${count} items</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-semibold mb-2 text-gray-800">Common Patterns</h4>
                    <div class="flex flex-wrap gap-1">
                        ${this.analysis.common_patterns.slice(0, 10).map(pattern => `
                            <span class="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">${pattern}</span>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    }

    /**
     * Display product suggestions
     */
    displaySuggestions() {
        const container = document.getElementById('suggestionsResults');
        
        let html = '<div class="space-y-6">';
        
        // Product Types
        if (this.suggestions.product_types.length > 0) {
            html += `
                <div>
                    <h4 class="font-semibold mb-3 text-gray-800">Suggested Product Types (${this.suggestions.product_types.length})</h4>
                    <div class="space-y-3">
                        ${this.suggestions.product_types.map(type => `
                            <div class="border border-gray-200 rounded-lg p-4 bg-white">
                                <div class="flex items-center justify-between mb-2">
                                    <h5 class="font-medium text-gray-900">${type.name}</h5>
                                    <span class="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">${type.products.length} products</span>
                                </div>
                                <p class="text-sm text-gray-600 mb-3">${type.description}</p>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    ${type.products.map(product => `
                                        <div class="text-sm bg-gray-50 p-2 rounded border">
                                            <div class="font-medium">${product.name}</div>
                                            <div class="text-gray-600">AED ${product.rate}</div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        // Recommendations
        if (this.suggestions.recommendations.length > 0) {
            html += `
                <div>
                    <h4 class="font-semibold mb-3 text-gray-800">Recommendations</h4>
                    <div class="space-y-2">
                        ${this.suggestions.recommendations.map(rec => `
                            <div class="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
                                <p class="text-sm text-blue-800">${rec.suggestion}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        // Add duplicate check button
        html += `
            <div class="mt-6 pt-6 border-t border-gray-200">
                <button type="button" onclick="window.catalogScanner.checkDuplicates()" 
                        class="w-full px-4 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors">
                    🔍 Check for Duplicates Before Creating
                </button>
            </div>
        `;
        
        html += '</div>';
        container.innerHTML = html;
    }

    /**
     * Check for duplicates before creating products
     */
    async checkDuplicates() {
        if (!this.suggestions) return;
        
        try {
            showSimpleToast('Checking for duplicates...', 'info');
            
            const response = await fetch('/api/catalog/check-duplicates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ suggestions: this.suggestions })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.duplicateAnalysis = result.analysis;
                this.existingItems = result.existing_items;
                this.similarProducts = result.similar_products;
                this.showDuplicateAnalysis();
            } else {
                throw new Error(result.error || 'Duplicate check failed');
            }
            
        } catch (error) {
            console.error('Duplicate check error:', error);
            showModernAlert('Error checking duplicates: ' + error.message, 'error');
        }
    }

    /**
     * Display duplicate analysis
     */
    showDuplicateAnalysis() {
        const container = document.getElementById('suggestionsResults');
        if (!container) return;
        
        const analysis = this.duplicateAnalysis;
        
        const html = `
            <div class="space-y-6">
                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <h4 class="font-semibold text-yellow-800 mb-3">🔍 Duplicate Analysis</h4>
                    
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div class="text-center">
                            <div class="text-2xl font-bold text-blue-600">${analysis.total_types}</div>
                            <div class="text-sm text-gray-600">Total Types</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold text-green-600">${analysis.new_types}</div>
                            <div class="text-sm text-gray-600">New Types</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold text-blue-600">${analysis.total_products}</div>
                            <div class="text-sm text-gray-600">Total Products</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold text-green-600">${analysis.new_products}</div>
                            <div class="text-sm text-gray-600">New Products</div>
                        </div>
                    </div>
                    
                    <div class="text-sm text-yellow-700">
                        <strong>${analysis.duplicate_percentage.toFixed(1)}%</strong> of products already exist in your database.
                    </div>
                </div>
                
                <div class="space-y-4">
                    ${this.renderExistingItems()}
                    ${this.renderSimilarProducts()}
                </div>
                
                <div class="flex justify-between mt-6 pt-6 border-t border-gray-200">
                    <button type="button" onclick="window.catalogScanner.displaySuggestions()" 
                            class="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">
                        ← Back to Suggestions
                    </button>
                    <button type="button" onclick="window.catalogScanner.createProducts()" 
                            class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Create Products (Skip Duplicates)
                    </button>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    }

    /**
     * Render existing items list
     */
    renderExistingItems() {
        const existingItems = this.existingItems;
        let html = '';
        
        // Existing product types
        const existingTypes = Object.entries(existingItems.product_types)
            .filter(([name, data]) => data.exists);
        
        if (existingTypes.length > 0) {
            html += `
                <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h5 class="font-semibold text-red-800 mb-2">⚠️ Existing Product Types (${existingTypes.length})</h5>
                    <div class="space-y-1">
                        ${existingTypes.map(([name, data]) => `
                            <div class="text-sm text-red-700 flex items-center">
                                <span class="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                                ${name}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        // Existing products
        const existingProducts = Object.entries(existingItems.products)
            .filter(([name, data]) => data.exists);
        
        if (existingProducts.length > 0) {
            html += `
                <div class="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h5 class="font-semibold text-orange-800 mb-2">⚠️ Existing Products (${existingProducts.length})</h5>
                    <div class="space-y-2">
                        ${existingProducts.map(([name, data]) => `
                            <div class="text-sm text-orange-700 flex items-center justify-between">
                                <span class="flex items-center">
                                    <span class="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                                    ${name}
                                </span>
                                <span class="text-xs bg-orange-100 px-2 py-1 rounded">
                                    Current: AED ${data.current_rate} | New: AED ${data.new_rate}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        return html;
    }

    /**
     * Render similar products
     */
    renderSimilarProducts() {
        const similarProducts = this.similarProducts;
        const similarEntries = Object.entries(similarProducts);
        
        if (similarEntries.length === 0) return '';
        
        let html = `
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h5 class="font-semibold text-blue-800 mb-2">🔍 Similar Products Found (${similarEntries.length})</h5>
                <div class="space-y-3">
        `;
        
        for (const [productName, similar] of similarEntries) {
            html += `
                <div class="text-sm">
                    <div class="font-medium text-blue-800 mb-1">"${productName}" might be similar to:</div>
                    <div class="ml-4 space-y-1">
                        ${similar.slice(0, 3).map(item => `
                            <div class="text-blue-700 flex items-center justify-between">
                                <span>• ${item.product_name} (${(item.similarity * 100).toFixed(0)}% match)</span>
                                <span class="text-xs bg-blue-100 px-2 py-1 rounded">AED ${item.rate}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        html += `
                </div>
            </div>
        `;
        
        return html;
    }

    /**
     * Create products from suggestions
     */
    async createProducts() {
        if (this.isProcessing) return;

        try {
            this.isProcessing = true;
            showSimpleToast('Creating products...', 'info');
            
            const response = await fetch('/api/catalog/auto-create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ suggestions: this.suggestions })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                showModernAlert(result.message, 'success');
                this.closeModal();
                
                // Refresh product lists if they exist
                if (typeof loadProducts === 'function') {
                    loadProducts();
                }
                if (typeof loadProductTypes === 'function') {
                    loadProductTypes();
                }
            } else {
                throw new Error(result.error || 'Failed to create products');
            }
            
        } catch (error) {
            console.error('Product creation error:', error);
            showModernAlert('Error creating products: ' + error.message, 'error');
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Reset all data and UI
     */
    resetData() {
        this.catalogData = [];
        this.analysis = null;
        this.suggestions = null;
        this.isProcessing = false;
        
        // Reset UI
        const fileInput = document.getElementById('catalogFile');
        if (fileInput) fileInput.value = '';
        
        const dataInput = document.getElementById('catalogDataInput');
        if (dataInput) dataInput.value = '';
        
        const manualInput = document.getElementById('manualInput');
        if (manualInput) manualInput.classList.add('hidden');
        
        const analysisResults = document.getElementById('analysisResults');
        if (analysisResults) analysisResults.innerHTML = '';
        
        const suggestionsResults = document.getElementById('suggestionsResults');
        if (suggestionsResults) suggestionsResults.innerHTML = '';
    }
}

// Initialize catalog scanner when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    const catalogScanner = new CatalogScanner();
    window.catalogScanner = catalogScanner;
    console.log('Catalog Scanner initialized:', window.catalogScanner);
});

// Also initialize immediately if DOM is already loaded
if (document.readyState === 'loading') {
    // DOM is still loading, wait for DOMContentLoaded
} else {
    // DOM is already loaded, initialize immediately
    const catalogScanner = new CatalogScanner();
    window.catalogScanner = catalogScanner;
    console.log('Catalog Scanner initialized immediately:', window.catalogScanner);
}
