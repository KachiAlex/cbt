const mongoose = require('mongoose');
require('dotenv').config();

async function checkInstitutions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const Tenant = require('./src/models/Tenant');
    
    // Check all tenants (including soft-deleted ones)
    const allTenants = await Tenant.find({});
    console.log('\n📋 All tenants in database:', allTenants.length);
    
    allTenants.forEach((tenant, index) => {
      console.log(`${index + 1}. ${tenant.name} (slug: ${tenant.slug})`);
      console.log(`   Status: ${tenant.suspended ? 'Suspended' : 'Active'}`);
      console.log(`   Deleted: ${tenant.deleted_at ? 'Yes' : 'No'}`);
      console.log(`   Created: ${tenant.createdAt}`);
      console.log('');
    });
    
    // Check only active tenants
    const activeTenants = await Tenant.find({ deleted_at: null });
    console.log('✅ Active tenants (not deleted):', activeTenants.length);
    
    // Check soft-deleted tenants
    const deletedTenants = await Tenant.find({ deleted_at: { $ne: null } });
    console.log('🗑️ Soft-deleted tenants:', deletedTenants.length);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkInstitutions();
