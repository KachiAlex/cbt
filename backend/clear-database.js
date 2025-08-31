const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import models
const Tenant = require('./src/models/Tenant');
const User = require('./src/models/User');
const AuditLog = require('./src/models/AuditLog');
const Exam = require('./src/models/Exam');
const Question = require('./src/models/Question');
const Result = require('./src/models/Result');

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

// Verify backup exists
const verifyBackup = async (snapshotId) => {
  try {
    console.log(`🔍 Verifying backup: ${snapshotId}`);
    
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
      throw new Error('Backup directory does not exist');
    }
    
    const backupFolders = fs.readdirSync(backupDir);
    const targetBackup = backupFolders.find(folder => folder.includes(snapshotId.replace('snap-', '')));
    
    if (!targetBackup) {
      throw new Error(`Backup with snapshot ID ${snapshotId} not found`);
    }
    
    const backupPath = path.join(backupDir, targetBackup);
    const metadataPath = path.join(backupPath, 'backup-metadata.json');
    
    if (!fs.existsSync(metadataPath)) {
      throw new Error('Backup metadata not found');
    }
    
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    console.log('✅ Backup verification successful');
    console.log(`📁 Backup location: ${backupPath}`);
    console.log(`📅 Backup timestamp: ${metadata.timestamp}`);
    
    return metadata;
  } catch (error) {
    console.error('❌ Backup verification failed:', error.message);
    throw error;
  }
};

// Create audit log entry
const createAuditLog = async (action, details, status = 'success') => {
  try {
    const auditLog = new AuditLog({
      actor_user_id: new mongoose.Types.ObjectId(), // System user
      actor_ip: '127.0.0.1',
      actor_user_agent: 'system-clear-script',
      action: action,
      resource_type: 'database',
      details: details,
      status: status
    });
    
    await auditLog.save();
    console.log(`📝 Audit log created: ${action}`);
  } catch (error) {
    console.warn('⚠️ Failed to create audit log:', error.message);
  }
};

// Clear database
const clearDatabase = async (mode = 'soft', snapshotId) => {
  try {
    console.log(`🗑️ Starting database clear in ${mode} mode...`);
    
    // Verify backup first
    const backupMetadata = await verifyBackup(snapshotId);
    
    // Create audit log for clear initiation
    await createAuditLog('db.clear', {
      mode: mode,
      snapshot_id: snapshotId,
      backup_metadata: backupMetadata
    });
    
    if (mode === 'soft') {
      console.log('🔄 Performing soft delete...');
      
      // Soft delete all tenants
      const tenantResult = await Tenant.updateMany(
        {},
        { 
          deleted_at: new Date(),
          suspended: true,
          updated_at: new Date()
        }
      );
      
      // Soft delete all users
      const userResult = await User.updateMany(
        {},
        { 
          is_active: false,
          updated_at: new Date()
        }
      );
      
      // Soft delete all other data
      const examResult = await Exam.updateMany(
        {},
        { deleted_at: new Date() }
      );
      
      const questionResult = await Question.updateMany(
        {},
        { deleted_at: new Date() }
      );
      
      const resultResult = await Result.updateMany(
        {},
        { deleted_at: new Date() }
      );
      
      console.log('✅ Soft delete completed');
      console.log(`📊 Tenants: ${tenantResult.modifiedCount}`);
      console.log(`👥 Users: ${userResult.modifiedCount}`);
      console.log(`📝 Exams: ${examResult.modifiedCount}`);
      console.log(`❓ Questions: ${questionResult.modifiedCount}`);
      console.log(`📊 Results: ${resultResult.modifiedCount}`);
      
    } else if (mode === 'hard') {
      console.log('🗑️ Performing hard delete...');
      
      // Hard delete all collections
      const collections = ['tenants', 'users', 'exams', 'questions', 'results', 'auditlogs'];
      const db = mongoose.connection.db;
      
      for (const collectionName of collections) {
        try {
          const collection = db.collection(collectionName);
          const result = await collection.deleteMany({});
          console.log(`🗑️ Deleted ${result.deletedCount} documents from ${collectionName}`);
        } catch (error) {
          console.warn(`⚠️ Failed to delete ${collectionName}:`, error.message);
        }
      }
      
      console.log('✅ Hard delete completed');
    }
    
    // Create audit log for clear completion
    await createAuditLog('db.clear', {
      mode: mode,
      snapshot_id: snapshotId,
      status: 'completed',
      timestamp: new Date().toISOString()
    });
    
    console.log('✅ Database clear completed successfully!');
    console.log('🔒 All operations logged in audit trail');
    console.log('📋 Ready for multi-tenant setup');
    
  } catch (error) {
    console.error('❌ Database clear failed:', error);
    
    // Create audit log for failure
    await createAuditLog('db.clear', {
      mode: mode,
      snapshot_id: snapshotId,
      error: error.message
    }, 'failure');
    
    throw error;
  }
};

// Main execution
const main = async () => {
  const args = process.argv.slice(2);
  const mode = args[0] || 'soft';
  const snapshotId = args[1];
  const confirm = args[2] === '--confirm';
  
  if (!snapshotId) {
    console.error('❌ Error: Snapshot ID is required');
    console.log('Usage: node clear-database.js <mode> <snapshot-id> --confirm');
    console.log('Example: node clear-database.js soft snap-2025-08-31T07-12-43-139Z --confirm');
    process.exit(1);
  }
  
  if (!confirm) {
    console.error('❌ Error: --confirm flag is required for safety');
    console.log('This will clear the entire database. Use --confirm to proceed.');
    process.exit(1);
  }
  
  console.log('🚨 WARNING: This will clear the entire database!');
  console.log(`📋 Mode: ${mode}`);
  console.log(`🆔 Snapshot ID: ${snapshotId}`);
  console.log('⏰ Starting in 5 seconds...');
  
  // Wait 5 seconds for safety
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  try {
    await connectDB();
    await clearDatabase(mode, snapshotId);
    console.log('\n✅ Database clear completed successfully!');
  } catch (error) {
    console.error('\n❌ Database clear failed:', error.message);
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

module.exports = { clearDatabase, verifyBackup }; 