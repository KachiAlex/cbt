const mongoose = require('mongoose');
require('dotenv').config();
const connectDB = require('./src/config/database');
const Tenant = require('./src/models/Tenant');
const User = require('./src/models/User');

async function debugMismatch() {
  try {
    await connectDB();
    console.log('✅ Database connected');
    
    // Check what the frontend is seeing vs backend
    console.log('\n🔍 Frontend vs Backend Mismatch Debug:');
    
    // Get ALL tenants (including deleted ones)
    const allTenants = await Tenant.find({}).lean();
    console.log(`\n📊 Backend Total Tenants: ${allTenants.length}`);
    
    // Check each tenant
    for (const tenant of allTenants) {
      const userCount = await User.countDocuments({ tenant_id: tenant._id });
      console.log(`\n🏥 Tenant: ${tenant.name}`);
      console.log(`  ID: ${tenant._id}`);
      console.log(`  Slug: ${tenant.slug}`);
      console.log(`  Users: ${userCount}`);
      console.log(`  Deleted: ${tenant.deleted_at ? 'Yes' : 'No'}`);
      console.log(`  Suspended: ${tenant.suspended ? 'Yes' : 'No'}`);
      console.log(`  Created: ${tenant.created_at}`);
      console.log(`  Updated: ${tenant.updated_at}`);
    }
    
    // Check if there are any tenants with null/undefined names
    const nullNameTenants = await Tenant.find({ 
      $or: [
        { name: null },
        { name: undefined },
        { name: '' }
      ]
    });
    
    if (nullNameTenants.length > 0) {
      console.log('\n⚠️ Tenants with null/undefined names:');
      nullNameTenants.forEach(t => {
        console.log(`  ID: ${t._id}, Name: "${t.name}", Slug: "${t.slug}"`);
      });
    }
    
    // Check for any orphaned users (users without tenants)
    const orphanedUsers = await User.find({ tenant_id: null });
    if (orphanedUsers.length > 0) {
      console.log('\n⚠️ Orphaned users (no tenant):');
      orphanedUsers.forEach(u => {
        console.log(`  ${u.username} (${u.role}) - ${u.email}`);
      });
    }
    
    // Check the specific institution the frontend is looking at
    console.log('\n🔍 Frontend Institution Check:');
    console.log('The frontend shows 4 institutions but backend has different data.');
    console.log('This suggests either:');
    console.log('1. Frontend is caching old data');
    console.log('2. Backend has soft-deleted tenants that frontend is still seeing');
    console.log('3. There\'s a data sync issue between frontend and backend');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

debugMismatch();
