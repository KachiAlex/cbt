const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Tenant = require('../src/models/Tenant');
const User = require('../src/models/User');

async function cleanupDuplicates() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://cbt-admin:admin123@cbt-cluster.1mos0xn.mongodb.net/cbt-multitenant?retryWrites=true&w=majority');
    console.log('✅ Connected to MongoDB');

    // Find and remove the duplicate tenant
    const duplicateTenant = await Tenant.findOne({ slug: 'college-of-nursing-sciences-2' });
    if (duplicateTenant) {
      console.log('🗑️  Removing duplicate tenant:', duplicateTenant.name);
      
      // Remove associated users
      await User.deleteMany({ tenant_id: duplicateTenant._id });
      console.log('✅ Removed associated users');
      
      // Remove the duplicate tenant
      await Tenant.deleteOne({ _id: duplicateTenant._id });
      console.log('✅ Removed duplicate tenant');
    }

    // Verify the main tenant exists
    const mainTenant = await Tenant.findOne({ slug: 'college-of-nursing-sciences' });
    if (mainTenant) {
      console.log('✅ Main tenant exists:', mainTenant.name);
      console.log('Tenant ID:', mainTenant._id);
    }

    // List all remaining tenants
    const allTenants = await Tenant.find({});
    console.log('\n📋 Remaining tenants:');
    allTenants.forEach(t => {
      console.log(`- ${t.name} (${t.slug})`);
    });

  } catch (error) {
    console.error('❌ Error cleaning up duplicates:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the script
cleanupDuplicates();
