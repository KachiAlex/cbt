// Test script for institution URLs
document.addEventListener('DOMContentLoaded', function() {
    // Test current URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');
    
    if (slug) {
        console.log('🏫 Institution detected:', slug);
        // Redirect to the main app with institution parameter
        window.location.href = './?slug=' + slug;
    }
    
    // Add click handlers for test links
    document.querySelectorAll('.test-link').forEach(link => {
        link.addEventListener('click', (e) => {
            if (link.getAttribute('href').startsWith('?')) {
                e.preventDefault();
                const slug = link.getAttribute('href').replace('?slug=', '');
                window.location.href = './?slug=' + slug;
            }
        });
    });
}); 