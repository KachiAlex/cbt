#!/usr/bin/env node

/**
 * Firebase Database Migration Script (Same Project)
 * Migrates data from default database to production database within the same Firebase project
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Configuration
const PROJECT_ID = 'cbt-91a97'; // Your Firebase project
const SOURCE_DATABASE = '(default)'; // Source database (test data)
const TARGET_DATABASE = 'production'; // Target database (production data)

// Initialize Firebase Admin SDK
const app = admin.initializeApp({
  projectId: PROJECT_ID
});

// Get database instances
const sourceDb = admin.firestore(app);
const targetDb = admin.firestore(app, TARGET_DATABASE);

// Collections to migrate
const COLLECTIONS = [
  'institutions',
  'admins', 
  'users',
  'exams',
  'questions',
  'results'
];

async function exportFromSource() {
  console.log('🔄 Starting data export from source database...');
  console.log(`📦 Project: ${PROJECT_ID}`);
  console.log(`🗄️  Source Database: ${SOURCE_DATABASE}`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  
  const exportData = {
    projectId: PROJECT_ID,
    sourceDatabase: SOURCE_DATABASE,
    targetDatabase: TARGET_DATABASE,
    timestamp: new Date().toISOString(),
    version: '1.0',
    collections: {},
    summary: {
      totalDocuments: 0,
      totalCollections: 0
    }
  };

  let totalDocuments = 0;

  for (const collectionName of COLLECTIONS) {
    try {
      console.log(`📦 Exporting collection: ${collectionName}`);
      const snapshot = await sourceDb.collection(collectionName).get();
      
      const documents = [];
      snapshot.forEach(doc => {
        documents.push({
          id: doc.id,
          data: doc.data(),
          metadata: {
            createdAt: doc.createTime?.toDate?.()?.toISOString(),
            updatedAt: doc.updateTime?.toDate?.()?.toISOString()
          }
        });
      });
      
      exportData.collections[collectionName] = documents;
      exportData.summary.totalDocuments += documents.length;
      
      console.log(`✅ Exported ${documents.length} documents from ${collectionName}`);
      
    } catch (error) {
      console.error(`❌ Error exporting ${collectionName}:`, error.message);
      exportData.collections[collectionName] = [];
    }
  }

  exportData.summary.totalCollections = COLLECTIONS.length;

  // Create backup directory if it doesn't exist
  const backupDir = path.join(__dirname, 'firebase-database-backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Save export with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const exportPath = path.join(backupDir, `database-export-${timestamp}.json`);
  
  fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
  
  console.log('\n🎉 Export completed successfully!');
  console.log(`💾 Export saved to: ${exportPath}`);
  console.log(`📊 Summary:`);
  console.log(`   - Total Collections: ${exportData.summary.totalCollections}`);
  console.log(`   - Total Documents: ${exportData.summary.totalDocuments}`);
  
  // Print collection summary
  console.log('\n📋 Collection Summary:');
  for (const [collectionName, documents] of Object.entries(exportData.collections)) {
    console.log(`   - ${collectionName}: ${documents.length} documents`);
  }
  
  return exportPath;
}

async function importToTarget(exportPath) {
  console.log('🔄 Starting data import to target database...');
  console.log(`🗄️  Target Database: ${TARGET_DATABASE}`);
  
  const exportData = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
  
  for (const [collectionName, documents] of Object.entries(exportData.collections)) {
    try {
      console.log(`📦 Importing collection: ${collectionName} (${documents.length} documents)`);
      
      for (const docData of documents) {
        // Preserve original document ID
        await targetDb.collection(collectionName).doc(docData.id).set(docData.data);
      }
      
      console.log(`✅ Imported ${documents.length} documents to ${collectionName}`);
      
    } catch (error) {
      console.error(`❌ Error importing ${collectionName}:`, error.message);
    }
  }
  
  console.log('🎉 Data import completed!');
}

async function verifyMigration() {
  console.log('🔍 Verifying database migration...');
  
  for (const collectionName of COLLECTIONS) {
    try {
      const sourceSnapshot = await sourceDb.collection(collectionName).get();
      const targetSnapshot = await targetDb.collection(collectionName).get();
      
      console.log(`${collectionName}: Source=${sourceSnapshot.size}, Target=${targetSnapshot.size}`);
      
      if (sourceSnapshot.size !== targetSnapshot.size) {
        console.warn(`⚠️  Count mismatch in ${collectionName}`);
      } else {
        console.log(`✅ ${collectionName}: Migration successful`);
      }
      
    } catch (error) {
      console.error(`❌ Error verifying ${collectionName}:`, error.message);
    }
  }
}

async function listDatabases() {
  console.log('📋 Available databases:');
  
  try {
    // List databases (this is a simplified version)
    console.log('   🗄️  (default) - Source database (test data)');
    console.log('   🗄️  production - Target database (production data)');
    
    // Check if target database exists by trying to access it
    try {
      await targetDb.collection('_test').limit(1).get();
      console.log('   ✅ Target database (production) is accessible');
    } catch (error) {
      console.log('   ❌ Target database (production) not found - create it first!');
      console.log('   📝 Go to Firebase Console → Firestore Database → Create database');
      console.log('   📝 Database ID: production');
    }
    
  } catch (error) {
    console.error('❌ Error listing databases:', error.message);
  }
}

async function switchToProduction() {
  console.log('🔄 Switching application to production database...');
  
  const configPath = path.join(__dirname, 'frontend_disabled', 'src', 'firebase', 'config.js');
  
  try {
    // Read current config
    let configContent = fs.readFileSync(configPath, 'utf8');
    
    // Check if already using production database
    if (configContent.includes("getFirestore(app, 'production')")) {
      console.log('✅ Application is already using production database');
      return;
    }
    
    // Update config to use production database
    configContent = configContent.replace(
      'export const db = getFirestore(app);',
      "export const db = getFirestore(app, 'production');"
    );
    
    // Write updated config
    fs.writeFileSync(configPath, configContent);
    
    console.log('✅ Configuration updated to use production database');
    console.log('📝 Next steps:');
    console.log('   1. Build frontend: cd frontend_disabled && npm run build');
    console.log('   2. Deploy: firebase deploy --only hosting');
    
  } catch (error) {
    console.error('❌ Error updating configuration:', error.message);
  }
}

async function switchToTest() {
  console.log('🔄 Switching application to test database...');
  
  const configPath = path.join(__dirname, 'frontend_disabled', 'src', 'firebase', 'config.js');
  
  try {
    // Read current config
    let configContent = fs.readFileSync(configPath, 'utf8');
    
    // Update config to use default database
    configContent = configContent.replace(
      "export const db = getFirestore(app, 'production');",
      'export const db = getFirestore(app);'
    );
    
    // Write updated config
    fs.writeFileSync(configPath, configContent);
    
    console.log('✅ Configuration updated to use test database');
    console.log('📝 Next steps:');
    console.log('   1. Build frontend: cd frontend_disabled && npm run build');
    console.log('   2. Deploy: firebase deploy --only hosting');
    
  } catch (error) {
    console.error('❌ Error updating configuration:', error.message);
  }
}

async function main() {
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'export':
        await exportFromSource();
        break;
      case 'import':
        const exportFile = process.argv[3];
        if (!exportFile) {
          console.error('❌ Please provide export file path');
          process.exit(1);
        }
        await importToTarget(exportFile);
        break;
      case 'verify':
        await verifyMigration();
        break;
      case 'full':
        const exportPath = await exportFromSource();
        await importToTarget(exportPath);
        await verifyMigration();
        break;
      case 'list':
        await listDatabases();
        break;
      case 'switch-prod':
        await switchToProduction();
        break;
      case 'switch-test':
        await switchToTest();
        break;
      default:
        console.log(`
🔥 Firebase Database Migration Script (Same Project)

Usage:
  node firebase-database-migration-script.js export        - Export from source database
  node firebase-database-migration-script.js import <file> - Import to target database
  node firebase-database-migration-script.js verify        - Verify migration
  node firebase-database-migration-script.js full          - Full migration (export + import + verify)
  node firebase-database-migration-script.js list          - List available databases
  node firebase-database-migration-script.js switch-prod   - Switch app to production database
  node firebase-database-migration-script.js switch-test   - Switch app to test database

Project: ${PROJECT_ID}
Source Database: ${SOURCE_DATABASE}
Target Database: ${TARGET_DATABASE}

Before running:
1. Create production database in Firebase Console
2. Set up Firebase Admin SDK credentials
3. Run 'npm install firebase-admin' if not already installed

Migration includes:
${COLLECTIONS.map(c => `   - ${c}`).join('\n')}
        `);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    app.delete();
  }
}

if (require.main === module) {
  main();
}

module.exports = { 
  exportFromSource, 
  importToTarget, 
  verifyMigration, 
  listDatabases,
  switchToProduction,
  switchToTest 
};
