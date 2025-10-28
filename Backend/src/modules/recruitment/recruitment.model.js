//src/modules/recruitment/recruitment.model.js
const mongoose = require('mongoose');

const RecruitmentSchema = new mongoose.Schema(
  {
    club: {
      type: mongoose.Types.ObjectId,
      ref: 'Club',
      required: true
    },
    title: {
      type: String,
      required: true,
      maxlength: 100
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000
    },
    eligibility: {
      type: String,
      maxlength: 500
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    positions: {
      type: Number,
      min: 1,
      max: 100
    },
    customQuestions: {
      type: [String],
      validate: [arr => arr.length <= 5, 'Max 5 questions']
    },
    status: {
      type: String,
      enum: [
        'draft',
        'scheduled',
        'open',
        'closing_soon',
        'closed',
        'selection_done'
      ],
      default: 'draft'
    }
  },
  { timestamps: true }
);

// Validate max 14 days duration (workplan requirement: Line 210)
RecruitmentSchema.pre('save', function(next) {
  if (this.startDate && this.endDate) {
    const durationMs = this.endDate.getTime() - this.startDate.getTime();
    const durationDays = durationMs / (1000 * 60 * 60 * 24);
    
    if (durationDays > 14) {
      const err = new Error('Recruitment duration cannot exceed 14 days');
      err.statusCode = 400;
      return next(err);
    }
    
    if (durationDays < 0) {
      const err = new Error('End date must be after start date');
      err.statusCode = 400;
      return next(err);
    }
  }
  next();
});

// Workplan Line 595: Database indexes for performance
RecruitmentSchema.index({ status: 1 });
RecruitmentSchema.index({ endDate: 1 });
RecruitmentSchema.index({ club: 1, status: 1 });

module.exports.Recruitment = mongoose.model(
  'Recruitment',
  RecruitmentSchema
);