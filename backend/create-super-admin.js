const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('./src/models/User');
const Tenant = require('./src/models/Tenant');
const AuditLog = require('./src/models/AuditLog');

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

// Create super admin user
const createSuperAdmin = async () => {
  try {
    console.log('🔧 Creating super admin user...');
    
    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
    if (existingSuperAdmin) {
      console.log('⚠️ Super admin already exists:', existingSuperAdmin.email);
      return existingSuperAdmin;
    }
    
    // Create a system tenant for super admin
    const systemTenant = new Tenant({
      name: 'System Administration',
      slug: 'system-admin',
      contact_email: 'admin@cbt-system.com',
      plan: 'enterprise',
      metadata: {
        type: 'system',
        description: 'System administration tenant'
      }
    });
    
    await systemTenant.save();
    console.log('✅ System tenant created');
    
    // Generate super admin password
    const password = 'superadmin123'; // Change this in production
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create super admin user
    const superAdmin = new User({
      tenant_id: systemTenant._id,
      username: 'superadmin',
      email: 'superadmin@cbt-system.com',
      fullName: 'System Super Administrator',
      password: hashedPassword,
      role: 'super_admin',
      is_default_admin: true,
      is_active: true
    });
    
    await superAdmin.save();
    
    // Create audit log
    await new AuditLog({
      actor_user_id: superAdmin._id,
      actor_ip: '127.0.0.1',
      actor_user_agent: 'system-init-script',
      action: 'user.create',
      resource_type: 'user',
      resource_id: superAdmin._id,
      details: {
        role: 'super_admin',
        tenant_id: systemTenant._id,
        tenant_name: systemTenant.name
      }
    }).save();
    
    console.log('✅ Super admin user created successfully!');
    console.log('📧 Email: superadmin@cbt-system.com');
    console.log('🔑 Password: superadmin123');
    console.log('⚠️  IMPORTANT: Change this password immediately in production!');
    
    return superAdmin;
    
  } catch (error) {
    console.error('❌ Error creating super admin:', error);
    throw error;
  }
};

// Create managed admin user
const createManagedAdmin = async () => {
  try {
    console.log('🔧 Creating managed admin user...');
    
    // Check if managed admin already exists
    const existingManagedAdmin = await User.findOne({ role: 'managed_admin' });
    if (existingManagedAdmin) {
      console.log('⚠️ Managed admin already exists:', existingManagedAdmin.email);
      return existingManagedAdmin;
    }
    
    // Find system tenant
    const systemTenant = await Tenant.findOne({ slug: 'system-admin' });
    if (!systemTenant) {
      throw new Error('System tenant not found');
    }
    
    // Generate managed admin password
    const password = 'managedadmin123'; // Change this in production
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create managed admin user
    const managedAdmin = new User({
      tenant_id: systemTenant._id,
      username: 'managedadmin',
      email: 'managedadmin@cbt-system.com',
      fullName: 'Managed Administrator',
      password: hashedPassword,
      role: 'managed_admin',
      is_default_admin: false,
      is_active: true
    });
    
    await managedAdmin.save();
    
    // Create audit log
    await new AuditLog({
      actor_user_id: managedAdmin._id,
      actor_ip: '127.0.0.1',
      actor_user_agent: 'system-init-script',
      action: 'user.create',
      resource_type: 'user',
      resource_id: managedAdmin._id,
      details: {
        role: 'managed_admin',
        tenant_id: systemTenant._id,
        tenant_name: systemTenant.name
      }
    }).save();
    
    console.log('✅ Managed admin user created successfully!');
    console.log('📧 Email: managedadmin@cbt-system.com');
    console.log('🔑 Password: managedadmin123');
    console.log('⚠️  IMPORTANT: Change this password immediately in production!');
    
    return managedAdmin;
    
  } catch (error) {
    console.error('❌ Error creating managed admin:', error);
    throw error;
  }
};

// Main execution
const main = async () => {
  console.log('🚀 Initializing Multi-Tenant CBT System...\n');
  
  try {
    await connectDB();
    
    // Create super admin
    const superAdmin = await createSuperAdmin();
    
    // Create managed admin
    const managedAdmin = await createManagedAdmin();
    
    console.log('\n✅ Multi-tenant system initialization completed!');
    console.log('🔐 Super Admin: superadmin@cbt-system.com / superadmin123');
    console.log('🔐 Managed Admin: managedadmin@cbt-system.com / managedadmin123');
    console.log('🌐 Access the Managed Admin UI to create school tenants');
    console.log('📋 Ready for production deployment');
    
  } catch (error) {
    console.error('\n❌ Initialization failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { createSuperAdmin, createManagedAdmin };
