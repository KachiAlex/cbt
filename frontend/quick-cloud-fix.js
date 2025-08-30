// Quick Cloud Database Fix Script
// Run this in your browser console on the CBT app

console.log('🚀 Quick Cloud Database Fix Starting...');

async function quickCloudFix() {
    try {
        console.log('🔍 Step 1: Checking cloud database...');
        
        // Check current cloud users
        const response = await fetch('https://cbt-rew7.onrender.com/api/users');
        if (!response.ok) {
            throw new Error(`Cloud API error: ${response.status}`);
        }
        
        const users = await response.json();
        console.log(`📊 Found ${users.length} users in cloud database`);
        
        // Check if admin exists
        const adminExists = users.some(u => u.username === 'admin' && u.role === 'admin');
        console.log(`👤 Admin exists in cloud: ${adminExists}`);
        
        if (!adminExists) {
            console.log('🔧 Step 2: Creating admin user in cloud...');
            
            const admin = {
                username: "admin",
                password: "admin123",
                role: "admin",
                fullName: "System Administrator",
                email: "admin@healthschool.com",
                createdAt: new Date().toISOString(),
                isDefaultAdmin: true,
                canDeleteDefaultAdmin: true
            };
            
            users.push(admin);
            
            // Save to cloud
            const saveResponse = await fetch('https://cbt-rew7.onrender.com/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(users)
            });
            
            if (saveResponse.ok) {
                console.log('✅ Admin user created in cloud database');
            } else {
                throw new Error(`Failed to save: ${saveResponse.status}`);
            }
        } else {
            console.log('✅ Admin user already exists in cloud');
        }
        
        console.log('🧪 Step 3: Testing cloud authentication...');
        
        // Test cloud authentication
        const authResponse = await fetch('https://cbt-rew7.onrender.com/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });
        
        if (authResponse.ok) {
            const authResult = await authResponse.json();
            console.log('✅ Cloud authentication successful!');
            console.log('🔐 Login credentials: admin / admin123');
            console.log('🎉 Cloud database is now working!');
        } else {
            const error = await authResponse.text();
            console.log(`❌ Cloud authentication failed: ${error}`);
            console.log('🔧 This might be a backend issue');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.log('🔧 Try using the fix-cloud-auth.html tool instead');
    }
}

// Also fix local storage
function fixLocalStorage() {
    console.log('💾 Fixing local storage...');
    
    const admin = {
        username: "admin",
        password: "admin123",
        role: "admin",
        fullName: "System Administrator",
        email: "admin@healthschool.com",
        createdAt: new Date().toISOString(),
        isDefaultAdmin: true,
        canDeleteDefaultAdmin: true
    };
    
    const users = JSON.parse(localStorage.getItem('cbt_users_v1') || '[]');
    const adminExists = users.some(u => u.username === 'admin' && u.role === 'admin');
    
    if (!adminExists) {
        users.push(admin);
        localStorage.setItem('cbt_users_v1', JSON.stringify(users));
        console.log('✅ Admin user created in local storage');
    } else {
        console.log('✅ Admin user already exists in local storage');
    }
}

// Run both fixes
console.log('🔧 Running comprehensive fix...');
fixLocalStorage();
quickCloudFix(); 