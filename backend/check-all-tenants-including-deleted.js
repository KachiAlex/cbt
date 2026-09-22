const mongoose = require('mongoose');
require('dotenv').config();
const connectDB = require('./src/config/database');
const Tenant = require('./src/models/Tenant');
const User = require('./src/models/User');

async function checkAllTenantsIncludingDeleted() {
  try {
    await connectDB();
    console.log('✅ Database connected');
    
    console.log('\n🔍 Checking ALL Tenants (including deleted):');
    
    // Get ALL tenants without any filters
    const allTenants = await Tenant.find({}).lean();
    console.log(`\n📊 Total Tenants Found: ${allTenants.length}`);
    
    if (allTenants.length === 0) {
      console.log('❌ No tenants found at all');
      return;
    }
    
    // Check each tenant in detail
    for (let i = 0; i < allTenants.length; i++) {
      const tenant = allTenants[i];
      console.log(`\n🏥 Tenant ${i + 1}:`);
      console.log(`  Name: "${tenant.name}"`);
      console.log(`  ID: ${tenant._id}`);
      console.log(`  Slug: "${tenant.slug}"`);
      console.log(`  Contact Email: ${tenant.contact_email}`);
      console.log(`  Plan: ${tenant.plan}`);
      console.log(`  Deleted: ${tenant.deleted_at ? 'Yes (' + tenant.deleted_at + ')' : 'No'}`);
      console.log(`  Suspended: ${tenant.suspended ? 'Yes' : 'No'}`);
      console.log(`  Created: ${tenant.created_at || 'Unknown'}`);
      console.log(`  Updated: ${tenant.updated_at || 'Unknown'}`);
      
      // Check if this tenant has users
      const userCount = await User.countDocuments({ tenant_id: tenant._id });
      console.log(`  Users: ${userCount}`);
      
      // Check if this tenant has any data at all
      if (userCount === 0) {
        console.log(`  ⚠️  No users found for this tenant`);
      }
    }
    
    // Check for any tenants that might be hidden
    console.log('\n🔍 Checking for Hidden Data:');
    
    // Check if there are any tenants with empty names but valid slugs
    const emptyNameTenants = await Tenant.find({
      $or: [
        { name: '' },
        { name: null },
        { name: undefined }
      ]
    });
    
    if (emptyNameTenants.length > 0) {
      console.log('\n⚠️ Tenants with empty/null names:');
      emptyNameTenants.forEach(t => {
        console.log(`  ID: ${t._id}, Name: "${t.name}", Slug: "${t.slug}"`);
      });
    }
    
    // Check for any orphaned users
    const orphanedUsers = await User.find({ tenant_id: null });
    if (orphanedUsers.length > 0) {
      console.log('\n⚠️ Users without tenants:');
      orphanedUsers.forEach(u => {
        console.log(`  ${u.username} (${u.role}) - ${u.email}`);
      });
    }
    
    console.log('\n🔍 Analysis:');
    console.log(`Backend shows: ${allTenants.length} tenant(s)`);
    console.log(`Frontend shows: 4 institutions`);
    console.log(`Mismatch: ${4 - allTenants.length} institutions`);
    
    if (allTenants.length < 4) {
      console.log('\n❌ The frontend is showing more institutions than exist in the database.');
      console.log('This could mean:');
      console.log('1. Frontend has cached/stale data');
      console.log('2. Frontend is getting data from a different source');
      console.log('3. There are soft-deleted tenants that frontend is still seeing');
      console.log('4. There\'s a data sync issue between frontend and backend');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

checkAllTenantsIncludingDeleted();
