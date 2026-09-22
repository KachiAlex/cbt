#!/usr/bin/env node

/**
 * Create Test Admin Account
 * Creates a test admin account for the multi-tenant admin system
 */

const admin = require('firebase-admin');

// Configuration
const PROJECT_ID = 'cbt-91a97';

// Initialize Firebase Admin SDK
const app = admin.initializeApp({
  projectId: PROJECT_ID
});

const auth = admin.auth(app);
const db = admin.firestore(app);

async function createTestAdmin() {
  console.log('🔄 Creating test admin account...');
  
  try {
    // Create admin user in Firebase Auth
    const userRecord = await auth.createUser({
      email: 'admin@cbtpromax.com',
      password: 'admin123',
      displayName: 'System Administrator',
      emailVerified: true
    });

    console.log('✅ Admin user created in Firebase Auth:', userRecord.uid);

    // Create admin record in Firestore
    await db.collection('admins').doc(userRecord.uid).set({
      uid: userRecord.uid,
      username: 'admin',
      email: 'admin@cbtpromax.com',
      fullName: 'System Administrator',
      role: 'super_admin',
      isDefaultAdmin: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ Admin record created in Firestore');

    console.log('\n🎉 Test admin account created successfully!');
    console.log('📧 Email: admin@cbtpromax.com');
    console.log('🔑 Password: admin123');
    console.log('🔗 Login URL: https://cbtpromax.com/admin-login');
    
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      console.log('⚠️  Admin account already exists');
      console.log('📧 Email: admin@cbtpromax.com');
      console.log('🔗 Login URL: https://cbtpromax.com/admin-login');
    } else {
      console.error('❌ Error creating admin account:', error.message);
    }
  } finally {
    app.delete();
  }
}

async function main() {
  try {
    await createTestAdmin();
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { createTestAdmin };
