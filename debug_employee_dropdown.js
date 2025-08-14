// Debug Employee Dropdown Script
// Run this in the browser console on the main app page

console.log('🔍 Debugging Employee Dropdown...');

function debugEmployeeDropdown() {
    // Check if we're on the employee page
    const employeeSection = document.getElementById('employeeSec');
    if (!employeeSection) {
        console.log('❌ Employee section not found. Make sure you are on the employee page.');
        return;
    }

    // Check if employee section is visible
    if (employeeSection.classList.contains('hidden')) {
        console.log('⚠️ Employee section is hidden. Please navigate to the employee page first.');
        return;
    }

    // Find the dropdown
    const dropdown = document.getElementById('employeeRole');
    if (!dropdown) {
        console.log('❌ Employee role dropdown not found!');
        return;
    }

    console.log('✅ Employee role dropdown found:', dropdown);
    console.log('📋 Dropdown options count:', dropdown.options.length);
    console.log('🎯 Selected value:', dropdown.value);
    console.log('📝 Selected text:', dropdown.options[dropdown.selectedIndex]?.text || 'None');

    // List all options
    console.log('📋 All dropdown options:');
    for (let i = 0; i < dropdown.options.length; i++) {
        const option = dropdown.options[i];
        console.log(`  ${i}: "${option.value}" - "${option.text}"`);
    }

    // Check specifically for Owner option
    const ownerOption = Array.from(dropdown.options).find(opt => opt.value === 'Owner');
    if (ownerOption) {
        console.log('✅ Owner option found in dropdown!');
        console.log('   Value:', ownerOption.value);
        console.log('   Text:', ownerOption.text);
        console.log('   Index:', ownerOption.index);
    } else {
        console.log('❌ Owner option NOT found in dropdown!');
        
        // Check if there are any options at all
        if (dropdown.options.length === 0) {
            console.log('⚠️ Dropdown has no options at all!');
        } else {
            console.log('⚠️ Dropdown has options but no "Owner" option');
        }
    }

    // Check dropdown visibility and styling
    const computedStyle = window.getComputedStyle(dropdown);
    console.log('🎨 Dropdown styling:');
    console.log('   Display:', computedStyle.display);
    console.log('   Visibility:', computedStyle.visibility);
    console.log('   Opacity:', computedStyle.opacity);
    console.log('   Height:', computedStyle.height);
    console.log('   Width:', computedStyle.width);

    // Check if dropdown is disabled
    console.log('🔒 Dropdown disabled:', dropdown.disabled);
    console.log('🔒 Dropdown readonly:', dropdown.readOnly);

    // Test if we can programmatically set the Owner option
    try {
        const originalValue = dropdown.value;
        dropdown.value = 'Owner';
        console.log('🧪 Test setting Owner value:', dropdown.value === 'Owner' ? '✅ Success' : '❌ Failed');
        dropdown.value = originalValue; // Restore original value
    } catch (error) {
        console.log('❌ Error testing Owner value:', error);
    }
}

// Run the debug function
debugEmployeeDropdown();

// Also provide a function to manually test
window.testEmployeeDropdown = function() {
    console.log('🧪 Manual test triggered...');
    debugEmployeeDropdown();
};

console.log('💡 You can also run: testEmployeeDropdown() to test again');
