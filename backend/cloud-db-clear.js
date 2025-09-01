const mongoose = require('mongoose');
require('dotenv').config();

async function cloudDBClear() {
  try {
    console.log('🔗 Connecting to cloud MongoDB...');
    
    // Use the same MONGODB_URI that the cloud server uses
    const mongoUri = process.env.MONGODB_URI;
    console.log('📡 Using MongoDB URI:', mongoUri ? 'Set' : 'Not set');
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to cloud MongoDB');
    
    // Get the database instance
    const db = mongoose.connection.db;
    
    console.log('\n📋 Checking collections...');
    const collections = await db.listCollections().toArray();
    console.log('Collections found:', collections.map(c => c.name));
    
    console.log('\n📋 Checking tenants collection...');
    const tenantsCollection = db.collection('tenants');
    const tenantCount = await tenantsCollection.countDocuments();
    console.log(`Found ${tenantCount} tenants in database`);
    
    if (tenantCount > 0) {
      const tenants = await tenantsCollection.find({}).toArray();
      tenants.forEach((tenant, index) => {
        console.log(`${index + 1}. ${tenant.name} (${tenant.slug}) - ID: ${tenant._id}`);
      });
      
      console.log('\n🗑️ Deleting all tenants...');
      const deleteResult = await tenantsCollection.deleteMany({});
      console.log(`✅ Deleted ${deleteResult.deletedCount} tenants`);
      
      // Also delete users with tenant_id
      console.log('\n🗑️ Deleting tenant users...');
      const usersCollection = db.collection('users');
      const userDeleteResult = await usersCollection.deleteMany({ tenant_id: { $exists: true } });
      console.log(`✅ Deleted ${userDeleteResult.deletedCount} tenant users`);
      
      // Delete exams, questions, and results for these tenants
      console.log('\n🗑️ Deleting tenant data...');
      const examsCollection = db.collection('exams');
      const questionsCollection = db.collection('questions');
      const resultsCollection = db.collection('results');
      
      const examDeleteResult = await examsCollection.deleteMany({ tenant_id: { $exists: true } });
      const questionDeleteResult = await questionsCollection.deleteMany({ tenant_id: { $exists: true } });
      const resultDeleteResult = await resultsCollection.deleteMany({ tenant_id: { $exists: true } });
      
      console.log(`✅ Deleted ${examDeleteResult.deletedCount} exams`);
      console.log(`✅ Deleted ${questionDeleteResult.deletedCount} questions`);
      console.log(`✅ Deleted ${resultDeleteResult.deletedCount} results`);
      
      console.log('\n✅ Cloud database cleared successfully!');
    } else {
      console.log('✅ No tenants found to delete');
    }
    
    // Verify deletion
    const remainingTenants = await tenantsCollection.countDocuments();
    console.log(`\n📋 Remaining tenants: ${remainingTenants}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

cloudDBClear();
