const mongoose = require('mongoose');

const communitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Community name is required'],
    trim: true,
    unique: true,
    maxlength: [100, 'Community name cannot exceed 100 characters']
  },
  kingdom: {
    type: String,
    required: [true, 'Kingdom name is required'],
    trim: true,
    maxlength: [100, 'Kingdom name cannot exceed 100 characters']
  },
  region: {
    type: String,
    required: [true, 'Region is required'],
    trim: true
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true,
    default: 'Nigeria'
  },
  ruler: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Community ruler is required']
  },
  chiefs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  elders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  population: {
    type: Number,
    min: [0, 'Population cannot be negative'],
    default: 0
  },
  area: {
    type: Number,
    min: [0, 'Area cannot be negative'],
    default: 0
  },
  coordinates: {
    latitude: {
      type: Number,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180
    }
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  history: {
    type: String,
    maxlength: [5000, 'History cannot exceed 5000 characters']
  },
  culturalPractices: [{
    name: String,
    description: String,
    season: String,
    importance: String
  }],
  landmarks: [{
    name: String,
    type: {
      type: String,
      enum: ['shrine', 'palace', 'market', 'school', 'hospital', 'monument', 'other']
    },
    description: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  }],
  languages: [{
    type: String,
    enum: ['en', 'sw', 'fr', 'yo', 'ig', 'ha', 'zu', 'xh', 'other']
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  establishedDate: Date,
  contactInfo: {
    email: String,
    phone: String,
    address: String
  },
  socialMedia: {
    facebook: String,
    twitter: String,
    instagram: String,
    website: String
  },
  statistics: {
    totalCitizens: { type: Number, default: 0 },
    totalDisputes: { type: Number, default: 0 },
    resolvedDisputes: { type: Number, default: 0 },
    totalEvents: { type: Number, default: 0 },
    lastActivity: Date
  }
}, {
  timestamps: true
});

// Indexes for better query performance
communitySchema.index({ name: 1 });
communitySchema.index({ kingdom: 1 });
communitySchema.index({ region: 1 });
communitySchema.index({ country: 1 });
communitySchema.index({ ruler: 1 });
communitySchema.index({ 'coordinates.latitude': 1, 'coordinates.longitude': 1 });

// Virtual for dispute resolution rate
communitySchema.virtual('disputeResolutionRate').get(function() {
  if (this.statistics.totalDisputes === 0) return 0;
  return (this.statistics.resolvedDisputes / this.statistics.totalDisputes) * 100;
});

// Method to update statistics
communitySchema.methods.updateStatistics = function() {
  return this.constructor.aggregate([
    { $match: { _id: this._id } },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: 'community',
        as: 'citizens'
      }
    },
    {
      $lookup: {
        from: 'disputes',
        localField: '_id',
        foreignField: 'community',
        as: 'disputes'
      }
    },
    {
      $lookup: {
        from: 'events',
        localField: '_id',
        foreignField: 'community',
        as: 'events'
      }
    },
    {
      $addFields: {
        'statistics.totalCitizens': { $size: '$citizens' },
        'statistics.totalDisputes': { $size: '$disputes' },
        'statistics.resolvedDisputes': {
          $size: {
            $filter: {
              input: '$disputes',
              cond: { $eq: ['$$this.status', 'resolved'] }
            }
          }
        },
        'statistics.totalEvents': { $size: '$events' },
        'statistics.lastActivity': new Date()
      }
    }
  ]);
};

module.exports = mongoose.model('Community', communitySchema);
