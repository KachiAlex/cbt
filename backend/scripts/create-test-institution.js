const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const Tenant = require('../src/models/Tenant');
const User = require('../src/models/User');

async function createTestInstitution() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://cbt-admin:admin123@cbt-cluster.1mos0xn.mongodb.net/cbt-multitenant?retryWrites=true&w=majority');
    console.log('✅ Connected to MongoDB');

    // Check if institution already exists
    const existingTenant = await Tenant.findOne({ slug: 'college-of-nursing-sciences' });
    if (existingTenant) {
      console.log('⚠️  Institution "college-of-nursing-sciences" already exists');
      console.log('Tenant ID:', existingTenant._id);
      return;
    }

    // Create the tenant
    const tenant = new Tenant({
      name: 'College of Nursing Sciences',
      slug: 'college-of-nursing-sciences',
      contact_email: 'admin@collegeofnursing.edu',
      contact_phone: '+234-123-456-7890',
      address: '123 Nursing Street, Lagos, Nigeria',
      plan: 'Premium',
      timezone: 'Africa/Lagos',
      default_admin: {
        username: 'admin',
        email: 'admin@collegeofnursing.edu',
        fullName: 'Institution Administrator',
        phone: '+234-123-456-7890',
        password: await bcrypt.hash('admin123', 10)
      },
      settings: {
        max_students: 500,
        max_exams: 50,
        features: ['basic_exams', 'basic_reports', 'advanced_analytics']
      }
    });

    await tenant.save();
    console.log('✅ Created tenant:', tenant.name);
    console.log('Tenant ID:', tenant._id);

    // Create default admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const adminUser = new User({
      tenant_id: tenant._id,
      username: 'admin',
      email: 'admin@collegeofnursing.edu',
      fullName: 'Institution Administrator',
      password: hashedPassword,
      role: 'admin',
      is_default_admin: true,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });

    await adminUser.save();
    console.log('✅ Created admin user:', adminUser.username);

    // Create a test student
    const studentUser = new User({
      tenant_id: tenant._id,
      username: 'student001',
      email: 'student001@collegeofnursing.edu',
      fullName: 'Test Student',
      password: hashedPassword,
      role: 'student',
      student_id: 'STU001',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });

    await studentUser.save();
    console.log('✅ Created test student:', studentUser.username);

    console.log('\n🎉 Test institution created successfully!');
    console.log('\n📋 Institution Details:');
    console.log('Name: College of Nursing Sciences');
    console.log('Slug: college-of-nursing-sciences');
    console.log('Admin Username: admin');
    console.log('Admin Password: admin123');
    console.log('Student Username: student001');
    console.log('Student Password: admin123');
    console.log('\n🔗 Institution Link:');
    console.log(`https://cbt-91a97.web.app/?institution=college-of-nursing-sciences`);
    console.log('\n🔗 Direct Login Link:');
    console.log(`https://cbt-91a97.web.app/institution-login/college-of-nursing-sciences`);

  } catch (error) {
    console.error('❌ Error creating test institution:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the script
createTestInstitution();
