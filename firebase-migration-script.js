#!/usr/bin/env node

/**
 * Firebase Data Migration Script
 * Migrates data from test Firebase project to production Firebase project
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Configuration
const TEST_PROJECT_ID = 'cbt-91a97';
const PRODUCTION_PROJECT_ID = 'cbtpromax-prod'; // You'll need to create this

// Initialize Firebase Admin SDKs for both projects
const testApp = admin.initializeApp({
  projectId: TEST_PROJECT_ID
}, 'test');

const productionApp = admin.initializeApp({
  projectId: PRODUCTION_PROJECT_ID
}, 'production');

const testDb = admin.firestore(testApp);
const productionDb = admin.firestore(productionApp);

// Collections to migrate
const COLLECTIONS = [
  'institutions',
  'admins', 
  'users',
  'exams',
  'questions',
  'results'
];

async function exportData() {
  console.log('🔄 Starting data export from test project...');
  
  const exportData = {
    timestamp: new Date().toISOString(),
    collections: {}
  };

  for (const collectionName of COLLECTIONS) {
    try {
      console.log(`📦 Exporting collection: ${collectionName}`);
      const snapshot = await testDb.collection(collectionName).get();
      
      const documents = [];
      snapshot.forEach(doc => {
        documents.push({
          id: doc.id,
          data: doc.data()
        });
      });
      
      exportData.collections[collectionName] = documents;
      console.log(`✅ Exported ${documents.length} documents from ${collectionName}`);
      
    } catch (error) {
      console.error(`❌ Error exporting ${collectionName}:`, error.message);
      exportData.collections[collectionName] = [];
    }
  }

  // Save export to file
  const exportPath = path.join(__dirname, `firebase-export-${Date.now()}.json`);
  fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
  
  console.log(`💾 Export saved to: ${exportPath}`);
  return exportPath;
}

async function importData(exportPath) {
  console.log('🔄 Starting data import to production project...');
  
  const exportData = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
  
  for (const [collectionName, documents] of Object.entries(exportData.collections)) {
    try {
      console.log(`📦 Importing collection: ${collectionName} (${documents.length} documents)`);
      
      for (const docData of documents) {
        await productionDb.collection(collectionName).doc(docData.id).set(docData.data);
      }
      
      console.log(`✅ Imported ${documents.length} documents to ${collectionName}`);
      
    } catch (error) {
      console.error(`❌ Error importing ${collectionName}:`, error.message);
    }
  }
  
  console.log('🎉 Data migration completed!');
}

async function verifyMigration() {
  console.log('🔍 Verifying migration...');
  
  for (const collectionName of COLLECTIONS) {
    try {
      const testSnapshot = await testDb.collection(collectionName).get();
      const productionSnapshot = await productionDb.collection(collectionName).get();
      
      console.log(`${collectionName}: Test=${testSnapshot.size}, Production=${productionSnapshot.size}`);
      
      if (testSnapshot.size !== productionSnapshot.size) {
        console.warn(`⚠️  Count mismatch in ${collectionName}`);
      }
      
    } catch (error) {
      console.error(`❌ Error verifying ${collectionName}:`, error.message);
    }
  }
}

async function main() {
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'export':
        await exportData();
        break;
      case 'import':
        const exportFile = process.argv[3];
        if (!exportFile) {
          console.error('❌ Please provide export file path');
          process.exit(1);
        }
        await importData(exportFile);
        break;
      case 'verify':
        await verifyMigration();
        break;
      case 'full':
        const exportPath = await exportData();
        await importData(exportPath);
        await verifyMigration();
        break;
      default:
        console.log(`
🔥 Firebase Migration Script

Usage:
  node firebase-migration-script.js export    - Export data from test project
  node firebase-migration-script.js import <file> - Import data to production project  
  node firebase-migration-script.js verify    - Verify migration
  node firebase-migration-script.js full      - Full migration (export + import + verify)

Before running:
1. Create production Firebase project: cbtpromax-prod
2. Set up Firebase Admin SDK credentials
3. Update PRODUCTION_PROJECT_ID in this script
        `);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    testApp.delete();
    productionApp.delete();
  }
}

if (require.main === module) {
  main();
}

module.exports = { exportData, importData, verifyMigration };
