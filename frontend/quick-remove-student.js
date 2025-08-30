// Quick Student Removal Script
// Copy and paste this into your browser console

const API_BASE = 'https://cbt-rew7.onrender.com';
const TARGET_USERNAME = 'onyedika.akoma@gmail.com';

async function quickRemoveStudent() {
    console.log('🗑️ Quick removing student:', TARGET_USERNAME);
    
    try {
        // Get current users
        const response = await fetch(`${API_BASE}/api/users`);
        const users = await response.json();
        
        console.log('📊 Current users:', users.length);
        
        // Find and remove the student
        const filteredUsers = users.filter(u => 
            u.username !== TARGET_USERNAME && 
            u.email !== TARGET_USERNAME
        );
        
        if (filteredUsers.length === users.length) {
            console.log('❌ Student not found in database');
            return;
        }
        
        console.log('✅ Student found, removing...');
        
        // Update database
        const updateResponse = await fetch(`${API_BASE}/api/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(filteredUsers)
        });
        
        if (updateResponse.ok) {
            console.log('✅ Student removed successfully!');
            console.log('📊 Remaining users:', filteredUsers.length);
        } else {
            console.log('❌ Failed to remove student');
        }
        
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

// Also clear from localStorage
function clearLocalStudent() {
    const users = JSON.parse(localStorage.getItem('cbt_users_v1') || '[]');
    const registrations = JSON.parse(localStorage.getItem('cbt_student_registrations_v1') || '[]');
    
    const filteredUsers = users.filter(u => 
        u.username !== TARGET_USERNAME && 
        u.email !== TARGET_USERNAME
    );
    
    const filteredRegistrations = registrations.filter(u => 
        u.username !== TARGET_USERNAME && 
        u.email !== TARGET_USERNAME
    );
    
    localStorage.setItem('cbt_users_v1', JSON.stringify(filteredUsers));
    localStorage.setItem('cbt_student_registrations_v1', JSON.stringify(filteredRegistrations));
    
    console.log('✅ Cleared from localStorage');
}

// Run both
quickRemoveStudent();
clearLocalStudent(); 