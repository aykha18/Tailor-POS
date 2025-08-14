// Simple test version of app.js
console.log('🚀 app.js loaded successfully!');

// Test function to manually trigger buttons
window.testButtons = function() {
    console.log('🧪 Testing buttons...');
    
    const whatsappBtn = document.getElementById('whatsappBtn');
    const pdfBtn = document.getElementById('pdfBtn');
    
    console.log('🔍 WhatsApp button:', whatsappBtn);
    console.log('🔍 PDF button:', pdfBtn);
    
    if (whatsappBtn) {
        console.log('🔍 WhatsApp button disabled:', whatsappBtn.disabled);
        console.log('🔍 WhatsApp button classes:', whatsappBtn.className);
        
        // Try to click it
        console.log('🔍 Attempting to click WhatsApp button...');
        whatsappBtn.click();
    }
    
    if (pdfBtn) {
        console.log('🔍 PDF button disabled:', pdfBtn.disabled);
        console.log('🔍 PDF button classes:', pdfBtn.className);
        
        // Try to click it
        console.log('🔍 Attempting to click PDF button...');
        pdfBtn.click();
    }
    
    console.log('🔍 Current bill ID:', window.currentBillId);
    console.log('🔍 Current bill:', window.bill);
};

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Tajir POS - Initializing...');
    console.log('🔍 DOM Content Loaded event fired');
    
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
        console.log('✅ Lucide icons initialized');
    } else {
        console.log('⚠️ Lucide not found');
    }
    
    // Add a test button to the page for debugging
    setTimeout(() => {
        const testBtn = document.createElement('button');
        testBtn.textContent = '🧪 Test Buttons';
        testBtn.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 9999; background: red; color: white; padding: 10px; border: none; border-radius: 5px; cursor: pointer;';
        testBtn.onclick = window.testButtons;
        document.body.appendChild(testBtn);
        console.log('✅ Test button added to page');
    }, 2000);
    
    console.log('Tajir POS - Initialized successfully');
});

// Also try to initialize when window loads
window.addEventListener('load', function() {
    console.log('🔍 Window load event fired');
    console.log('🔍 Checking if WhatsApp button exists...');
    const whatsappBtn = document.getElementById('whatsappBtn');
    console.log('🔍 WhatsApp button on window load:', !!whatsappBtn);
    if (whatsappBtn) {
        console.log('🔍 WhatsApp button classes:', whatsappBtn.className);
        console.log('🔍 WhatsApp button disabled:', whatsappBtn.disabled);
    }
});

// Simple WhatsApp initialization
function initializeWhatsApp() {
    console.log('🔄 Initializing WhatsApp functionality...');
    
    setTimeout(() => {
        const whatsappBtn = document.getElementById('whatsappBtn');
        console.log('🔍 WhatsApp button found:', !!whatsappBtn);
        
        if (whatsappBtn) {
            whatsappBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔍 WhatsApp button clicked!');
            });
            
            console.log('✅ WhatsApp event listener attached successfully');
        } else {
            console.log('❌ WhatsApp button not found in DOM');
        }
    }, 1000);
}

// Simple PDF initialization
function initializePDF() {
    console.log('🔄 Initializing PDF functionality...');
    
    setTimeout(() => {
        const pdfBtn = document.getElementById('pdfBtn');
        console.log('🔍 PDF button found:', !!pdfBtn);
        
        if (pdfBtn) {
            pdfBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔍 PDF button clicked!');
            });
            
            console.log('✅ PDF event listener attached successfully');
        } else {
            console.log('❌ PDF button not found in DOM');
        }
    }, 1000);
}

// Initialize both functions
document.addEventListener('DOMContentLoaded', function() {
    initializeWhatsApp();
    initializePDF();
});

// Simple toast function
function showToast(message, type = 'info') {
    console.log('Toast:', message, type);
} 