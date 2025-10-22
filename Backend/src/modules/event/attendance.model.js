const mongoose = require('mongoose');

/**
 * Attendance Model
 * 
 * PURPOSE: Track attendance of CLUB MEMBERS (organizers/volunteers) at events
 * NOT FOR: Student registrations (audience/performers) - those are tracked in EventRegistration
 * 
 * This is used for club member analytics to track:
 * - Which members are actively participating in club events
 * - Member engagement levels
 * - Attendance patterns for performance reviews
 */
const AttendanceSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Types.ObjectId, ref: 'Event', required: true },
    user:  { type: mongoose.Types.ObjectId, ref: 'User', required: true },
    status:{ type: String, enum: ['rsvp','present','absent'], required: true },
    type: { 
      type: String, 
      enum: ['organizer', 'volunteer'],  // Only club members!
      default: 'organizer' 
    },
    club: { type: mongoose.Types.ObjectId, ref: 'Club', required: true }, // Which club the member represents
    checkInTime: Date,
    checkOutTime: Date,
    timestamp: { type: Date, default: Date.now }
  },
  { timestamps: false }
);

// Compound index: One attendance record per user per event
AttendanceSchema.index({ event: 1, user: 1 }, { unique: true });

module.exports.Attendance = mongoose.model('Attendance', AttendanceSchema);