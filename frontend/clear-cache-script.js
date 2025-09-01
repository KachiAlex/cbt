// Clear UI Cache Script
// Copy and paste this into your browser console on the admin page

console.log('🧹 Starting UI cache clear...');

// Clear localStorage
try {
    const keys = Object.keys(localStorage);
    let cleared = 0;
    
    keys.forEach(key => {
        if (key.includes('institution') || key.includes('tenant') || key.includes('admin') || key.includes('auth')) {
            localStorage.removeItem(key);
            cleared++;
            console.log(`Cleared: ${key}`);
        }
    });
    
    console.log(`✅ Cleared ${cleared} localStorage items`);
} catch (error) {
    console.log(`❌ Error clearing localStorage: ${error.message}`);
}

// Clear sessionStorage
try {
    sessionStorage.clear();
    console.log('✅ Cleared sessionStorage');
} catch (error) {
    console.log(`❌ Error clearing sessionStorage: ${error.message}`);
}

// Clear any React state
try {
    // Try to clear React state if possible
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        console.log('✅ React DevTools detected');
    }
} catch (error) {
    console.log(`❌ Error with React state: ${error.message}`);
}

// Set a flag to indicate cache was cleared
try {
    localStorage.setItem('cache_cleared', new Date().toISOString());
    console.log('✅ Cache clear flag set');
} catch (error) {
    console.log(`❌ Error setting flag: ${error.message}`);
}

console.log('🎉 UI cache clear completed!');
console.log('🔄 Please refresh the page now.');

// Auto-refresh after 2 seconds
setTimeout(() => {
    console.log('🔄 Auto-refreshing page...');
    window.location.reload();
}, 2000);
