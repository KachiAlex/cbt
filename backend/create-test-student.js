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

// Create test student user
const createTestStudent = async () => {
  try {
    const User = require('./src/models/User');
    
    // Check if test student already exists
    const existingStudent = await User.findOne({ username: 'student1' });
    
    if (existingStudent) {
      console.log('✅ Test student already exists');
      console.log('Username:', existingStudent.username);
      console.log('Role:', existingStudent.role);
      console.log('Full Name:', existingStudent.fullName);
      return existingStudent;
    }
    
    // Create test student user
    const testStudent = new User({
      username: 'student1',
      password: 'student123',
      role: 'student',
      fullName: 'Test Student',
      email: 'student1@healthschool.com',
      createdAt: new Date(),
      isDefaultAdmin: false
    });
    
    await testStudent.save();
    console.log('✅ Test student created successfully');
    console.log('Username: student1');
    console.log('Password: student123');
    console.log('Role: student');
    console.log('Full Name: Test Student');
    
    return testStudent;
    
  } catch (error) {
    console.error('❌ Error creating test student:', error);
    return null;
  }
};

// Run the script
const runScript = async () => {
  console.log('🧪 Creating Test Student User...\n');
  
  await connectDB();
  await createTestStudent();
  
  console.log('\n✅ Script completed');
  process.exit(0);
};

runScript();
