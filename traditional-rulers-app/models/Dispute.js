const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Dispute title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Dispute description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  category: {
    type: String,
    required: [true, 'Dispute category is required'],
    enum: [
      'land_dispute',
      'family_matter',
      'business_dispute',
      'inheritance',
      'marriage_issues',
      'property_rights',
      'cultural_violation',
      'community_conflict',
      'criminal_matter',
      'other'
    ]
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'resolved', 'dismissed', 'escalated'],
    default: 'pending'
  },
  community: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    required: [true, 'Community is required']
  },
  complainant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Complainant is required']
  },
  respondent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Respondent is required']
  },
  assignedRuler: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedElders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  witnesses: [{
    name: String,
    contact: String,
    statement: String,
    relationship: String
  }],
  evidence: [{
    type: {
      type: String,
      enum: ['document', 'photo', 'audio', 'video', 'witness_statement']
    },
    filename: String,
    url: String,
    description: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  hearings: [{
    date: {
      type: Date,
      required: true
    },
    location: String,
    attendees: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    proceedings: String,
    decisions: [String],
    nextSteps: String,
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  resolution: {
    decision: String,
    reasoning: String,
    compensation: {
      amount: Number,
      currency: {
        type: String,
        default: 'NGN'
      },
      description: String
    },
    conditions: [String],
    deadline: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: Date
  },
  appeal: {
    isAppealed: {
      type: Boolean,
      default: false
    },
    appealReason: String,
    appealDate: Date,
    appealedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    appealStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }
  },
  tags: [String],
  isPublic: {
    type: Boolean,
    default: false
  },
  confidentiality: {
    type: String,
    enum: ['public', 'community_only', 'parties_only', 'confidential'],
    default: 'community_only'
  },
  relatedDisputes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dispute'
  }],
  notes: [{
    content: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    isPrivate: {
      type: Boolean,
      default: false
    }
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
disputeSchema.index({ community: 1, status: 1 });
disputeSchema.index({ complainant: 1 });
disputeSchema.index({ respondent: 1 });
disputeSchema.index({ assignedRuler: 1 });
disputeSchema.index({ category: 1 });
disputeSchema.index({ priority: 1 });
disputeSchema.index({ createdAt: -1 });

// Virtual for dispute duration
disputeSchema.virtual('duration').get(function() {
  if (this.status === 'resolved' && this.resolution.resolvedAt) {
    return Math.ceil((this.resolution.resolvedAt - this.createdAt) / (1000 * 60 * 60 * 24));
  }
  return Math.ceil((new Date() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Method to add hearing
disputeSchema.methods.addHearing = function(hearingData) {
  this.hearings.push(hearingData);
  return this.save();
};

// Method to update status
disputeSchema.methods.updateStatus = function(newStatus, updatedBy) {
  this.status = newStatus;
  if (newStatus === 'resolved') {
    this.resolution.resolvedAt = new Date();
    this.resolution.resolvedBy = updatedBy;
  }
  return this.save();
};

// Method to add evidence
disputeSchema.methods.addEvidence = function(evidenceData) {
  this.evidence.push(evidenceData);
  return this.save();
};

// Method to add note
disputeSchema.methods.addNote = function(noteContent, addedBy, isPrivate = false) {
  this.notes.push({
    content: noteContent,
    addedBy: addedBy,
    isPrivate: isPrivate
  });
  return this.save();
};

module.exports = mongoose.model('Dispute', disputeSchema);
