// Institution login page script
// Get institution slug from URL
const urlParams = new URLSearchParams(window.location.search);
const institutionSlug = urlParams.get('slug') || window.location.pathname.split('/').pop();

let institutionName = 'Institution';
let institutionLogo = null;

// Load institution data
async function loadInstitutionData() {
    try {
        const response = await fetch(`https://cbt-rew7.onrender.com/api/tenant/${institutionSlug}/profile`);
        
        if (!response.ok) {
            throw new Error('Institution not found or suspended');
        }
        
        const data = await response.json();
        institutionName = data.name;
        institutionLogo = data.logo_url;
        
        // Update UI
        document.getElementById('institutionName').textContent = institutionName;
        document.title = `${institutionName} - CBT System`;
        
        if (institutionLogo) {
            const logoElement = document.getElementById('institutionLogo');
            logoElement.src = institutionLogo;
            logoElement.alt = `${institutionName} Logo`;
            logoElement.classList.remove('hidden');
        }
        
    } catch (error) {
        document.getElementById('institutionName').textContent = 'Institution Not Found';
        showError('Institution not found or suspended');
    }
}

function showAdminLogin() {
    document.getElementById('adminLoginForm').classList.remove('hidden');
    document.getElementById('studentLoginForm').classList.add('hidden');
    document.getElementById('errorMessage').classList.add('hidden');
}

function showStudentLogin() {
    document.getElementById('studentLoginForm').classList.remove('hidden');
    document.getElementById('adminLoginForm').classList.add('hidden');
    document.getElementById('errorMessage').classList.add('hidden');
}

function hideForms() {
    document.getElementById('adminLoginForm').classList.add('hidden');
    document.getElementById('studentLoginForm').classList.add('hidden');
    document.getElementById('errorMessage').classList.add('hidden');
}

async function handleAdminLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;
    
    try {
        const response = await fetch('https://cbt-rew7.onrender.com/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                password,
                tenant_slug: institutionSlug,
                user_type: 'admin'
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Store user data
            localStorage.setItem('user', JSON.stringify(data));
            localStorage.setItem('tenant', JSON.stringify(data.tenant));
            localStorage.setItem('userType', 'admin');
            
            // Redirect to admin dashboard
            window.location.href = '/admin-dashboard';
        } else {
            showError(data.error || 'Login failed');
        }
    } catch (error) {
        showError('Network error. Please try again.');
    }
}

async function handleStudentLogin(event) {
    event.preventDefault();
    
    const studentId = document.getElementById('studentId').value;
    const password = document.getElementById('studentPassword').value;
    
    try {
        const response = await fetch('https://cbt-rew7.onrender.com/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: studentId,
                password,
                tenant_slug: institutionSlug,
                user_type: 'student'
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Store user data
            localStorage.setItem('user', JSON.stringify(data));
            localStorage.setItem('tenant', JSON.stringify(data.tenant));
            localStorage.setItem('userType', 'student');
            
            // Redirect to student dashboard
            window.location.href = '/student-dashboard';
        } else {
            showError(data.error || 'Login failed');
        }
    } catch (error) {
        showError('Network error. Please try again.');
    }
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

// Load institution data on page load
document.addEventListener('DOMContentLoaded', function() {
    loadInstitutionData();
}); 