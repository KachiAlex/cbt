// CBT Default Admin Creator - Run this in browser console
console.log('🔐 CBT Default Admin Creator');

// Create default admin user
function createDefaultAdmin() {
    console.log('👤 Creating default admin user...');
    
    const users = JSON.parse(localStorage.getItem('cbt_users_v1') || '[]');
    const adminExists = users.some(user => user.username === 'admin');
    
    if (adminExists) {
        console.log('⚠️ Admin user already exists');
        return false;
    }
    
    const defaultAdmin = {
        username: "admin",
        password: "admin123",
        role: "admin",
        fullName: "System Administrator",
        email: "admin@healthschool.com",
        createdAt: new Date().toISOString(),
        isDefaultAdmin: true,
        canDeleteDefaultAdmin: true
    };
    
    users.push(defaultAdmin);
    localStorage.setItem('cbt_users_v1', JSON.stringify(users));
    
    console.log('✅ Default admin user created successfully!');
    console.log('🔐 Login credentials: admin / admin123');
    return true;
}

// Test login
function testLogin() {
    console.log('🔐 Testing login...');
    
    const users = JSON.parse(localStorage.getItem('cbt_users_v1') || '[]');
    const admin = users.find(u => 
        u.username.toLowerCase() === 'admin' && 
        u.password === 'admin123'
    );
    
    if (admin) {
        console.log('✅ Login test passed!');
        console.log(`👤 Admin user found: ${admin.username} (${admin.role})`);
        return true;
    } else {
        console.log('❌ Login test failed - admin not found');
        return false;
    }
}

// Check current users
function checkUsers() {
    console.log('🔍 Checking current users...');
    
    const users = JSON.parse(localStorage.getItem('cbt_users_v1') || '[]');
    console.log(`📋 Found ${users.length} users in localStorage`);
    
    if (users.length > 0) {
        users.forEach((user, index) => {
            console.log(`👤 User ${index + 1}: ${user.username} (${user.role})`);
        });
    } else {
        console.log('📋 No users found in localStorage');
    }
}

// Clear all data
function clearData() {
    console.log('🗑️ Clearing all localStorage data...');
    localStorage.clear();
    console.log('✅ All data cleared');
}

// Auto-run
console.log('🚀 Running CBT Default Admin Creator...');
checkUsers();

const adminExists = JSON.parse(localStorage.getItem('cbt_users_v1') || '[]').some(user => user.username === 'admin');
if (!adminExists) {
    console.log('🔧 Creating default admin user...');
    createDefaultAdmin();
    testLogin();
} else {
    console.log('✅ Default admin already exists');
    testLogin();
}

console.log('🎯 Use these functions:');
console.log('- createDefaultAdmin() - Create the default admin');
console.log('- testLogin() - Test if login works');
console.log('- checkUsers() - Check current users');
console.log('- clearData() - Clear all data'); 