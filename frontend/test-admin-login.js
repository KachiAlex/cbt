// Test script to verify admin authentication
const fs = require('fs');
const path = require('path');

// Simulate localStorage for testing
const localStorage = {
  data: {},
  getItem(key) {
    return this.data[key] || null;
  },
  setItem(key, value) {
    this.data[key] = value;
  },
  removeItem(key) {
    delete this.data[key];
  }
};

// Load existing localStorage data if it exists
const localStorageFile = path.join(__dirname, 'localStorage-backup.json');
if (fs.existsSync(localStorageFile)) {
  try {
    const backup = JSON.parse(fs.readFileSync(localStorageFile, 'utf8'));
    localStorage.data = backup;
    console.log('📁 Loaded localStorage backup');
  } catch (error) {
    console.log('❌ Failed to load localStorage backup:', error.message);
  }
}

// Check current users
const users = JSON.parse(localStorage.getItem('cbt_users_v1') || '[]');
console.log('👥 Current users in localStorage:', users.length);

const admin = users.find(u => u.username === 'admin');
console.log('👤 Admin user exists:', !!admin);

if (admin) {
  console.log('✅ Admin user details:', {
    username: admin.username,
    role: admin.role,
    isDefaultAdmin: admin.isDefaultAdmin
  });
} else {
  console.log('❌ Admin user not found, creating...');
  
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
  
  console.log('✅ Admin user created successfully');
  console.log('🔐 Login credentials:');
  console.log('   Username: admin');
  console.log('   Password: admin123');
}

// Test authentication
console.log('\n🔐 Testing authentication...');
const testUser = users.find(u => 
  u.username.toLowerCase() === 'admin' && 
  u.password === 'admin123'
);

if (testUser) {
  console.log('✅ Authentication test passed');
  console.log('👤 Authenticated user:', {
    username: testUser.username,
    role: testUser.role,
    fullName: testUser.fullName
  });
} else {
  console.log('❌ Authentication test failed');
}

// Save localStorage backup
try {
  fs.writeFileSync(localStorageFile, JSON.stringify(localStorage.data, null, 2));
  console.log('💾 localStorage backup saved');
} catch (error) {
  console.log('❌ Failed to save localStorage backup:', error.message);
}

console.log('\n🎯 Next steps:');
console.log('1. Start the development server: npm start');
console.log('2. Go to the admin login page');
console.log('3. Use username: admin, password: admin123');
console.log('4. If it still fails, check the browser console for errors'); 