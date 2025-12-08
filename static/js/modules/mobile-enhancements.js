/**
 * Mobile-First Enhancements Module
 * Implements touch-friendly features for mobile users
 */

class MobileEnhancements {
    constructor() {
        this.isRecording = false;
        this.recognition = null;
        this.isMobile = this.detectMobile();
        this.init();
    }

    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    }

    init() {
        // Wait for DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupFeatures();
            });
        } else {
            // DOM is already loaded
            this.setupFeatures();
        }
        
        // Also try after a delay to catch any late-loading elements
        setTimeout(() => {
            this.setupFeatures();
        }, 2000);
    }

    setupFeatures() {
        // Always setup touch optimizations
        this.setupTouchOptimizations();
        
        // Setup mobile-specific features
        if (this.isMobile) {
            this.setupSwipeActions();
            this.setupVoiceInput();
            this.setupQuickAddMode();
            this.setupMobileNavigation();
        }
    }

    /**
     * Setup swipe actions for bill table items (mobile only)
     */
    setupSwipeActions() {
        const billTable = document.getElementById('billTable');
        
        if (!billTable) {
            return;
        }

        // Remove any existing event listeners to avoid duplicates
        billTable.removeEventListener('touchstart', this.handleTouchStart.bind(this));
        billTable.removeEventListener('touchmove', this.handleTouchMove.bind(this));
        billTable.removeEventListener('touchend', this.handleTouchEnd.bind(this));

        // Add swipe functionality to table rows ONLY
        billTable.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        billTable.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        billTable.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
    }

    handleTouchStart(e) {
        const row = e.target.closest('tr');
        if (!row || row.parentElement.tagName === 'THEAD') return;

        // Prevent event bubbling to avoid conflicts with other swipe systems
        e.stopPropagation();
        
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
        this.currentRow = row;
        this.isSwiping = false;
    }

    handleTouchMove(e) {
        if (!this.currentRow) return;

        // Prevent event bubbling to avoid conflicts
        e.stopPropagation();

        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;
        const deltaX = this.touchStartX - touchX;
        const deltaY = Math.abs(this.touchStartY - touchY);

        // Only trigger swipe if horizontal movement is significant and vertical movement is minimal
        if (Math.abs(deltaX) > 10 && deltaY < 50) {
            e.preventDefault();
            this.isSwiping = true;
            
            // Limit swipe distance
            const maxSwipe = 120;
            const swipeDistance = Math.min(Math.abs(deltaX), maxSwipe);
            const transform = deltaX > 0 ? -swipeDistance : swipeDistance;
            
            this.currentRow.style.transform = `translateX(${transform}px)`;
        }
    }

    handleTouchEnd(e) {
        if (!this.currentRow || !this.isSwiping) return;

        // Prevent event bubbling to avoid conflicts
        e.stopPropagation();

        const touchX = e.changedTouches[0].clientX;
        const deltaX = this.touchStartX - touchX;

        // If swipe distance is sufficient, show actions
        if (Math.abs(deltaX) > 60) {
            this.showSwipeActions(this.currentRow, deltaX > 0);
        } else {
            // Reset position
            this.currentRow.style.transform = '';
        }

        this.currentRow = null;
        this.isSwiping = false;
    }

    showSwipeActions(row, isLeftSwipe) {
        // Remove any existing actions
        const existingActions = row.querySelector('.swipe-actions');
        if (existingActions) {
            existingActions.remove();
        }
        
        // Create swipe action buttons
        const actions = document.createElement('div');
        actions.className = 'swipe-actions';
        actions.innerHTML = `
            <button class="swipe-action-btn swipe-action-edit" onclick="mobileEnhancements.editRow(this)">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
            </button>
            <button class="swipe-action-btn swipe-action-delete" onclick="mobileEnhancements.deleteRow(this)">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
            </button>
        `;

        row.appendChild(actions);
        row.style.transform = isLeftSwipe ? 'translateX(-120px)' : 'translateX(120px)';
    }

    editRow(button) {
        const row = button.closest('tr');
        const idx = parseInt(row.getAttribute('data-index'));
        
        // Trigger edit functionality using the billing system's editBillItem function
        if (window.editBillItem) {
            window.editBillItem(idx);
        }
        
        // Reset swipe
        this.resetSwipe(row);
    }

    deleteRow(button) {
        const row = button.closest('tr');
        const idx = parseInt(row.getAttribute('data-index'));
        
        // Trigger delete functionality using the billing system's deleteBillItem function
        if (window.deleteBillItem) {
            window.deleteBillItem(idx);
        }
        
        // Reset swipe
        this.resetSwipe(row);
    }

    resetSwipe(row) {
        row.style.transform = '';
        const actions = row.querySelector('.swipe-actions');
        if (actions) {
            actions.remove();
        }
    }

    /**
     * Setup voice input for customer names (mobile only)
     */
    setupVoiceInput() {
        const customerInput = document.getElementById('billCustomer');
        
        if (!customerInput) {
            return;
        }

        // Check if voice button already exists
        const existingVoiceBtn = customerInput.parentElement.querySelector('.voice-input-btn');
        if (existingVoiceBtn) {
            return;
        }

        // Add voice input button
        const voiceBtn = document.createElement('button');
        voiceBtn.type = 'button';
        voiceBtn.className = 'voice-input-btn';
        voiceBtn.innerHTML = `
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
            </svg>
        `;
        voiceBtn.onclick = () => this.toggleVoiceInput(customerInput, voiceBtn);

        // Position the button
        customerInput.style.position = 'relative';
        customerInput.parentElement.appendChild(voiceBtn);

        // Initialize speech recognition
        this.initSpeechRecognition();
    }

    initSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                this.currentVoiceInput.value = transcript;
                this.isRecording = false;
                this.updateVoiceButton();
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.isRecording = false;
                this.updateVoiceButton();
            };

            this.recognition.onend = () => {
                this.isRecording = false;
                this.updateVoiceButton();
            };
        }
    }

    toggleVoiceInput(input, button) {
        if (!this.recognition) {
            alert('Speech recognition is not supported in this browser.');
            return;
        }

        if (this.isRecording) {
            this.recognition.stop();
        } else {
            this.currentVoiceInput = input;
            this.currentVoiceButton = button;
            this.recognition.start();
            this.isRecording = true;
        }

        this.updateVoiceButton();
    }

    updateVoiceButton() {
        if (this.currentVoiceButton) {
            this.currentVoiceButton.classList.toggle('recording', this.isRecording);
        }
    }

    /**
     * Setup Quick Add Mode for simplified billing
     */
    setupQuickAddMode() {
        // Add Quick Add Mode toggle button
        const billingSection = document.getElementById('billingSec');
        
        if (!billingSection) {
            return;
        }

        // Check if quick add button already exists
        const existingQuickAddBtn = billingSection.querySelector('.quick-add-mode-btn');
        if (existingQuickAddBtn) {
            return;
        }

        const quickAddBtn = document.createElement('button');
        quickAddBtn.type = 'button';
        quickAddBtn.className = 'bg-purple-600 hover:bg-purple-500 text-white rounded-lg px-4 py-2 text-sm font-medium mobile-btn quick-add-mode-btn';
        quickAddBtn.innerHTML = `
            <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
            Quick Add Mode
        `;
        quickAddBtn.onclick = () => this.toggleQuickAddMode();

        // Insert button at the top of billing section
        const header = billingSection.querySelector('h3');
        if (header) {
            header.parentElement.insertBefore(quickAddBtn, header.nextSibling);
        }
    }

    toggleQuickAddMode() {
        const billingSection = document.getElementById('billingSec');
        const form = document.getElementById('billingForm');
        
        if (!billingSection || !form) return;

        const isQuickMode = billingSection.classList.contains('quick-add-mode');
        
        if (isQuickMode) {
            // Exit Quick Add Mode
            billingSection.classList.remove('quick-add-mode');
            form.classList.remove('form-simplified');
            this.showAllFormFields();
        } else {
            // Enter Quick Add Mode
            billingSection.classList.add('quick-add-mode');
            form.classList.add('form-simplified');
            this.hideNonEssentialFields();
        }
    }

    hideNonEssentialFields() {
        const nonEssentialFields = [
            'billBusinessName', 'billTRN', 'billBusinessAddress',
            'billNotes', 'billCity', 'billArea', 'trialDate'
        ];

        nonEssentialFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.parentElement.style.display = 'none';
            }
        });
    }

    showAllFormFields() {
        const allFields = document.querySelectorAll('#billingForm .col-span-3, #billingForm .col-span-2, #billingForm .col-span-1, #billingForm .col-span-6');
        allFields.forEach(field => {
            field.style.display = 'flex';
        });
    }

    /**
     * Setup mobile navigation enhancements
     */
    setupMobileNavigation() {
        // Add mobile-specific navigation improvements
        const sidebar = document.querySelector('aside');
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        
        if (sidebar && mobileMenuToggle) {
            // Create mobile overlay
            const overlay = document.createElement('div');
            overlay.className = 'mobile-overlay';
            document.body.appendChild(overlay);
            
            // Toggle sidebar
            mobileMenuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('mobile-open');
                sidebar.classList.toggle('hidden'); // Show sidebar when mobile-open
                overlay.classList.toggle('active');
            });
            
            // Close sidebar when clicking overlay
            overlay.addEventListener('click', () => {
                sidebar.classList.remove('mobile-open');
                sidebar.classList.add('hidden'); // Hide sidebar
                overlay.classList.remove('active');
            });
            
            // Add swipe to close sidebar on mobile
            sidebar.addEventListener('touchstart', this.handleSidebarTouchStart.bind(this), { passive: true });
            sidebar.addEventListener('touchmove', this.handleSidebarTouchMove.bind(this), { passive: false });
            sidebar.addEventListener('touchend', this.handleSidebarTouchEnd.bind(this), { passive: true });
        }
    }

    handleSidebarTouchStart(e) {
        this.sidebarTouchStartX = e.touches[0].clientX;
    }

    handleSidebarTouchMove(e) {
        if (!this.sidebarTouchStartX) return;
        
        const touchX = e.touches[0].clientX;
        const deltaX = this.sidebarTouchStartX - touchX;
        
        // If swiping right (away from sidebar), allow it
        if (deltaX > 50) {
            e.preventDefault();
        }
    }

    handleSidebarTouchEnd(e) {
        this.sidebarTouchStartX = null;
    }

    /**
     * Setup touch optimizations (works on all devices)
     */
    setupTouchOptimizations() {
        // Add touch feedback to all buttons
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            // Remove existing listeners to avoid duplicates
            button.removeEventListener('touchstart', this.handleButtonTouchStart);
            button.removeEventListener('touchend', this.handleButtonTouchEnd);
            
            // Add new listeners
            button.addEventListener('touchstart', this.handleButtonTouchStart, { passive: true });
            button.addEventListener('touchend', this.handleButtonTouchEnd, { passive: true });
        });

        // Optimize form inputs for mobile
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            // Prevent zoom on iOS
            input.addEventListener('focus', () => {
                input.style.fontSize = '16px';
            });
        });
    }

    handleButtonTouchStart(e) {
        e.target.style.transform = 'scale(0.95)';
    }

    handleButtonTouchEnd(e) {
        e.target.style.transform = '';
    }
}

// Initialize mobile enhancements
window.mobileEnhancements = new MobileEnhancements();

// Make setupSwipeActions publicly accessible
window.mobileEnhancements.setupSwipeActions = window.mobileEnhancements.setupSwipeActions.bind(window.mobileEnhancements);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileEnhancements;
} 