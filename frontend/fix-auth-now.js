// IMMEDIATE AUTHENTICATION FIX
// Copy and paste this into your browser console to fix authentication NOW

console.log('🚨 IMMEDIATE AUTHENTICATION FIX STARTING...');

const API_BASE = 'https://cbt-rew7.onrender.com';

// Step 1: Create default admin user
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

// Step 2: Fix localStorage
console.log('🔧 Fixing localStorage...');
const localUsers = JSON.parse(localStorage.getItem('cbt_users_v1') || '[]');
const localAdminExists = localUsers.some(u => u.username === 'admin' && u.role === 'admin');

if (!localAdminExists) {
    localUsers.push(defaultAdmin);
    localStorage.setItem('cbt_users_v1', JSON.stringify(localUsers));
    console.log('✅ Admin user added to localStorage');
} else {
    console.log('✅ Admin user already exists in localStorage');
}

// Step 3: Fix cloud database
console.log('🌐 Fixing cloud database...');
fetch(`${API_BASE}/api/users`)
    .then(response => response.json())
    .then(users => {
        const cloudAdminExists = users.some(u => u.username === 'admin' && u.role === 'admin');
        
        if (!cloudAdminExists) {
            users.push(defaultAdmin);
            return fetch(`${API_BASE}/api/users`, {
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
    })
    .catch(error => {
        console.log('❌ Cloud database fix failed:', error.message);
    })
    .finally(() => {
        // Step 4: Test authentication
        console.log('🧪 Testing authentication...');
        
        // Test localStorage
        const testLocalUsers = JSON.parse(localStorage.getItem('cbt_users_v1') || '[]');
        const localAdmin = testLocalUsers.find(u => 
            u.username === 'admin' && 
            u.password === 'admin123' && 
            u.role === 'admin'
        );
        
        if (localAdmin) {
            console.log('✅ Admin authentication will work in localStorage');
        } else {
            console.log('❌ Admin authentication will fail in localStorage');
        }
        
        // Test cloud database
        fetch(`${API_BASE}/api/users`)
            .then(response => response.json())
            .then(users => {
                const cloudAdmin = users.find(u => 
                    u.username === 'admin' && 
                    u.password === 'admin123' && 
                    u.role === 'admin'
                );
                
                if (cloudAdmin) {
                    console.log('✅ Admin authentication will work in cloud database');
                } else {
                    console.log('❌ Admin authentication will fail in cloud database');
                }
                
                console.log('🎉 AUTHENTICATION FIX COMPLETE!');
                console.log('📊 Total users in cloud:', users.length);
                console.log('📊 Total users in localStorage:', testLocalUsers.length);
                console.log('🔐 You can now try logging in with admin/admin123');
            })
            .catch(error => {
                console.log('❌ Could not test cloud authentication:', error.message);
            });
    }); 