const mongoose = require('mongoose');
require('dotenv').config();

async function wipeCloudInstitutions() {
  try {
    console.log('🗑️ WIPING CLOUD INSTITUTIONS...');
    console.log('🔗 Connecting to production MongoDB...');
    
    // Connect to the production database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to production MongoDB');
    
    const db = mongoose.connection.db;
    
    console.log('\n📋 Checking current state...');
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    // Get all collections
    const tenantsCollection = db.collection('tenants');
    const usersCollection = db.collection('users');
    const examsCollection = db.collection('exams');
    const questionsCollection = db.collection('questions');
    const resultsCollection = db.collection('results');
    
    console.log('\n🗑️ WIPING ALL INSTITUTION DATA...');
    
    // Delete ALL tenants (not just soft-deleted ones)
    const tenantResult = await tenantsCollection.deleteMany({});
    console.log(`✅ WIPED ${tenantResult.deletedCount} institutions`);
    
    // Delete ALL users with tenant_id
    const userResult = await usersCollection.deleteMany({ tenant_id: { $exists: true } });
    console.log(`✅ WIPED ${userResult.deletedCount} tenant users`);
    
    // Delete ALL exams with tenant_id
    const examResult = await examsCollection.deleteMany({ tenant_id: { $exists: true } });
    console.log(`✅ WIPED ${examResult.deletedCount} tenant exams`);
    
    // Delete ALL questions with tenant_id
    const questionResult = await questionsCollection.deleteMany({ tenant_id: { $exists: true } });
    console.log(`✅ WIPED ${questionResult.deletedCount} tenant questions`);
    
    // Delete ALL results with tenant_id
    const resultResult = await resultsCollection.deleteMany({ tenant_id: { $exists: true } });
    console.log(`✅ WIPED ${resultResult.deletedCount} tenant results`);
    
    console.log('\n✅ CLOUD DATABASE COMPLETELY WIPED!');
    
    // Verify everything is gone
    const remainingTenants = await tenantsCollection.countDocuments();
    const remainingUsers = await usersCollection.countDocuments({ tenant_id: { $exists: true } });
    const remainingExams = await examsCollection.countDocuments({ tenant_id: { $exists: true } });
    
    console.log('\n📋 Verification:');
    console.log(`   Remaining institutions: ${remainingTenants}`);
    console.log(`   Remaining tenant users: ${remainingUsers}`);
    console.log(`   Remaining tenant exams: ${remainingExams}`);
    
    console.log('\n🎉 ALL INSTITUTIONS COMPLETELY REMOVED FROM CLOUD!');
    
  } catch (error) {
    console.error('❌ Error wiping cloud data:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

wipeCloudInstitutions();
