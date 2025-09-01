const mongoose = require('mongoose');
require('dotenv').config();

async function directDBClear() {
  try {
    console.log('🔗 Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');
    
    const Tenant = require('./src/models/Tenant');
    const User = require('./src/models/User');
    
    console.log('\n📋 Checking current institutions...');
    const tenants = await Tenant.find({});
    console.log(`Found ${tenants.length} institutions in database`);
    
    if (tenants.length === 0) {
      console.log('✅ No institutions to delete');
      return;
    }
    
    tenants.forEach((tenant, index) => {
      console.log(`${index + 1}. ${tenant.name} (${tenant.slug}) - ID: ${tenant._id}`);
    });
    
    console.log('\n🗑️ Deleting all institutions...');
    
    // Delete all tenants
    const tenantResult = await Tenant.deleteMany({});
    console.log(`✅ Deleted ${tenantResult.deletedCount} institutions`);
    
    // Delete all users with tenant_id
    const userResult = await User.deleteMany({ tenant_id: { $exists: true } });
    console.log(`✅ Deleted ${userResult.deletedCount} tenant users`);
    
    console.log('\n✅ Database cleared successfully!');
    
    // Verify deletion
    const remainingTenants = await Tenant.find({});
    console.log(`\n📋 Remaining institutions: ${remainingTenants.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

directDBClear();
