#!/usr/bin/env node

/**
 * Automated Backup System
 * 
 * This script provides automated backup functionality for the CBT system
 * with configurable retention policies and backup strategies.
 * 
 * Run with: node scripts/automated-backup.js [--full] [--incremental]
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
require('dotenv').config();

const execAsync = promisify(exec);

// Import models
const User = require('../src/models/User');
const Tenant = require('../src/models/Tenant');
const Exam = require('../src/models/Exam');
const Question = require('../src/models/Question');
const Result = require('../src/models/Result');
const AuditLog = require('../src/models/AuditLog');

// Backup configuration
const BACKUP_CONFIG = {
  retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30,
  maxBackups: parseInt(process.env.MAX_BACKUPS) || 10,
  backupDir: process.env.BACKUP_DIR || path.join(__dirname, '../backups'),
  compressionEnabled: process.env.BACKUP_COMPRESSION === 'true',
  encryptionEnabled: process.env.BACKUP_ENCRYPTION === 'true'
};

class BackupManager {
  constructor() {
    this.backupDir = BACKUP_CONFIG.backupDir;
    this.ensureBackupDirectory();
  }

  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log(`📁 Created backup directory: ${this.backupDir}`);
    }
  }

  async connectToDatabase() {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('✅ Connected to MongoDB');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  async createFullBackup() {
    console.log('🔄 Starting full backup...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `full-backup-${timestamp}`;
    
    try {
      // Create backup directory for this backup
      const backupPath = path.join(this.backupDir, backupName);
      fs.mkdirSync(backupPath, { recursive: true });

      // Backup all collections
      const collections = [
        { name: 'users', model: User },
        { name: 'tenants', model: Tenant },
        { name: 'exams', model: Exam },
        { name: 'questions', model: Question },
        { name: 'results', model: Result },
        { name: 'auditlogs', model: AuditLog }
      ];

      const backupData = {
        metadata: {
          type: 'full',
          timestamp: new Date().toISOString(),
          version: '1.0',
          collections: []
        },
        data: {}
      };

      for (const collection of collections) {
        console.log(`📦 Backing up ${collection.name}...`);
        const data = await collection.model.find({}).lean();
        backupData.data[collection.name] = data;
        backupData.metadata.collections.push({
          name: collection.name,
          count: data.length,
          size: JSON.stringify(data).length
        });
        console.log(`✅ Backed up ${data.length} ${collection.name} records`);
      }

      // Save backup data
      const backupFile = path.join(backupPath, 'backup.json');
      fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));

      // Compress if enabled
      if (BACKUP_CONFIG.compressionEnabled) {
        await this.compressBackup(backupPath);
      }

      // Create backup manifest
      await this.createBackupManifest(backupPath, backupData.metadata);

      console.log(`✅ Full backup completed: ${backupName}`);
      return backupName;

    } catch (error) {
      console.error('❌ Full backup failed:', error);
      throw error;
    }
  }

  async createIncrementalBackup() {
    console.log('🔄 Starting incremental backup...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `incremental-backup-${timestamp}`;
    
    try {
      // Get last backup timestamp
      const lastBackupTime = await this.getLastBackupTime();
      
      // Create backup directory
      const backupPath = path.join(this.backupDir, backupName);
      fs.mkdirSync(backupPath, { recursive: true });

      const backupData = {
        metadata: {
          type: 'incremental',
          timestamp: new Date().toISOString(),
          lastBackupTime: lastBackupTime,
          version: '1.0',
          collections: []
        },
        data: {}
      };

      // Backup only changed data
      const collections = [
        { name: 'users', model: User },
        { name: 'tenants', model: Tenant },
        { name: 'exams', model: Exam },
        { name: 'questions', model: Question },
        { name: 'results', model: Result },
        { name: 'auditlogs', model: AuditLog }
      ];

      for (const collection of collections) {
        console.log(`📦 Backing up changed ${collection.name}...`);
        
        // Find documents modified since last backup
        const query = lastBackupTime ? 
          { updatedAt: { $gt: new Date(lastBackupTime) } } : 
          {};
        
        const data = await collection.model.find(query).lean();
        backupData.data[collection.name] = data;
        backupData.metadata.collections.push({
          name: collection.name,
          count: data.length,
          size: JSON.stringify(data).length
        });
        console.log(`✅ Backed up ${data.length} changed ${collection.name} records`);
      }

      // Save backup data
      const backupFile = path.join(backupPath, 'backup.json');
      fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));

      // Compress if enabled
      if (BACKUP_CONFIG.compressionEnabled) {
        await this.compressBackup(backupPath);
      }

      // Create backup manifest
      await this.createBackupManifest(backupPath, backupData.metadata);

      console.log(`✅ Incremental backup completed: ${backupName}`);
      return backupName;

    } catch (error) {
      console.error('❌ Incremental backup failed:', error);
      throw error;
    }
  }

  async compressBackup(backupPath) {
    try {
      console.log('🗜️  Compressing backup...');
      const { stdout, stderr } = await execAsync(`tar -czf "${backupPath}.tar.gz" -C "${path.dirname(backupPath)}" "${path.basename(backupPath)}"`);
      
      if (stderr) {
        console.warn('⚠️  Compression warning:', stderr);
      }
      
      // Remove uncompressed directory
      fs.rmSync(backupPath, { recursive: true, force: true });
      console.log('✅ Backup compressed successfully');
    } catch (error) {
      console.error('❌ Compression failed:', error);
      throw error;
    }
  }

  async createBackupManifest(backupPath, metadata) {
    const manifest = {
      ...metadata,
      backupPath: backupPath,
      size: await this.getBackupSize(backupPath),
      checksum: await this.calculateChecksum(backupPath)
    };

    const manifestFile = path.join(backupPath, 'manifest.json');
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
  }

  async getBackupSize(backupPath) {
    try {
      const stats = fs.statSync(backupPath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  async calculateChecksum(backupPath) {
    // Simple checksum calculation
    const crypto = require('crypto');
    const files = fs.readdirSync(backupPath);
    const hash = crypto.createHash('md5');
    
    files.forEach(file => {
      const filePath = path.join(backupPath, file);
      const content = fs.readFileSync(filePath);
      hash.update(content);
    });
    
    return hash.digest('hex');
  }

  async getLastBackupTime() {
    try {
      const backups = fs.readdirSync(this.backupDir);
      const fullBackups = backups.filter(backup => backup.startsWith('full-backup-'));
      
      if (fullBackups.length === 0) return null;
      
      // Get the most recent full backup
      const latestBackup = fullBackups.sort().pop();
      const manifestPath = path.join(this.backupDir, latestBackup, 'manifest.json');
      
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        return manifest.timestamp;
      }
      
      return null;
    } catch (error) {
      console.warn('⚠️  Could not determine last backup time:', error.message);
      return null;
    }
  }

  async cleanupOldBackups() {
    console.log('🧹 Cleaning up old backups...');
    
    try {
      const backups = fs.readdirSync(this.backupDir);
      const backupDirs = backups.filter(backup => 
        backup.startsWith('full-backup-') || backup.startsWith('incremental-backup-')
      );

      // Sort by creation time (newest first)
      const sortedBackups = backupDirs.sort((a, b) => {
        const aTime = fs.statSync(path.join(this.backupDir, a)).mtime;
        const bTime = fs.statSync(path.join(this.backupDir, b)).mtime;
        return bTime - aTime;
      });

      // Keep only the most recent backups
      const backupsToKeep = sortedBackups.slice(0, BACKUP_CONFIG.maxBackups);
      const backupsToDelete = sortedBackups.slice(BACKUP_CONFIG.maxBackups);

      for (const backup of backupsToDelete) {
        const backupPath = path.join(this.backupDir, backup);
        fs.rmSync(backupPath, { recursive: true, force: true });
        console.log(`🗑️  Deleted old backup: ${backup}`);
      }

      console.log(`✅ Cleanup completed. Kept ${backupsToKeep.length} backups, deleted ${backupsToDelete.length} old backups`);

    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  }

  async listBackups() {
    console.log('📋 Available backups:');
    
    try {
      const backups = fs.readdirSync(this.backupDir);
      const backupDirs = backups.filter(backup => 
        backup.startsWith('full-backup-') || backup.startsWith('incremental-backup-')
      );

      if (backupDirs.length === 0) {
        console.log('   No backups found');
        return;
      }

      for (const backup of backupDirs.sort()) {
        const backupPath = path.join(this.backupDir, backup);
        const manifestPath = path.join(backupPath, 'manifest.json');
        
        if (fs.existsSync(manifestPath)) {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          console.log(`   ${backup} (${manifest.type}) - ${manifest.timestamp}`);
        } else {
          console.log(`   ${backup} (no manifest)`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to list backups:', error);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const backupManager = new BackupManager();

  try {
    await backupManager.connectToDatabase();

    if (args.includes('--full')) {
      await backupManager.createFullBackup();
    } else if (args.includes('--incremental')) {
      await backupManager.createIncrementalBackup();
    } else if (args.includes('--list')) {
      await backupManager.listBackups();
    } else if (args.includes('--cleanup')) {
      await backupManager.cleanupOldBackups();
    } else {
      // Default: create incremental backup
      await backupManager.createIncrementalBackup();
    }

    // Always cleanup old backups after creating new ones
    if (!args.includes('--list')) {
      await backupManager.cleanupOldBackups();
    }

    console.log('🎉 Backup operation completed successfully!');

  } catch (error) {
    console.error('💥 Backup operation failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = BackupManager;
