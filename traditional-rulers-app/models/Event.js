const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Event description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  type: {
    type: String,
    required: [true, 'Event type is required'],
    enum: [
      'cultural_ceremony',
      'religious_observance',
      'community_meeting',
      'festival',
      'wedding',
      'funeral',
      'coronation',
      'harvest_festival',
      'initiation_ceremony',
      'council_meeting',
      'dispute_hearing',
      'other'
    ]
  },
  category: {
    type: String,
    enum: ['public', 'community', 'private', 'royal'],
    default: 'community'
  },
  community: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    required: [true, 'Community is required']
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Organizer is required']
  },
  coOrganizers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  time: {
    start: String,
    end: String
  },
  location: {
    name: {
      type: String,
      required: [true, 'Location name is required']
    },
    address: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    type: {
      type: String,
      enum: ['palace', 'shrine', 'market_square', 'community_center', 'outdoor', 'indoor', 'other']
    }
  },
  attendees: {
    expected: {
      type: Number,
      min: [0, 'Expected attendees cannot be negative']
    },
    confirmed: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    actual: {
      type: Number,
      min: [0, 'Actual attendees cannot be negative']
    }
  },
  requirements: {
    dressCode: String,
    items: [String],
    contributions: [{
      type: String,
      amount: Number,
      description: String
    }],
    specialInstructions: String
  },
  culturalSignificance: {
    type: String,
    maxlength: [1000, 'Cultural significance cannot exceed 1000 characters']
  },
  traditions: [{
    name: String,
    description: String,
    timing: String,
    participants: String
  }],
  media: {
    images: [{
      url: String,
      caption: String,
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }],
    videos: [{
      url: String,
      caption: String,
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }],
    documents: [{
      url: String,
      name: String,
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }]
  },
  status: {
    type: String,
    enum: ['planned', 'confirmed', 'ongoing', 'completed', 'cancelled', 'postponed'],
    default: 'planned'
  },
  visibility: {
    type: String,
    enum: ['public', 'community', 'invited_only', 'private'],
    default: 'community'
  },
  invitations: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['guest', 'participant', 'official', 'speaker', 'performer']
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'maybe'],
      default: 'pending'
    },
    invitedAt: {
      type: Date,
      default: Date.now
    },
    respondedAt: Date
  }],
  schedule: [{
    time: String,
    activity: String,
    description: String,
    responsible: String,
    duration: String
  }],
  budget: {
    estimated: Number,
    actual: Number,
    currency: {
      type: String,
      default: 'NGN'
    },
    expenses: [{
      item: String,
      amount: Number,
      category: String,
      paidBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      date: Date
    }]
  },
  feedback: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    submittedAt: {
      type: Date,
      default: Date.now
    }
  }],
  reminders: [{
    type: {
      type: String,
      enum: ['email', 'sms', 'push']
    },
    message: String,
    scheduledFor: Date,
    sent: {
      type: Boolean,
      default: false
    }
  }],
  tags: [String],
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurrence: {
    pattern: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly']
    },
    interval: Number,
    endDate: Date
  }
}, {
  timestamps: true
});

// Indexes for better query performance
eventSchema.index({ community: 1, startDate: 1 });
eventSchema.index({ organizer: 1 });
eventSchema.index({ type: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ startDate: 1, endDate: 1 });
eventSchema.index({ 'location.coordinates.latitude': 1, 'location.coordinates.longitude': 1 });

// Virtual for event duration in days
eventSchema.virtual('duration').get(function() {
  return Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24)) + 1;
});

// Virtual for attendance rate
eventSchema.virtual('attendanceRate').get(function() {
  if (!this.attendees.expected || this.attendees.expected === 0) return 0;
  return (this.attendees.actual / this.attendees.expected) * 100;
});

// Method to add attendee
eventSchema.methods.addAttendee = function(userId) {
  if (!this.attendees.confirmed.includes(userId)) {
    this.attendees.confirmed.push(userId);
  }
  return this.save();
};

// Method to remove attendee
eventSchema.methods.removeAttendee = function(userId) {
  this.attendees.confirmed = this.attendees.confirmed.filter(
    id => id.toString() !== userId.toString()
  );
  return this.save();
};

// Method to send invitation
eventSchema.methods.sendInvitation = function(userId, role = 'guest') {
  const existingInvitation = this.invitations.find(
    inv => inv.user.toString() === userId.toString()
  );
  
  if (!existingInvitation) {
    this.invitations.push({
      user: userId,
      role: role
    });
  }
  return this.save();
};

// Method to respond to invitation
eventSchema.methods.respondToInvitation = function(userId, status) {
  const invitation = this.invitations.find(
    inv => inv.user.toString() === userId.toString()
  );
  
  if (invitation) {
    invitation.status = status;
    invitation.respondedAt = new Date();
  }
  return this.save();
};

// Method to add feedback
eventSchema.methods.addFeedback = function(userId, rating, comment) {
  this.feedback.push({
    user: userId,
    rating: rating,
    comment: comment
  });
  return this.save();
};

module.exports = mongoose.model('Event', eventSchema);
