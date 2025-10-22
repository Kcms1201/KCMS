// src/modules/event/eventRegistration.model.js
const mongoose = require('mongoose');

/**
 * EventRegistration Model
 * Simplified system: Students register for events as performers or audience
 * Club presidents review and approve/reject performer registrations
 */
const EventRegistrationSchema = new mongoose.Schema(
  {
    event: { 
      type: mongoose.Types.ObjectId, 
      ref: 'Event', 
      required: true,
      index: true 
    },
    user: { 
      type: mongoose.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true 
    },
    registrationType: {
      type: String,
      enum: ['performer', 'audience'],
      required: true,
      default: 'audience'
    },
    representingClub: { 
      type: mongoose.Types.ObjectId, 
      ref: 'Club',
      // Which club the student is representing/performing for
      // Required for performer registrations
    },
    performanceType: String, // e.g., "Dance", "Singing", "Drama"
    performanceDescription: String, // What they want to perform
    
    // Audition workflow
    auditionStatus: {
      type: String,
      enum: ['not_required', 'pending_audition', 'audition_passed', 'audition_failed'],
      default: 'not_required'
    },
    auditionDate: Date,
    auditionNotes: String, // Feedback from audition
    
    // Final approval status
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'waitlisted'],
      default: 'pending'
    },
    approvedBy: {
      type: mongoose.Types.ObjectId,
      ref: 'User' // Club president who approved/rejected
    },
    approvedAt: Date,
    rejectionReason: String,
    notes: String, // Student's notes
  },
  { timestamps: true }
);

// Compound index: One registration per user per event per club
// Allows student to register for same event but different clubs (e.g., Dance for Club A, Singing for Club B)
EventRegistrationSchema.index({ event: 1, user: 1, representingClub: 1 }, { unique: true });

// Index for queries
EventRegistrationSchema.index({ status: 1 });
EventRegistrationSchema.index({ representingClub: 1, status: 1 });
EventRegistrationSchema.index({ registrationType: 1 });

module.exports.EventRegistration = mongoose.model('EventRegistration', EventRegistrationSchema);
