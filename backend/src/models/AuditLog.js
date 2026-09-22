const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // Actor information
  actor_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  actor_ip: {
    type: String,
    required: true
  },
  actor_user_agent: {
    type: String
  },
  
  // Action details
  action: {
    type: String,
    required: true,
    enum: [
      // Tenant actions
      'tenant.create',
      'tenant.update',
      'tenant.suspend',
      'tenant.reinstate',
      'tenant.remove',
      'tenant.delete',
      
      // User actions
      'user.create',
      'user.update',
      'user.delete',
      'user.reset_password',
      'user.login',
      'user.logout',
      
      // Database actions
      'db.backup',
      'db.clear',
      'db.restore',
      
      // System actions
      'system.startup',
      'system.shutdown',
      'system.error'
    ]
  },
  
  // Resource information
  resource_type: {
    type: String,
    enum: ['tenant', 'user', 'exam', 'question', 'result', 'database', 'system'],
    required: true
  },
  resource_id: {
    type: mongoose.Schema.Types.ObjectId
  },
  
  // Action details
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Status
  status: {
    type: String,
    enum: ['success', 'failure', 'pending'],
    default: 'success'
  },
  
  // Error information (if applicable)
  error_message: {
    type: String
  },
  
  // Timestamp
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false
});

// Indexes
auditLogSchema.index({ actor_user_id: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ resource_type: 1, resource_id: 1 });
auditLogSchema.index({ created_at: -1 });
auditLogSchema.index({ status: 1 });

// Virtual for readable action
auditLogSchema.virtual('action_readable').get(function() {
  const actionMap = {
    'tenant.create': 'Created Tenant',
    'tenant.update': 'Updated Tenant',
    'tenant.suspend': 'Suspended Tenant',
    'tenant.reinstate': 'Reinstated Tenant',
    'tenant.remove': 'Removed Tenant',
    'tenant.delete': 'Deleted Tenant',
    'user.create': 'Created User',
    'user.update': 'Updated User',
    'user.delete': 'Deleted User',
    'user.reset_password': 'Reset Password',
    'user.login': 'User Login',
    'user.logout': 'User Logout',
    'db.backup': 'Database Backup',
    'db.clear': 'Database Clear',
    'db.restore': 'Database Restore',
    'system.startup': 'System Startup',
    'system.shutdown': 'System Shutdown',
    'system.error': 'System Error'
  };
  
  return actionMap[this.action] || this.action;
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
