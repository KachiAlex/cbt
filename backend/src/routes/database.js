const express = require('express');
const router = express.Router();
const { clearDatabase, verifyBackup } = require('../../clear-database');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

// Middleware to check if user is super admin
const requireSuperAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied. Super admin role required.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authentication error' });
  }
};

// Clear database endpoint
router.post('/clear', requireSuperAdmin, async (req, res) => {
  try {
    const {
      mode = 'soft',
      snapshot_id,
      operator_id,
      approvals = [],
      confirm = false
    } = req.body;

    // Validate required fields
    if (!snapshot_id || !operator_id || !confirm) {
      return res.status(400).json({
        error: 'Missing required fields: snapshot_id, operator_id, confirm'
      });
    }

    // Check if database clear is allowed
    if (process.env.ALLOW_DB_CLEAR !== 'true') {
      return res.status(403).json({
        error: 'Database clear is not allowed. Set ALLOW_DB_CLEAR=true to enable.'
      });
    }

    // Verify approvals (minimum 2 for production)
    if (approvals.length < 2) {
      return res.status(400).json({
        error: 'At least 2 approvals required for database clear operation'
      });
    }

    // Verify backup exists
    try {
      await verifyBackup(snapshot_id);
    } catch (error) {
      return res.status(400).json({
        error: `Backup verification failed: ${error.message}`
      });
    }

    // Create audit log for clear initiation
    await new AuditLog({
      actor_user_id: req.user.id,
      actor_ip: req.ip,
      actor_user_agent: req.get('User-Agent'),
      action: 'db.clear',
      resource_type: 'database',
      details: {
        mode,
        snapshot_id,
        operator_id,
        approvals,
        status: 'initiated'
      }
    }).save();

    // Execute database clear
    await clearDatabase(mode, snapshot_id);

    // Create audit log for clear completion
    await new AuditLog({
      actor_user_id: req.user.id,
      actor_ip: req.ip,
      actor_user_agent: req.get('User-Agent'),
      action: 'db.clear',
      resource_type: 'database',
      details: {
        mode,
        snapshot_id,
        operator_id,
        approvals,
        status: 'completed',
        timestamp: new Date().toISOString()
      }
    }).save();

    res.json({
      message: 'Database cleared successfully',
      mode,
      snapshot_id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Database clear error:', error);
    
    // Create audit log for failure
    try {
      await new AuditLog({
        actor_user_id: req.user.id,
        actor_ip: req.ip,
        actor_user_agent: req.get('User-Agent'),
        action: 'db.clear',
        resource_type: 'database',
        status: 'failure',
        error_message: error.message,
        details: {
          mode: req.body.mode,
          snapshot_id: req.body.snapshot_id,
          operator_id: req.body.operator_id
        }
      }).save();
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError);
    }

    res.status(500).json({
      error: 'Database clear failed',
      details: error.message
    });
  }
});

// Get database status
router.get('/status', requireSuperAdmin, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    
    // Get collection stats
    const collections = await db.listCollections().toArray();
    const stats = {};
    
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      stats[collection.name] = count;
    }

    // Get database info
    const dbStats = await db.stats();

    res.json({
      database: {
        name: db.databaseName,
        collections: collections.length,
        data_size: dbStats.dataSize,
        storage_size: dbStats.storageSize,
        indexes: dbStats.indexes
      },
      collections: stats,
      environment: {
        allow_db_clear: process.env.ALLOW_DB_CLEAR === 'true',
        node_env: process.env.NODE_ENV || 'development'
      }
    });

  } catch (error) {
    console.error('Error getting database status:', error);
    res.status(500).json({ error: 'Failed to get database status' });
  }
});

// Create backup endpoint
router.post('/backup', requireSuperAdmin, async (req, res) => {
  try {
    const { description } = req.body;
    
    // Import the backup function
    const { createBackup } = require('../../create-db-backup');
    
    // Create backup
    const backupMetadata = await createBackup();
    
    // Add description if provided
    if (description) {
      backupMetadata.description = description;
    }

    // Create audit log
    await new AuditLog({
      actor_user_id: req.user.id,
      actor_ip: req.ip,
      actor_user_agent: req.get('User-Agent'),
      action: 'db.backup',
      resource_type: 'database',
      details: backupMetadata
    }).save();

    res.json({
      message: 'Backup created successfully',
      backup: backupMetadata
    });

  } catch (error) {
    console.error('Backup creation error:', error);
    res.status(500).json({
      error: 'Backup creation failed',
      details: error.message
    });
  }
});

// List backups
router.get('/backups', requireSuperAdmin, async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const backupDir = path.join(__dirname, '../../backups');
    
    if (!fs.existsSync(backupDir)) {
      return res.json({ backups: [] });
    }

    const backupFolders = fs.readdirSync(backupDir);
    const backups = [];

    for (const folder of backupFolders) {
      const metadataPath = path.join(backupDir, folder, 'backup-metadata.json');
      
      if (fs.existsSync(metadataPath)) {
        try {
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
          backups.push({
            folder,
            ...metadata
          });
        } catch (error) {
          console.warn(`Failed to read metadata for ${folder}:`, error.message);
        }
      }
    }

    // Sort by timestamp (newest first)
    backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({ backups });

  } catch (error) {
    console.error('Error listing backups:', error);
    res.status(500).json({ error: 'Failed to list backups' });
  }
});

module.exports = router;
