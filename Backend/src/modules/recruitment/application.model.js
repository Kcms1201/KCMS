//src/modules/recruitment/application.model.js
const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema(
  {
    recruitment: {
      type: mongoose.Types.ObjectId,
      ref: 'Recruitment',
      required: true
    },
    user: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
      required: true
    },
    answers: {
      type: [
        {
          question: String,
          answer: String
        }
      ],
      required: true
    },
    status: {
      type: String,
      enum: ['submitted', 'under_review', 'selected', 'rejected'],
      default: 'submitted'
    },
    score: {
      type: Number,
      min: 0
    }
  },
  { timestamps: { createdAt: 'appliedAt', updatedAt: true } }
);

// Workplan Line 242: One application per club per cycle
// Unique compound index to prevent multiple applications to same recruitment
ApplicationSchema.index({ user: 1, recruitment: 1 }, { unique: true });

// Pre-save validation for one application per recruitment
ApplicationSchema.pre('save', async function(next) {
  if (!this.isNew) return next();
  
  const existing = await this.constructor.findOne({
    user: this.user,
    recruitment: this.recruitment,
    _id: { $ne: this._id }
  });
  
  if (existing) {
    const err = new Error('You have already applied to this recruitment. Only one application per club per cycle is allowed.');
    err.statusCode = 400;
    return next(err);
  }
  
  next();
});

module.exports.Application = mongoose.model(
  'Application',
  ApplicationSchema
);