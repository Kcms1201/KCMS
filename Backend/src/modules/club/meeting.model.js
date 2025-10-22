const mongoose = require('mongoose');

/**
 * Meeting Model
 * Simple scheduler for club internal meetings
 * No RSVP, no complex workflows - just schedule and track attendance
 */
const meetingSchema = new mongoose.Schema({
  club: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Club',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  agenda: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true  // e.g., "3:00 PM"
  },
  duration: {
    type: Number,
    default: 60,  // minutes
    min: 15,
    max: 480  // max 8 hours
  },
  venue: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  type: {
    type: String,
    enum: ['in-person', 'online'],
    default: 'in-person'
  },
  meetingLink: {
    type: String,  // For online meetings (Zoom/Teams/GMeet link)
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled'],
    default: 'scheduled',
    index: true
  },
  
  // Simple attendance tracking
  attendees: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['present', 'absent'],
      default: 'absent'
    },
    markedAt: Date,
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  notes: {
    type: String,  // Meeting minutes/notes
    maxlength: 5000
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
meetingSchema.index({ club: 1, date: -1 });
meetingSchema.index({ club: 1, status: 1 });
meetingSchema.index({ createdBy: 1 });

// Virtual for checking if meeting is upcoming
meetingSchema.virtual('isUpcoming').get(function() {
  return this.date > new Date() && this.status === 'scheduled';
});

// Virtual for checking if meeting is past
meetingSchema.virtual('isPast').get(function() {
  return this.date < new Date();
});

module.exports = mongoose.model('Meeting', meetingSchema);
