const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema(
  {
    club:         { type: mongoose.Types.ObjectId, ref: 'Club', required: true },
    title:        { type: String, required: true, maxlength: 100 },
    description:  { type: String, maxlength: 1000 },
    objectives:   { type: String, maxlength: 500 },
    dateTime:     { type: Date, required: true },
    duration:     { type: Number, min: 0 }, // minutes
    venue:        { type: String, maxlength: 200 },
    capacity:     { type: Number, min: 0 },
    expectedAttendees: { type: Number, min: 0 },
    isPublic:     { type: Boolean, default: true },
    budget:       { type: Number, min: 0, default: 0 },
    guestSpeakers:[String],
    participatingClubs: [{ type: mongoose.Types.ObjectId, ref: 'Club' }], // Collaborating clubs for the event
    allowPerformerRegistrations: { type: Boolean, default: true }, // Allow students to register as performers
    requiresAudition: { type: Boolean, default: false }, // Whether event requires auditions for performers
    
    attachments: {
      proposalUrl:        String,
      budgetBreakdownUrl: String,
      venuePermissionUrl: String
    },
    qrCodeUrl: String,
    attendanceUrl: String,
    photos: [{ type: String }], // Event photo URLs (min 5 required for completion - Workplan Line 311)
    reportUrl: String, // Event report document URL
    billsUrls: [{ type: String }], // Bills/receipts URLs for budget settlement
    requiresAdminApproval: { type: Boolean, default: false },
    status: {
      type: String,
      enum: [
        'draft',
        'pending_coordinator',
        'pending_admin',
        'approved',
        'published',
        'ongoing',
        'pending_completion',  // ✅ NEW: 7-day grace period after event
        'completed',
        'incomplete',          // ✅ NEW: Failed to complete within 7 days
        'archived'
      ],
      default: 'draft'
    },
    reportSubmittedAt: Date,
    reportDueDate: Date,
    
    // ✅ NEW: Completion tracking fields
    completionDeadline: { type: Date }, // Event date + 7 days
    completionReminderSent: {
      day3: { type: Boolean, default: false },
      day5: { type: Boolean, default: false }
    },
    completionChecklist: {
      photosUploaded: { type: Boolean, default: false },
      reportUploaded: { type: Boolean, default: false },
      attendanceUploaded: { type: Boolean, default: false },
      billsUploaded: { type: Boolean, default: false }
    },
    completedAt: { type: Date },
    markedIncompleteAt: { type: Date },
    incompleteReason: { type: String },
    rejectionReason: String, // Reason for rejection
    rejectedBy: { type: mongoose.Types.ObjectId, ref: 'User' }, // Who rejected
    rejectedAt: Date, // When rejected
    coordinatorOverride: {
      overridden: { type: Boolean, default: false },
      type: String, // 'budget_rejection', 'budget_reduction', 'event_cancellation'
      reason: String,
      originalBudget: Number,
      adjustedBudget: Number,
      overriddenBy: { type: mongoose.Types.ObjectId, ref: 'User' },
      overriddenAt: Date
    }
  },
  { timestamps: true }
);

// Workplan Line 311: Enforce min 5 photos for completed events
EventSchema.pre('save', function(next) {
  // Check if status is being changed to 'completed'
  if (this.isModified('status') && this.status === 'completed') {
    // Validate minimum 5 photos uploaded
    if (!this.photos || this.photos.length < 5) {
      const err = new Error('Minimum 5 photos required to mark event as completed (Workplan requirement)');
      err.statusCode = 400;
      return next(err);
    }
    
    // Validate attendance sheet uploaded
    if (!this.attendanceUrl) {
      const err = new Error('Attendance sheet required to mark event as completed');
      err.statusCode = 400;
      return next(err);
    }
    
    // Validate event report submitted
    if (!this.reportUrl && !this.reportSubmittedAt) {
      const err = new Error('Event report required to mark event as completed');
      err.statusCode = 400;
      return next(err);
    }
    
    // If budget was allocated, bills must be uploaded
    if (this.budget > 0 && (!this.billsUrls || this.billsUrls.length === 0)) {
      const err = new Error('Bills/receipts required for events with allocated budget');
      err.statusCode = 400;
      return next(err);
    }
  }
  next();
});

module.exports.Event = mongoose.model('Event', EventSchema);