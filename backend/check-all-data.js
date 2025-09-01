const mongoose = require('mongoose');
require('dotenv').config();

async function checkAllData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const Tenant = require('./src/models/Tenant');
    const User = require('./src/models/User');
    const Exam = require('./src/models/Exam');
    const Question = require('./src/models/Question');
    const Result = require('./src/models/Result');
    
    console.log('\n🔍 Checking all collections...\n');
    
    // Check Tenants
    const tenants = await Tenant.find({});
    console.log('🏢 Tenants:', tenants.length);
    tenants.forEach((tenant, index) => {
      console.log(`  ${index + 1}. ${tenant.name} (${tenant.slug}) - ${tenant.suspended ? 'Suspended' : 'Active'}`);
    });
    
    // Check Users
    const users = await User.find({});
    console.log('\n👥 Users:', users.length);
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.username} (${user.role}) - ${user.is_active ? 'Active' : 'Inactive'}`);
    });
    
    // Check Exams
    const exams = await Exam.find({});
    console.log('\n📝 Exams:', exams.length);
    
    // Check Questions
    const questions = await Question.find({});
    console.log('\n❓ Questions:', questions.length);
    
    // Check Results
    const results = await Result.find({});
    console.log('\n📊 Results:', results.length);
    
    // Check if there are any users with tenant_id
    const tenantUsers = await User.find({ tenant_id: { $exists: true } });
    console.log('\n🏢 Users with tenant_id:', tenantUsers.length);
    tenantUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.username} (tenant_id: ${user.tenant_id})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkAllData();
