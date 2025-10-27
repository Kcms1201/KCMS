const mongoose = require('mongoose');

const ClubSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, minlength: 3, maxlength: 50 },
    category: {
      type: String,
      required: true,
      enum: ['technical','cultural','sports','arts','social']
    },
    description: { type: String, minlength: 50, maxlength: 500 },
    vision: { type: String, maxlength: 500 },
    mission: { type: String, maxlength: 500 },
    logoUrl: String,
    bannerUrl: String,
    socialLinks: {
      facebook: String,
      twitter: String,
      instagram: String
    },
    coordinator: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['draft','pending_approval','active','pending_archive','archived'],
      default: 'draft'
    },
    pendingSettings: mongoose.Schema.Types.Mixed, // holds protected field changes
    archiveRequest: {
      requestedBy: { type: mongoose.Types.ObjectId, ref: 'User' },
      requestedAt: Date,
      reason: String
    }
  },
  { timestamps: true }
);

// Workplan Line 593: Database indexes for performance
ClubSchema.index({ name: 1 });
ClubSchema.index({ category: 1 });
ClubSchema.index({ status: 1 });

module.exports.Club = mongoose.model('Club', ClubSchema);