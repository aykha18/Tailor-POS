// Comprehensive cache clearing script for Tajir POS
// This script will clear ALL browser storage and force a complete refresh

console.log('🚀 Starting COMPREHENSIVE cache clear for Tajir POS...');

async function forceClearEverything() {
    try {
        console.log('Step 1: Unregistering all service workers...');
        
        // 1. Unregister all service workers
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            console.log(`Found ${registrations.length} service worker registrations`);
            
            for (let registration of registrations) {
                await registration.unregister();
                console.log('✅ Service Worker unregistered:', registration.scope);
            }
        }

        console.log('Step 2: Clearing all caches...');
        
        // 2. Clear all caches
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            console.log(`Found ${cacheNames.length} caches to clear`);
            
            for (let name of cacheNames) {
                await caches.delete(name);
                console.log('✅ Cache deleted:', name);
            }
        }

        console.log('Step 3: Clearing IndexedDB...');
        
        // 3. Clear IndexedDB
        if ('indexedDB' in window) {
            try {
                const databases = await indexedDB.databases();
                for (let db of databases) {
                    await indexedDB.deleteDatabase(db.name);
                    console.log('✅ IndexedDB deleted:', db.name);
                }
            } catch (error) {
                console.log('⚠️ IndexedDB clearing failed (normal in some browsers):', error.message);
            }
        }

        console.log('Step 4: Clearing localStorage and sessionStorage...');
        
        // 4. Clear localStorage and sessionStorage
        localStorage.clear();
        sessionStorage.clear();
        console.log('✅ Local and session storage cleared');

        console.log('Step 5: Clearing cookies...');
        
        // 5. Clear cookies (for this domain)
        document.cookie.split(";").forEach(function(c) { 
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });
        console.log('✅ Cookies cleared');

        console.log('Step 6: Clearing browser cache...');
        
        // 6. Force browser cache clear by adding timestamp to current URL
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('_clear_cache', Date.now());
        
        console.log('🎉 All caches cleared successfully!');
        console.log('🔄 Redirecting to fresh page...');
        
        // 7. Force reload with cache-busting parameter
        window.location.href = currentUrl.toString();
        
    } catch (error) {
        console.error('❌ Error during cache clear:', error);
        // Even if there's an error, try to reload
        window.location.reload(true);
    }
}

// Execute the cache clear
forceClearEverything();
