// Remove Student Console Script
console.log('🗑️ Student Removal Tool');

const API_BASE = 'https://cbt-rew7.onrender.com';
const TARGET_USERNAME = 'onyedika.akoma@gmail.com';

// Remove student from cloud database
async function removeStudentFromCloud() {
    console.log(`🔍 Looking for student: ${TARGET_USERNAME}`);
    
    try {
        // Get all users
        const response = await fetch(`${API_BASE}/api/users`);
        if (!response.ok) {
            throw new Error(`Failed to get users: ${response.status}`);
        }
        
        const users = await response.json();
        console.log(`📊 Found ${users.length} users in cloud database`);
        
        // Find the student
        const studentIndex = users.findIndex(u => 
            u.username === TARGET_USERNAME || 
            u.email === TARGET_USERNAME
        );
        
        if (studentIndex === -1) {
            console.log(`❌ Student ${TARGET_USERNAME} not found in cloud database`);
            console.log('👥 Current users:', users.map(u => ({ username: u.username, email: u.email, role: u.role })));
            return false;
        }
        
        const student = users[studentIndex];
        console.log(`🗑️ Found student to remove:`, student);
        
        // Remove the student
        users.splice(studentIndex, 1);
        
        // Update cloud database
        const updateResponse = await fetch(`${API_BASE}/api/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(users)
        });
        
        if (updateResponse.ok) {
            console.log(`✅ Successfully removed student: ${student.username}`);
            console.log(`📊 Remaining users: ${users.length}`);
            return true;
        } else {
            const error = await updateResponse.json();
            console.log(`❌ Failed to remove student:`, error);
            return false;
        }
        
    } catch (error) {
        console.log(`❌ Error removing student: ${error.message}`);
        return false;
    }
}

// Remove student from localStorage
function removeStudentFromLocal() {
    console.log('🗑️ Removing student from localStorage...');
    
    try {
        // Remove from users
        const users = JSON.parse(localStorage.getItem('cbt_users_v1') || '[]');
        const filteredUsers = users.filter(u => 
            u.username !== TARGET_USERNAME && 
            u.email !== TARGET_USERNAME
        );
        localStorage.setItem('cbt_users_v1', JSON.stringify(filteredUsers));
        
        // Remove from registrations
        const registrations = JSON.parse(localStorage.getItem('cbt_student_registrations_v1') || '[]');
        const filteredRegistrations = registrations.filter(u => 
            u.username !== TARGET_USERNAME && 
            u.email !== TARGET_USERNAME
        );
        localStorage.setItem('cbt_student_registrations_v1', JSON.stringify(filteredRegistrations));
        
        console.log(`✅ Removed from localStorage`);
        console.log(`📊 Remaining local users: ${filteredUsers.length}`);
        console.log(`📊 Remaining local registrations: ${filteredRegistrations.length}`);
        return true;
    } catch (error) {
        console.log(`❌ Error removing from localStorage: ${error.message}`);
        return false;
    }
}

// Remove student completely
async function removeStudentCompletely() {
    console.log('🚀 Starting complete student removal...');
    
    const cloudResult = await removeStudentFromCloud();
    const localResult = removeStudentFromLocal();
    
    if (cloudResult && localResult) {
        console.log('✅ Student removed completely from both cloud and local storage');
    } else {
        console.log('⚠️ Student removal completed with some issues');
    }
}

// Show current users
async function showCurrentUsers() {
    console.log('👥 Getting current users...');
    
    try {
        const response = await fetch(`${API_BASE}/api/users`);
        if (response.ok) {
            const users = await response.json();
            console.log(`📊 Cloud database users (${users.length}):`, users.map(u => ({ username: u.username, email: u.email, role: u.role })));
        } else {
            console.log('❌ Failed to get cloud users');
        }
        
        const localUsers = JSON.parse(localStorage.getItem('cbt_users_v1') || '[]');
        console.log(`📊 Local storage users (${localUsers.length}):`, localUsers.map(u => ({ username: u.username, email: u.email, role: u.role })));
        
    } catch (error) {
        console.log(`❌ Error getting users: ${error.message}`);
    }
}

// Auto-run
console.log('🎯 Target student:', TARGET_USERNAME);
console.log('🔧 Available functions:');
console.log('- removeStudentFromCloud() - Remove from cloud database only');
console.log('- removeStudentFromLocal() - Remove from localStorage only');
console.log('- removeStudentCompletely() - Remove from both');
console.log('- showCurrentUsers() - Show all current users');

// Show current users on load
showCurrentUsers(); 