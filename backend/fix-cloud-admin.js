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

// Fix cloud admin user
const fixCloudAdmin = async () => {
  try {
    const User = require('./src/models/User');
    
    // Find the admin user
    const adminUser = await User.findOne({ username: 'admin' });
    
    if (!adminUser) {
      console.log('❌ Admin user not found in cloud database');
      return;
    }
    
    console.log('👤 Found admin user:', {
      username: adminUser.username,
      role: adminUser.role,
      isDefaultAdmin: adminUser.isDefaultAdmin,
      hasPassword: !!adminUser.password
    });
    
    // Update admin user
    adminUser.password = 'admin123';
    adminUser.isDefaultAdmin = true;
    adminUser.canDeleteDefaultAdmin = true;
    
    await adminUser.save();
    
    console.log('✅ Admin user updated successfully');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('Is Default Admin: true');
    
    // Test authentication
    const testUser = await User.findOne({ 
      username: 'admin',
      password: 'admin123'
    });
    
    if (testUser) {
      console.log('✅ Authentication test passed');
    } else {
      console.log('❌ Authentication test failed');
    }
    
  } catch (error) {
    console.error('❌ Error fixing cloud admin:', error);
  }
};

// Run the script
const runScript = async () => {
  console.log('🔧 Fixing Cloud Database Admin User...\n');
  
  await connectDB();
  await fixCloudAdmin();
  
  console.log('\n✅ Script completed');
  process.exit(0);
};

runScript();
