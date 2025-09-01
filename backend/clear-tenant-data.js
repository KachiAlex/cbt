const mongoose = require('mongoose');
require('dotenv').config();

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

// Clear tenant data
const clearTenantData = async () => {
  try {
    console.log('🗑️ Clearing tenant data from database...');
    
    // Get database reference
    const db = mongoose.connection.db;
    
    // Clear tenants collection
    const tenantResult = await db.collection('tenants').deleteMany({});
    console.log(`✅ Deleted ${tenantResult.deletedCount} tenant records`);
    
    // Clear users with tenant_id (tenant admins)
    const userResult = await db.collection('users').deleteMany({ 
      tenant_id: { $exists: true } 
    });
    console.log(`✅ Deleted ${userResult.deletedCount} tenant admin users`);
    
    // Clear any other tenant-related data
    const examResult = await db.collection('exams').deleteMany({ 
      tenant_id: { $exists: true } 
    });
    console.log(`✅ Deleted ${examResult.deletedCount} tenant-specific exams`);
    
    const questionResult = await db.collection('questions').deleteMany({ 
      tenant_id: { $exists: true } 
    });
    console.log(`✅ Deleted ${questionResult.deletedCount} tenant-specific questions`);
    
    const resultResult = await db.collection('results').deleteMany({ 
      tenant_id: { $exists: true } 
    });
    console.log(`✅ Deleted ${resultResult.deletedCount} tenant-specific results`);
    
    console.log('🎉 Tenant data cleared successfully!');
    
  } catch (error) {
    console.error('❌ Error clearing tenant data:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the script
const run = async () => {
  await connectDB();
  await clearTenantData();
  process.exit(0);
};

run(); 