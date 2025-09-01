const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
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
  address: {
    type: String,
    default: ''
  },
  contact_email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  contact_phone: {
    type: String,
    default: ''
  },
  plan: {
    type: String,
    enum: ['Basic', 'Premium', 'Enterprise'],
    default: 'Basic'
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  logo_url: {
    type: String,
    default: ''
  },
  suspended: {
    type: Boolean,
    default: false
  },
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
      default: ''
    },
    password: {
      type: String,
      required: true
    }
  },
  settings: {
    max_students: {
      type: Number,
      default: 100
    },
    max_exams: {
      type: Number,
      default: 10
    },
    features: {
      type: [String],
      default: ['basic_exams', 'basic_reports']
    }
  },
  deleted_at: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient queries
tenantSchema.index({ slug: 1 });
tenantSchema.index({ deleted_at: 1 });
tenantSchema.index({ suspended: 1 });

// Pre-save middleware to generate slug if not provided
tenantSchema.pre('save', function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});

module.exports = mongoose.model('Tenant', tenantSchema);
