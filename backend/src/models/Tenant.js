const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  // Basic tenant information
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  
  // Contact information
  address: {
    type: String,
    trim: true
  },
  contact_email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  contact_phone: {
    type: String,
    trim: true
  },
  
  // Configuration
  timezone: {
    type: String,
    default: 'UTC'
  },
  language: {
    type: String,
    default: 'en'
  },
  
  // Branding
  logo_url: {
    type: String,
    trim: true
  },
  
  // Subscription/Plan
  plan: {
    type: String,
    enum: ['basic', 'premium', 'enterprise'],
    default: 'basic'
  },
  
  // Status
  suspended: {
    type: Boolean,
    default: false
  },
  deleted_at: {
    type: Date,
    default: null
  },
  
  // Default Admin Information
  default_admin: {
    username: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    password: {
      type: String,
      required: true
    }
  },
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Audit fields
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes
tenantSchema.index({ slug: 1 });
tenantSchema.index({ suspended: 1 });
tenantSchema.index({ deleted_at: 1 });
tenantSchema.index({ contact_email: 1 });

// Virtual for active status
tenantSchema.virtual('is_active').get(function() {
  return !this.suspended && !this.deleted_at;
});

// Pre-save middleware
tenantSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

module.exports = mongoose.model('Tenant', tenantSchema);
