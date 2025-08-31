const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

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

// Create comprehensive backup
const createBackup = async () => {
  try {
    console.log('🔧 Creating comprehensive database backup...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, 'backups', timestamp);
    
    // Create backup directory
    if (!fs.existsSync(path.join(__dirname, 'backups'))) {
      fs.mkdirSync(path.join(__dirname, 'backups'));
    }
    fs.mkdirSync(backupDir);
    
    // Backup metadata
    const backupMetadata = {
      timestamp: new Date().toISOString(),
      snapshot_id: `snap-${timestamp}`,
      operator_id: 'system-backup',
      commit_hash: process.env.COMMIT_HASH || 'unknown',
      database_url: process.env.MONGODB_URI || 'mongodb://localhost:27017/cbt',
      backup_type: 'full_database_backup'
    };
    
    // Save backup metadata
    fs.writeFileSync(
      path.join(backupDir, 'backup-metadata.json'),
      JSON.stringify(backupMetadata, null, 2)
    );
    
    // Backup all collections
    const collections = ['users', 'exams', 'questions', 'results'];
    const backupData = {};
    
    for (const collectionName of collections) {
      try {
        const collection = mongoose.connection.db.collection(collectionName);
        const documents = await collection.find({}).toArray();
        
        backupData[collectionName] = documents;
        
        // Save individual collection backup
        fs.writeFileSync(
          path.join(backupDir, `${collectionName}.json`),
          JSON.stringify(documents, null, 2)
        );
        
        console.log(`✅ Backed up ${collectionName}: ${documents.length} documents`);
      } catch (error) {
        console.warn(`⚠️ Failed to backup ${collectionName}:`, error.message);
      }
    }
    
    // Save complete backup
    fs.writeFileSync(
      path.join(backupDir, 'complete-backup.json'),
      JSON.stringify(backupData, null, 2)
    );
    
    console.log('✅ Backup completed successfully!');
    console.log(`📁 Backup location: ${backupDir}`);
    console.log(`🆔 Snapshot ID: ${backupMetadata.snapshot_id}`);
    console.log(`📊 Total collections: ${Object.keys(backupData).length}`);
    console.log(`📄 Total documents: ${Object.values(backupData).reduce((sum, docs) => sum + docs.length, 0)}`);
    
    return backupMetadata;
    
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  }
};

// Run backup
const runBackup = async () => {
  console.log('🚀 Starting Database Backup Process...\n');
  
  await connectDB();
  const backupMetadata = await createBackup();
  
  console.log('\n✅ Backup process completed successfully!');
  console.log('🔒 Backup metadata saved for audit trail');
  console.log('📋 Ready for multi-tenant migration');
  
  process.exit(0);
};

runBackup();
