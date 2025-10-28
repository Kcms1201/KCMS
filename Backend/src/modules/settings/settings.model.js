const mongoose = require('mongoose');

/**
 * System Settings Model
 * Stores global system configuration
 * Only one document should exist (singleton pattern)
 */
const SystemSettingsSchema = new mongoose.Schema(
  {
    // Recruitment Settings
    recruitment: {
      enabled: { type: Boolean, default: true },
      startDate: Date,
      endDate: Date,
      maxApplicationsPerStudent: { type: Number, default: 3, min: 1, max: 10 },
      allowCrossYearRecruitment: { type: Boolean, default: true },
      requireApprovalForMultipleClubs: { type: Boolean, default: false },
      autoApproveThreshold: { type: Number, default: 0 } // Auto-approve if applications < threshold
    },

    // Event & Budget Settings
    events: {
      maxEventsPerClubPerMonth: { type: Number, default: 5, min: 1 },
      budgetLimits: {
        technical: { type: Number, default: 10000, min: 0 },
        cultural: { type: Number, default: 8000, min: 0 },
        sports: { type: Number, default: 12000, min: 0 },
        social: { type: Number, default: 5000, min: 0 },
        academic: { type: Number, default: 7000, min: 0 },
        default: { type: Number, default: 5000, min: 0 }
      },
      requireCoordinatorApproval: { type: Boolean, default: true },
      autoPublishThreshold: { type: Number, default: 5000 }, // Auto-publish if budget <= threshold
      requireAdminApprovalThreshold: { type: Number, default: 5000 }, // Require admin approval if budget > threshold
      guestSpeakerApprovalRequired: { type: Boolean, default: true }
    },

    // File Upload Settings
    fileUploads: {
      maxFileSizes: {
        image: { type: Number, default: 26214400 }, // 25MB in bytes
        document: { type: Number, default: 10485760 }, // 10MB
        video: { type: Number, default: 104857600 } // 100MB
      },
      allowedFormats: {
        image: { type: [String], default: ['jpg', 'jpeg', 'png', 'webp', 'gif'] },
        document: { type: [String], default: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'] },
        video: { type: [String], default: ['mp4', 'mov', 'avi', 'mkv'] }
      },
      requireVirusScan: { type: Boolean, default: false }
    },

    // Notification Settings
    notifications: {
      email: {
        enabled: { type: Boolean, default: true },
        fromName: { type: String, default: 'KMIT Clubs' },
        fromEmail: { type: String, default: 'noreply@kmit.in' },
        replyTo: { type: String, default: 'support@kmit.in' }
      },
      sms: {
        enabled: { type: Boolean, default: false },
        provider: { type: String, default: 'twilio' }
      },
      types: {
        eventReminders: { type: Boolean, default: true },
        recruitmentOpening: { type: Boolean, default: true },
        roleAssignment: { type: Boolean, default: true },
        coordinatorOverride: { type: Boolean, default: true },
        budgetApproval: { type: Boolean, default: true },
        membershipApproval: { type: Boolean, default: true }
      },
      reminderTiming: {
        eventReminderDays: { type: Number, default: 1 }, // Days before event
        recruitmentClosingDays: { type: Number, default: 3 } // Days before recruitment closes
      }
    },

    // Security Settings
    security: {
      session: {
        timeout: { type: Number, default: 3600 }, // seconds
        extendOnActivity: { type: Boolean, default: true }
      },
      login: {
        maxAttempts: { type: Number, default: 5 },
        lockoutDuration: { type: Number, default: 900 } // 15 minutes in seconds
      },
      password: {
        minLength: { type: Number, default: 8, min: 6, max: 20 },
        requireUppercase: { type: Boolean, default: true },
        requireLowercase: { type: Boolean, default: true },
        requireNumbers: { type: Boolean, default: true },
        requireSpecialChar: { type: Boolean, default: false },
        preventReuse: { type: Number, default: 3 } // Prevent reusing last N passwords
      },
      twoFactorAuth: {
        enabled: { type: Boolean, default: false },
        enforceForAdmins: { type: Boolean, default: false }
      }
    },

    // Club Settings
    clubs: {
      maxMembersPerClub: { type: Number, default: 100, min: 10 },
      minMembersToCreate: { type: Number, default: 10, min: 5 },
      allowStudentClubCreation: { type: Boolean, default: false },
      requireCoordinatorAssignment: { type: Boolean, default: true },
      clubCategories: {
        type: [String],
        default: ['technical', 'cultural', 'sports', 'social', 'academic']
      }
    },

    // Academic Year Settings
    academicYear: {
      current: { type: String, default: '2024-2025' },
      startMonth: { type: Number, default: 8, min: 1, max: 12 }, // August
      endMonth: { type: Number, default: 5, min: 1, max: 12 } // May
    },

    // NAAC/NBA Settings
    accreditation: {
      institutionName: { type: String, default: 'Keshav Memorial Institute of Technology' },
      institutionCode: { type: String, default: 'KMIT' },
      naacGrade: { type: String, default: 'A+' },
      nbaAccredited: { type: Boolean, default: true },
      criteriaMapping: {
        type: Map,
        of: String,
        default: {
          'student_participation': '2.5.3',
          'co_curricular': '3.3.2',
          'student_development': '5.1.3'
        }
      }
    },

    // Last Updated Info
    lastUpdatedBy: { type: mongoose.Types.ObjectId, ref: 'User' },
    lastUpdatedAt: Date
  },
  { 
    timestamps: true,
    collection: 'system_settings' // Explicit collection name
  }
);

// Ensure only one settings document exists
SystemSettingsSchema.statics.getSingleton = async function() {
  let settings = await this.findOne();
  
  // Create default settings if none exist
  if (!settings) {
    settings = await this.create({});
  }
  
  return settings;
};

// Update singleton settings
SystemSettingsSchema.statics.updateSingleton = async function(updates, userId) {
  let settings = await this.getSingleton();
  
  // Deep merge updates
  Object.keys(updates).forEach(key => {
    if (typeof updates[key] === 'object' && !Array.isArray(updates[key])) {
      settings[key] = { ...settings[key], ...updates[key] };
    } else {
      settings[key] = updates[key];
    }
  });
  
  settings.lastUpdatedBy = userId;
  settings.lastUpdatedAt = new Date();
  
  await settings.save();
  return settings;
};

module.exports.SystemSettings = mongoose.model('SystemSettings', SystemSettingsSchema);
