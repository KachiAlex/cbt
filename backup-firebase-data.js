#!/usr/bin/env node

/**
 * Firebase Data Backup Script
 * Creates a comprehensive backup of your current Firebase data
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Configuration
const PROJECT_ID = 'cbt-91a97'; // Your current test project

// Initialize Firebase Admin SDK
const app = admin.initializeApp({
  projectId: PROJECT_ID
});

const db = admin.firestore(app);

// Collections to backup
const COLLECTIONS = [
  'institutions',
  'admins', 
  'users',
  'exams',
  'questions',
  'results'
];

async function backupData() {
  console.log('🔄 Starting Firebase data backup...');
  console.log(`📦 Project: ${PROJECT_ID}`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  
  const backupData = {
    projectId: PROJECT_ID,
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
      console.log(`📦 Backing up collection: ${collectionName}`);
      const snapshot = await db.collection(collectionName).get();
      
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
      
      backupData.collections[collectionName] = documents;
      backupData.summary.totalDocuments += documents.length;
      
      console.log(`✅ Backed up ${documents.length} documents from ${collectionName}`);
      
    } catch (error) {
      console.error(`❌ Error backing up ${collectionName}:`, error.message);
      backupData.collections[collectionName] = [];
    }
  }

  backupData.summary.totalCollections = COLLECTIONS.length;

  // Create backup directory if it doesn't exist
  const backupDir = path.join(__dirname, 'firebase-backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Save backup with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `firebase-backup-${timestamp}.json`);
  
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
  
  // Also create a latest backup
  const latestPath = path.join(backupDir, 'latest-backup.json');
  fs.writeFileSync(latestPath, JSON.stringify(backupData, null, 2));
  
  console.log('\n🎉 Backup completed successfully!');
  console.log(`💾 Backup saved to: ${backupPath}`);
  console.log(`💾 Latest backup: ${latestPath}`);
  console.log(`📊 Summary:`);
  console.log(`   - Total Collections: ${backupData.summary.totalCollections}`);
  console.log(`   - Total Documents: ${backupData.summary.totalDocuments}`);
  
  // Print collection summary
  console.log('\n📋 Collection Summary:');
  for (const [collectionName, documents] of Object.entries(backupData.collections)) {
    console.log(`   - ${collectionName}: ${documents.length} documents`);
  }
  
  return backupPath;
}

async function verifyBackup(backupPath) {
  console.log('\n🔍 Verifying backup integrity...');
  
  try {
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    
    console.log(`✅ Backup file is valid JSON`);
    console.log(`✅ Project ID: ${backupData.projectId}`);
    console.log(`✅ Timestamp: ${backupData.timestamp}`);
    console.log(`✅ Collections: ${Object.keys(backupData.collections).length}`);
    console.log(`✅ Total Documents: ${backupData.summary.totalDocuments}`);
    
    // Verify each collection
    for (const [collectionName, documents] of Object.entries(backupData.collections)) {
      if (Array.isArray(documents)) {
        console.log(`✅ ${collectionName}: ${documents.length} documents`);
      } else {
        console.error(`❌ ${collectionName}: Invalid document format`);
      }
    }
    
    console.log('\n🎉 Backup verification completed!');
    
  } catch (error) {
    console.error('❌ Backup verification failed:', error.message);
  }
}

async function listBackups() {
  console.log('📋 Available backups:');
  
  const backupDir = path.join(__dirname, 'firebase-backups');
  if (!fs.existsSync(backupDir)) {
    console.log('   No backups found');
    return;
  }
  
  const files = fs.readdirSync(backupDir)
    .filter(file => file.endsWith('.json'))
    .sort()
    .reverse();
  
  if (files.length === 0) {
    console.log('   No backups found');
    return;
  }
  
  files.forEach(file => {
    const filePath = path.join(backupDir, file);
    const stats = fs.statSync(filePath);
    const size = (stats.size / 1024).toFixed(2);
    const modified = stats.mtime.toISOString();
    
    console.log(`   📄 ${file} (${size} KB, ${modified})`);
  });
}

async function main() {
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'backup':
        const backupPath = await backupData();
        await verifyBackup(backupPath);
        break;
      case 'verify':
        const file = process.argv[3];
        if (!file) {
          console.error('❌ Please provide backup file path');
          process.exit(1);
        }
        await verifyBackup(file);
        break;
      case 'list':
        await listBackups();
        break;
      default:
        console.log(`
🔥 Firebase Data Backup Script

Usage:
  node backup-firebase-data.js backup    - Create a new backup
  node backup-firebase-data.js verify <file> - Verify backup integrity
  node backup-firebase-data.js list      - List available backups

Before running:
1. Make sure Firebase Admin SDK is configured
2. Ensure you have access to project: ${PROJECT_ID}
3. Run 'npm install firebase-admin' if not already installed

Backup includes:
${COLLECTIONS.map(c => `   - ${c}`).join('\n')}
        `);
    }
  } catch (error) {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    app.delete();
  }
}

if (require.main === module) {
  main();
}

module.exports = { backupData, verifyBackup, listBackups };
