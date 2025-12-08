/**
 * OCR Scanner Module
 * 
 * Handles image upload and text extraction using OCR (Optical Character Recognition).
 * Provides functionality to extract text from images for product catalog processing.
 * 
 * Features:
 * - Multi-image upload with drag & drop support
 * - Real-time image preview
 * - Batch processing with progress tracking
 * - Confidence scoring for extracted text
 * - Copy to clipboard functionality
 * - Advanced image preprocessing
 * 
 * @author Tajir POS Team
 * @version 1.0.0
 */

class OCRScanner {
    /**
     * Initialize the OCR Scanner
     */
    constructor() {
        console.log('OCR Scanner: Constructor called');
        this.isInitialized = false;
        this.currentStep = 1;
        this.uploadedFiles = [];
        this.extractedTexts = [];
        this.isProcessing = false;
        this.maxFileSize = 10 * 1024 * 1024; // 10MB limit
        this.maxFiles = 10; // Maximum number of files
        this.supportedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff', 'image/webp'];
        
        this.init();
    }

    /**
     * Initialize the scanner
     */
    init() {
        console.log('OCR Scanner: init called');
        this.createModal();
        this.bindEvents();
        this.isInitialized = true;
        console.log('OCR Scanner initialized successfully');
    }

    /**
     * Create the modal UI
     */
    createModal() {
        const modalHTML = `
            <div id="ocrModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 hidden">
                <div class="flex items-center justify-center min-h-screen p-4">
                    <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <!-- Header -->
                        <div class="flex items-center justify-between p-6 border-b">
                            <h2 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
                                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                                Scan Products
                            </h2>
                            <button onclick="window.ocrScanner.closeModal()" class="text-gray-400 hover:text-gray-600 transition-colors">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>

                        <!-- Content -->
                        <div class="p-6">
                            <!-- Step 1: Upload Images -->
                            <div id="ocrStep1" class="ocr-step">
                                <div class="text-center mb-6">
                                    <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                                        </svg>
                                    </div>
                                    <h3 class="text-lg font-medium text-gray-900 mb-2">Upload Images</h3>
                                    <p class="text-gray-600">Upload images containing text you want to extract</p>
                                </div>

                                <!-- Upload Area -->
                                <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                                    <input type="file" id="ocrFileInput" multiple accept="image/*" class="hidden">
                                    <div class="space-y-4">
                                        <svg class="w-12 h-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                        </svg>
                                        <div>
                                            <button onclick="document.getElementById('ocrFileInput').click()" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                                                Choose Images
                                            </button>
                                            <p class="text-sm text-gray-500 mt-2">or drag and drop images here</p>
                                            <p class="text-xs text-gray-400 mt-1">Supported: JPG, PNG, GIF, BMP, TIFF, WebP (max 10MB each, up to 10 files)</p>
                                        </div>
                                    </div>
                                </div>

                                <!-- File Preview -->
                                <div id="ocrFilePreview" class="mt-6 hidden">
                                    <h4 class="font-medium text-gray-900 mb-3">Selected Images:</h4>
                                    <div id="ocrFileList" class="grid grid-cols-2 md:grid-cols-3 gap-4"></div>
                                </div>

                                <div class="flex justify-end mt-6">
                                    <button onclick="window.ocrScanner.startProcessing()" id="ocrNextBtn" 
                                            class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors opacity-50 cursor-not-allowed" 
                                            disabled>
                                        Extract Text
                                    </button>
                                </div>
                            </div>

                            <!-- Step 2: Processing -->
                            <div id="ocrStep2" class="ocr-step hidden">
                                <div class="text-center py-8">
                                    <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    </div>
                                    <h3 class="text-lg font-medium text-gray-900 mb-2">Processing Images</h3>
                                    <p class="text-gray-600">Extracting text from your images...</p>
                                                                         <div id="ocrProgressContainer" class="mt-4" style="display: block;">
                                        <div class="bg-gray-200 rounded-full h-2">
                                            <div id="ocrProgressBar" class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: 0%; display: block;"></div>
                                        </div>
                                        <p id="ocrProgressText" class="text-sm text-gray-500 mt-2" style="display: block;">Starting...</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Step 3: Results -->
                            <div id="ocrStep3" class="ocr-step hidden">
                                <div class="text-center mb-6">
                                    <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                    </div>
                                    <h3 class="text-lg font-medium text-gray-900 mb-2">Text Extraction Complete</h3>
                                    <p class="text-gray-600">Review and copy the extracted text</p>
                                </div>

                                <div id="ocrResults" class="space-y-4"></div>

                                <div class="flex justify-between mt-6">
                                    <button onclick="window.ocrScanner.showStep(1)" class="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                                        Upload More
                                    </button>
                                    <button onclick="window.ocrScanner.closeModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                                        Done
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to body if it doesn't exist
        if (!document.getElementById('ocrModal')) {
            console.log('OCR Scanner: Creating modal in DOM');
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        } else {
            console.log('OCR Scanner: Modal already exists in DOM');
        }
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // File input change event
        document.addEventListener('change', (e) => {
            if (e.target.id === 'ocrFileInput') {
                this.handleFileSelection(e.target.files);
            }
        });

        // Drag and drop events
        const dropZone = document.querySelector('#ocrModal .border-dashed');
        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('border-blue-400', 'bg-blue-50');
            });

            dropZone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                dropZone.classList.remove('border-blue-400', 'bg-blue-50');
            });

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('border-blue-400', 'bg-blue-50');
                this.handleFileSelection(e.dataTransfer.files);
            });
        }
    }

    /**
     * Handle file selection
     * @param {FileList} files - Selected files
     */
    handleFileSelection(files) {
        if (this.isProcessing) return;

        const validFiles = Array.from(files).filter(file => {
            // Check file type
            if (!this.supportedFormats.includes(file.type)) {
                showModernAlert(`Unsupported file type: ${file.name}. Please use image files only.`, 'warning');
                return false;
            }

            // Check file size
            if (file.size > this.maxFileSize) {
                showModernAlert(`File too large: ${file.name}. Maximum size is ${this.maxFileSize / 1024 / 1024}MB.`, 'warning');
                return false;
            }

            return true;
        });

        // Check total number of files
        if (this.uploadedFiles.length + validFiles.length > this.maxFiles) {
            showModernAlert(`Too many files. Maximum ${this.maxFiles} files allowed.`, 'warning');
            return;
        }

        this.uploadedFiles.push(...validFiles);
        this.displayFilePreview();
        
        // Enable the button and ensure it's visible
        const nextBtn = document.getElementById('ocrNextBtn');
        if (nextBtn) {
            nextBtn.disabled = false;
            nextBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            nextBtn.classList.add('opacity-100', 'cursor-pointer');
            nextBtn.style.display = 'block';
            nextBtn.style.visibility = 'visible';
            nextBtn.style.opacity = '1';
            console.log('OCR Scanner: Button enabled and made visible');
        } else {
            console.error('OCR Scanner: Next button not found!');
        }
    }

    /**
     * Display file preview
     */
    displayFilePreview() {
        const previewContainer = document.getElementById('ocrFilePreview');
        const fileList = document.getElementById('ocrFileList');
        
        previewContainer.classList.remove('hidden');
        fileList.innerHTML = '';

        this.uploadedFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const fileItem = document.createElement('div');
                fileItem.className = 'relative bg-gray-100 rounded-lg p-2';
                fileItem.innerHTML = `
                    <img src="${e.target.result}" alt="${file.name}" class="w-full h-24 object-cover rounded">
                    <div class="mt-2 text-xs text-gray-600 truncate">${file.name}</div>
                    <button onclick="window.ocrScanner.removeFile(${index})" 
                            class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors">
                        ×
                    </button>
                `;
                fileList.appendChild(fileItem);
            };
            reader.readAsDataURL(file);
        });
    }

    /**
     * Remove file from selection
     * @param {number} index - File index to remove
     */
    removeFile(index) {
        this.uploadedFiles.splice(index, 1);
        this.displayFilePreview();
        
        if (this.uploadedFiles.length === 0) {
            document.getElementById('ocrFilePreview').classList.add('hidden');
            
            // Disable the button and make it appear disabled
            const nextBtn = document.getElementById('ocrNextBtn');
            if (nextBtn) {
                nextBtn.disabled = true;
                nextBtn.classList.add('opacity-50', 'cursor-not-allowed');
                nextBtn.classList.remove('opacity-100', 'cursor-pointer');
                console.log('OCR Scanner: Button disabled');
            }
        }
    }

    /**
     * Start the processing workflow
     */
    startProcessing() {
        console.log('OCR Scanner: startProcessing called');
        this.showStep(2);
        setTimeout(() => {
            this.processImages();
        }, 200);
    }

    /**
     * Process uploaded images
     */
    async processImages() {
        console.log('OCR Scanner: processImages called');
        if (this.isProcessing) {
            console.log('OCR Scanner: Already processing, returning');
            return;
        }

        // First, ensure we're on step 2 and show the processing UI
        this.showStep(2);
        
        // Wait a moment for the DOM to update
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const formData = new FormData();
        this.uploadedFiles.forEach(file => {
            formData.append('images', file);
        });

        const progressBar = document.getElementById('ocrProgressBar');
        const progressText = document.getElementById('ocrProgressText');
        const progressContainer = document.getElementById('ocrProgressContainer');
        
        console.log('OCR Scanner: Progress elements found:', {
            progressBar: !!progressBar,
            progressText: !!progressText,
            progressContainer: !!progressContainer
        });
        
        // Ensure all progress elements are visible
        if (progressContainer) {
            console.log('OCR Scanner: Showing progress container');
            progressContainer.classList.remove('hidden');
            progressContainer.style.display = 'block';
        } else {
            console.error('OCR Scanner: Progress container not found!');
        }
        
        if (progressText) {
            progressText.textContent = 'Checking server connection...';
            progressText.style.display = 'block';
        }
        if (progressBar) {
            progressBar.style.width = '10%';
            progressBar.style.display = 'block';
        }
        
        try {
            this.isProcessing = true;

            // Check server connectivity first
            try {
                const healthController = new AbortController();
                const healthTimeout = setTimeout(() => healthController.abort(), 5000);
                
                const healthCheck = await fetch('/api/plan/status', { 
                    method: 'GET',
                    signal: healthController.signal
                });
                
                clearTimeout(healthTimeout);
                
                if (!healthCheck.ok) {
                    throw new Error('Server is not responding properly');
                }
            } catch (healthError) {
                if (healthError.name === 'AbortError') {
                    throw new Error('Server connection timed out. Please check your connection.');
                }
                throw new Error('Cannot connect to server. Please make sure the application is running.');
            }

            progressText.textContent = 'Uploading images...';
            progressBar.style.width = '20%';

            // Add timeout for better UX
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

            const response = await fetch('/api/ocr/extract-batch', {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            progressBar.style.width = '60%';
            progressText.textContent = 'Processing images with OCR...';

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                
                try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.error || errorMessage;
                } catch (e) {
                    // If not JSON, use the text as is
                    if (errorText) {
                        errorMessage = errorText;
                    }
                }
                
                throw new Error(errorMessage);
            }

            progressBar.style.width = '80%';
            progressText.textContent = 'Extracting text...';

            const result = await response.json();

            progressBar.style.width = '100%';
            progressText.textContent = 'Complete!';

            if (result.success) {
                this.extractedTexts = result.results;
                
                // Check if any results were successful
                const successfulResults = result.results.filter(r => r.success);
                if (successfulResults.length === 0) {
                    throw new Error('No text could be extracted from the images. Please try with clearer images.');
                }
                
                setTimeout(() => this.showStep(3), 1000);
            } else {
                throw new Error(result.error || 'Failed to extract text');
            }

        } catch (error) {
            console.error('OCR processing error:', error);
            
            // Handle specific error types
            let errorMessage = error.message;
            if (error.name === 'AbortError') {
                errorMessage = 'Request timed out. Please try again with smaller images or fewer files.';
            } else if (error.message.includes('Failed to fetch') || error.message.includes('Cannot connect to server')) {
                errorMessage = 'Cannot connect to server. Please make sure the application is running and try again.';
            }
            
            showModernAlert(`Error processing images: ${errorMessage}`, 'error');
            
            // Ensure we go back to step 1 and show the button properly
            setTimeout(() => {
                this.showStep(1);
                const nextBtn = document.getElementById('ocrNextBtn');
                if (nextBtn && this.uploadedFiles.length > 0) {
                    nextBtn.disabled = false;
                    nextBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                    nextBtn.classList.add('opacity-100', 'cursor-pointer');
                    nextBtn.style.display = 'block';
                    nextBtn.style.visibility = 'visible';
                    nextBtn.style.opacity = '1';
                }
            }, 100);
        } finally {
            this.isProcessing = false;
            // Hide progress container
            if (progressContainer) {
                progressContainer.classList.add('hidden');
                progressContainer.style.display = 'none';
            }
        }
    }

    /**
     * Display OCR results
     */
    displayResults() {
        const resultsContainer = document.getElementById('ocrResults');
        resultsContainer.innerHTML = '';

        this.extractedTexts.forEach((result, index) => {
            const resultCard = document.createElement('div');
            resultCard.className = 'bg-gray-50 rounded-lg p-4 border';
            
            const confidenceColor = result.confidence > 70 ? 'text-green-600' : 
                                  result.confidence > 40 ? 'text-yellow-600' : 'text-red-600';
            
            resultCard.innerHTML = `
                <div class="flex items-start justify-between mb-3">
                    <div>
                        <h4 class="font-medium text-gray-900">${result.filename}</h4>
                        <p class="text-sm text-gray-500">Confidence: <span class="${confidenceColor} font-medium">${result.confidence.toFixed(1)}%</span></p>
                    </div>
                    <button onclick="window.ocrScanner.copyText(${index})" 
                            class="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors">
                        Copy Text
                    </button>
                </div>
                <div class="bg-white rounded border p-3 max-h-32 overflow-y-auto">
                    <pre class="text-sm text-gray-700 whitespace-pre-wrap">${result.success ? result.text || 'No text detected' : result.error}</pre>
                </div>
            `;
            
            resultsContainer.appendChild(resultCard);
        });
    }

    /**
     * Copy extracted text to clipboard
     * @param {number} index - Result index to copy
     */
    copyText(index) {
        const result = this.extractedTexts[index];
        if (result.success && result.text) {
            navigator.clipboard.writeText(result.text).then(() => {
                showSimpleToast('Text copied to clipboard!', 'success');
            }).catch(() => {
                showModernAlert('Failed to copy text. Please select and copy manually.', 'warning');
            });
        }
    }

    /**
     * Show specific step
     * @param {number} step - Step number to show
     */
    showStep(step) {
        console.log(`OCR Scanner: showStep called with step ${step}`);
        this.currentStep = step;
        
        // Hide all steps
        const allSteps = document.querySelectorAll('.ocr-step');
        console.log(`OCR Scanner: Found ${allSteps.length} step elements`);
        allSteps.forEach(el => {
            el.classList.add('hidden');
            el.style.display = 'none';
        });
        
        // Show current step
        const currentStepElement = document.getElementById(`ocrStep${step}`);
        if (currentStepElement) {
            console.log(`OCR Scanner: Showing step ${step}`);
            currentStepElement.classList.remove('hidden');
            currentStepElement.style.display = 'block';
        } else {
            console.error(`OCR Scanner: Step ${step} element not found!`);
        }
        
        // Handle step-specific actions
        if (step === 2) {
            console.log('OCR Scanner: Step 2 - calling processImages');
            // Don't call processImages here, it will be called from the button click
        } else if (step === 3) {
            console.log('OCR Scanner: Step 3 - calling displayResults');
            this.displayResults();
        }
    }

    /**
     * Show the modal
     */
    showModal() {
        console.log('OCR Scanner: showModal called');
        const modal = document.getElementById('ocrModal');
        if (modal) {
            console.log('OCR Scanner: Modal found, showing...');
            modal.classList.remove('hidden');
            this.resetState();
            this.showStep(1);
        } else {
            console.error('OCR Scanner: Modal not found!');
            showModernAlert('OCR Scanner modal not found. Please refresh the page and try again.', 'error');
        }
    }

    /**
     * Close the modal
     */
    closeModal() {
        console.log('OCR Scanner: closeModal called');
        const modal = document.getElementById('ocrModal');
        if (modal) {
            modal.classList.add('hidden');
            this.resetState();
        }
    }

    /**
     * Reset modal state
     */
    resetState() {
        console.log('OCR Scanner: resetState called');
        this.uploadedFiles = [];
        this.extractedTexts = [];
        this.isProcessing = false;
        this.currentStep = 1;
        
        // Reset UI elements
        const fileInput = document.getElementById('ocrFileInput');
        if (fileInput) fileInput.value = '';
        
        const filePreview = document.getElementById('ocrFilePreview');
        if (filePreview) filePreview.classList.add('hidden');
        
        const nextBtn = document.getElementById('ocrNextBtn');
        if (nextBtn) {
            nextBtn.disabled = true;
            nextBtn.classList.add('opacity-50', 'cursor-not-allowed');
            nextBtn.classList.remove('opacity-100', 'cursor-pointer');
            console.log('OCR Scanner: Button reset to disabled state');
        }
        
        const progressContainer = document.getElementById('ocrProgressContainer');
        if (progressContainer) {
            console.log('OCR Scanner: Hiding progress container');
            progressContainer.classList.add('hidden');
        } else {
            console.error('OCR Scanner: Progress container not found!');
        }
        
        const progressBar = document.getElementById('ocrProgressBar');
        if (progressBar) progressBar.style.width = '0%';
        
        const progressText = document.getElementById('ocrProgressText');
        if (progressText) progressText.textContent = 'Starting...';
    }
}

// Initialize OCR scanner when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('OCR Scanner: DOMContentLoaded event fired');
    try {
        const ocrScanner = new OCRScanner();
        window.ocrScanner = ocrScanner;
        console.log('OCR Scanner initialized on DOMContentLoaded:', window.ocrScanner);
    } catch (error) {
        console.error('Failed to initialize OCR Scanner on DOMContentLoaded:', error);
    }
});

// Also initialize immediately if DOM is already loaded
if (document.readyState === 'loading') {
    console.log('OCR Scanner: DOM is still loading, waiting for DOMContentLoaded');
    // DOM is still loading, wait for DOMContentLoaded
} else {
    console.log('OCR Scanner: DOM is already loaded, initializing immediately');
    // DOM is already loaded, initialize immediately
    try {
        const ocrScanner = new OCRScanner();
        window.ocrScanner = ocrScanner;
        console.log('OCR Scanner initialized immediately:', window.ocrScanner);
    } catch (error) {
        console.error('Failed to initialize OCR Scanner immediately:', error);
    }
}
