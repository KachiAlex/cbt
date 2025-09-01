// Temporary Hide Institutions Script
// Run this in the browser console to hide institutions from the UI

console.log('🚫 Temporarily hiding institutions from UI...');

// Store original fetch function
const originalFetch = window.fetch;

// Override fetch to intercept API calls
window.fetch = function(...args) {
  const url = args[0];
  
  // If it's a request to get tenants/institutions, return empty array
  if (typeof url === 'string' && url.includes('/api/tenants') && !url.includes('/login')) {
    console.log('🚫 Intercepting institutions API call:', url);
    
    // Return a mock response with empty institutions
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
  
  // For all other requests, use original fetch
  return originalFetch.apply(this, args);
};

// Also override XMLHttpRequest if it's being used
if (window.XMLHttpRequest) {
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    this._url = url;
    return originalXHROpen.apply(this, [method, url, ...args]);
  };
  
  XMLHttpRequest.prototype.send = function(...args) {
    if (this._url && this._url.includes('/api/tenants') && !this._url.includes('/login')) {
      console.log('🚫 Intercepting XHR institutions call:', this._url);
      
      // Mock the response
      setTimeout(() => {
        this.status = 200;
        this.responseText = '[]';
        this.response = [];
        this.readyState = 4;
        this.onreadystatechange && this.onreadystatechange();
      }, 100);
      
      return;
    }
    
    return originalXHRSend.apply(this, args);
  };
}

// Clear any existing institutions from localStorage
try {
  localStorage.removeItem('institutions');
  localStorage.removeItem('tenants');
  localStorage.removeItem('admin_institutions');
  console.log('✅ Cleared institution cache');
} catch (error) {
  console.log('⚠️ Could not clear cache:', error.message);
}

// Set a flag to indicate institutions are hidden
try {
  localStorage.setItem('institutions_hidden', 'true');
  localStorage.setItem('hide_timestamp', new Date().toISOString());
  console.log('✅ Set hide flag');
} catch (error) {
  console.log('⚠️ Could not set flag:', error.message);
}

console.log('🎉 Institutions temporarily hidden!');
console.log('🔄 Please refresh the page to see the effect.');

// Auto-refresh after 3 seconds
setTimeout(() => {
  console.log('🔄 Auto-refreshing page...');
  window.location.reload();
}, 3000);
