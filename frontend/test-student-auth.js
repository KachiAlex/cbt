// Test Student Authentication Script
// Copy and paste this into your browser console

const API_BASE = 'https://cbt-rew7.onrender.com';

async function testStudentAuth() {
    console.log('🧪 Testing student authentication...');
    
    try {
        // Get all users from cloud database
        const response = await fetch(`${API_BASE}/api/users`);
        const users = await response.json();
        
        console.log('📊 Total users in cloud database:', users.length);
        console.log('👥 Users:', users.map(u => ({ username: u.username, role: u.role, email: u.email })));
        
        // Find students
        const students = users.filter(u => u.role === 'student');
        console.log('👨‍🎓 Students found:', students.length);
        students.forEach(student => {
            console.log(`  - ${student.username} (${student.email})`);
        });
        
        // Find admins
        const admins = users.filter(u => u.role === 'admin');
        console.log('👑 Admins found:', admins.length);
        admins.forEach(admin => {
            console.log(`  - ${admin.username} (${admin.email})`);
        });
        
        // Test authentication for each student
        console.log('\n🔐 Testing authentication for each student...');
        for (const student of students) {
            console.log(`\n🧪 Testing login for: ${student.username}`);
            
            // Simulate the authentication logic
            const foundUser = users.find(u => 
                u.username.toLowerCase() === student.username.toLowerCase() && 
                u.password === student.password
            );
            
            if (foundUser) {
                console.log(`✅ Authentication would succeed for ${student.username}`);
            } else {
                console.log(`❌ Authentication would fail for ${student.username}`);
                console.log(`   Expected: username=${student.username}, password=${student.password}`);
            }
        }
        
    } catch (error) {
        console.log('❌ Error testing authentication:', error.message);
    }
}

// Also test localStorage
function testLocalStorage() {
    console.log('\n💾 Testing localStorage...');
    
    const users = JSON.parse(localStorage.getItem('cbt_users_v1') || '[]');
    console.log('📊 Users in localStorage:', users.length);
    console.log('👥 Local users:', users.map(u => ({ username: u.username, role: u.role, email: u.email })));
    
    const registrations = JSON.parse(localStorage.getItem('cbt_student_registrations_v1') || '[]');
    console.log('📝 Student registrations in localStorage:', registrations.length);
}

// Run tests
testStudentAuth();
testLocalStorage(); 