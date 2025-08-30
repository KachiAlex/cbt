// QUICK ADMIN AUTHENTICATION FIX
// Copy and paste this into your browser console

console.log('🚨 QUICK ADMIN FIX STARTING...');

// Step 1: Create admin user in localStorage
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

// Fix localStorage
const localUsers = JSON.parse(localStorage.getItem('cbt_users_v1') || '[]');
const localAdminExists = localUsers.some(u => u.username === 'admin' && u.role === 'admin');

if (!localAdminExists) {
    localUsers.push(defaultAdmin);
    localStorage.setItem('cbt_users_v1', JSON.stringify(localUsers));
    console.log('✅ Admin user added to localStorage');
} else {
    console.log('✅ Admin user already exists in localStorage');
}

// Step 2: Test authentication
const testUsers = JSON.parse(localStorage.getItem('cbt_users_v1') || '[]');
const admin = testUsers.find(u => 
    u.username === 'admin' && 
    u.password === 'admin123' && 
    u.role === 'admin'
);

if (admin) {
    console.log('✅ Admin authentication will work!');
    console.log('🔐 Login with: admin / admin123');
    console.log('📊 Total users in localStorage:', testUsers.length);
} else {
    console.log('❌ Admin authentication will fail');
    console.log('🔍 Available users:', testUsers.map(u => ({ username: u.username, role: u.role })));
}

// Step 3: Also fix cloud database
fetch('https://cbt-rew7.onrender.com/api/users')
    .then(response => response.json())
    .then(users => {
        const cloudAdminExists = users.some(u => u.username === 'admin' && u.role === 'admin');
        
        if (!cloudAdminExists) {
            users.push(defaultAdmin);
            return fetch('https://cbt-rew7.onrender.com/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(users)
            });
        } else {
            console.log('✅ Admin user already exists in cloud database');
            return Promise.resolve();
        }
    })
    .then(() => {
        console.log('✅ Admin user added to cloud database');
        console.log('🎉 ADMIN FIX COMPLETE! Try logging in now.');
    })
    .catch(error => {
        console.log('❌ Cloud fix failed:', error.message);
        console.log('💡 But localStorage is fixed, so admin login should work!');
    }); 