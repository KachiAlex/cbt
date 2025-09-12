const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Tenant = require('../src/models/Tenant');

async function checkTenant() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://cbt-admin:admin123@cbt-cluster.1mos0xn.mongodb.net/cbt-multitenant?retryWrites=true&w=majority');
    console.log('✅ Connected to MongoDB');

    // Check if institution exists
    const tenant = await Tenant.findOne({ slug: 'college-of-nursing-sciences' });
    if (tenant) {
      console.log('✅ Found tenant:', tenant.name);
      console.log('Tenant ID:', tenant._id);
      console.log('Slug:', tenant.slug);
      console.log('Suspended:', tenant.suspended);
      console.log('Deleted at:', tenant.deleted_at);
      console.log('Plan:', tenant.plan);
    } else {
      console.log('❌ Tenant not found');
    }

    // List all tenants
    const allTenants = await Tenant.find({});
    console.log('\n📋 All tenants in database:');
    allTenants.forEach(t => {
      console.log(`- ${t.name} (${t.slug}) - Suspended: ${t.suspended}, Deleted: ${t.deleted_at ? 'Yes' : 'No'}`);
    });

  } catch (error) {
    console.error('❌ Error checking tenant:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the script
checkTenant();
