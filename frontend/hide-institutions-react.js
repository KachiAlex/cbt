// Hide Institutions React Script
// Run this in the browser console to hide institutions from React state

console.log('🚫 Hiding institutions from React state...');

// Function to find and modify React components
function hideInstitutionsFromReact() {
  try {
    // Try to find React components that might contain institutions
    const reactRoots = document.querySelectorAll('[data-reactroot], [data-reactid]');
    console.log(`Found ${reactRoots.length} potential React roots`);
    
    // Look for any elements that might contain institution data
    const institutionElements = document.querySelectorAll('[class*="institution"], [class*="tenant"], [id*="institution"], [id*="tenant"]');
    console.log(`Found ${institutionElements.length} potential institution elements`);
    
    // Try to clear any React state by triggering a re-render
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
      if (button.textContent.includes('Refresh') || button.textContent.includes('Reload')) {
        console.log('Found refresh button, clicking...');
        button.click();
      }
    });
    
    // Try to modify any visible institution elements
    institutionElements.forEach(element => {
      if (element.textContent.includes('Test School') || 
          element.textContent.includes('College of Nursing') || 
          element.textContent.includes('Kreatix Academy')) {
        console.log('Hiding institution element:', element.textContent);
        element.style.display = 'none';
      }
    });
    
    // Try to find and clear any React state
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      console.log('React DevTools detected, attempting to clear state...');
      try {
        // This is a more advanced approach to clear React state
        const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
        if (hook.renderers && hook.renderers.size > 0) {
          console.log('Found React renderers, attempting to clear...');
        }
      } catch (error) {
        console.log('Could not clear React state:', error.message);
      }
    }
    
  } catch (error) {
    console.log('Error hiding institutions from React:', error.message);
  }
}

// Function to override the institutions API call
function overrideInstitutionsAPI() {
  try {
    // Store original fetch
    const originalFetch = window.fetch;
    
    // Override fetch
    window.fetch = function(...args) {
      const url = args[0];
      
      // If it's a request to get institutions, return empty array
      if (typeof url === 'string' && url.includes('/api/tenants') && !url.includes('/login')) {
        console.log('🚫 Intercepting institutions API call:', url);
        
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([]),
          text: () => Promise.resolve('[]'),
          headers: new Headers({
            'Content-Type': 'application/json'
          })
        });
      }
      
      return originalFetch.apply(this, args);
    };
    
    console.log('✅ API override installed');
    
  } catch (error) {
    console.log('Error overriding API:', error.message);
  }
}

// Function to clear all storage
function clearAllStorage() {
  try {
    localStorage.clear();
    sessionStorage.clear();
    console.log('✅ All storage cleared');
  } catch (error) {
    console.log('Error clearing storage:', error.message);
  }
}

// Execute all functions
console.log('🚀 Starting comprehensive institution hide...');

clearAllStorage();
overrideInstitutionsAPI();
hideInstitutionsFromReact();

// Set a flag
try {
  localStorage.setItem('institutions_hidden_comprehensive', new Date().toISOString());
  console.log('✅ Comprehensive hide flag set');
} catch (error) {
  console.log('Error setting flag:', error.message);
}

console.log('🎉 Comprehensive institution hide completed!');
console.log('🔄 Refreshing page in 2 seconds...');

// Refresh the page
setTimeout(() => {
  window.location.reload();
}, 2000);
