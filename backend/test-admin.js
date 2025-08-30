const mongoose = require('mongoose');
require('dotenv').config();

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cbt');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Test admin user creation
const testAdminCreation = async () => {
  try {
    const User = require('./src/models/User');
    
    // Check if admin exists
    const existingAdmin = await User.findOne({ username: 'admin' });
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      console.log('Username:', existingAdmin.username);
      console.log('Role:', existingAdmin.role);
      console.log('Full Name:', existingAdmin.fullName);
      return;
    }
    
    // Create admin user
    const adminUser = new User({
      username: 'admin',
      password: 'admin123',
      role: 'admin',
      fullName: 'System Administrator',
      email: 'admin@healthschool.com',
      createdAt: new Date()
    });
    
    await adminUser.save();
    console.log('✅ Admin user created successfully');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('Role: admin');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  }
};

// Test authentication
const testAuthentication = async () => {
  try {
    const User = require('./src/models/User');
    
    // Test admin login
    const user = await User.findOne({ 
      username: { $regex: /^admin$/i },
      password: 'admin123'
    });
    
    if (user) {
      console.log('✅ Authentication test passed');
      console.log('User found:', user.username, user.role);
    } else {
      console.log('❌ Authentication test failed');
    }
    
  } catch (error) {
    console.error('❌ Error testing authentication:', error);
  }
};

// Run tests
const runTests = async () => {
  console.log('🧪 Testing CBT Admin Setup...\n');
  
  await connectDB();
  await testAdminCreation();
  await testAuthentication();
  
  console.log('\n✅ Tests completed');
  process.exit(0);
};

runTests(); 