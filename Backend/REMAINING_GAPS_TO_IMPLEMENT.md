# Remaining Gaps Implementation Guide

## ✅ COMPLETED (5 High Priority Gaps)

1. **✅ PasswordReset Model Field Mismatch** - Fixed `otpHash` → `otp`
2. **✅ OTP Resend Rate Limiting** - Enforces max 3 resends per hour  
3. **✅ One Application Per Recruitment** - Added unique index + validation
4. **✅ Database Indexes** - Added all missing indexes (users, clubs, events, recruitments, notifications)
5. **✅ Session Progress Saving** - Added `/api/auth/resend-otp` endpoint with Redis storage

---

## 🔧 REMAINING (4 Medium Priority Gaps)

### GAP 6: Club Auto-Activation (Workplan Line 161)

**File:** `src/modules/club/club.model.js` Line 25

**Current Issue:** Clubs default to 'draft' status after creation

**Fix Option 1 - Change Default:**
```javascript
status: {
  type: String,
  enum: ['draft','pending_approval','active','pending_archive','archived'],
  default: 'active' // ✅ CHANGE FROM 'draft' to 'active'
},
```

**Fix Option 2 - Auto-activate in Service:**
```javascript
// In src/modules/club/club.service.js - createClub function
const club = new Club({
  ...clubData,
  status: 'active' // Explicitly set to active (Workplan Line 161)
});
```

**Recommendation:** Use Option 2 to maintain explicit control

---

### GAP 7: Daily Recruitment Reminder (Workplan Line 222)

**Create New File:** `src/jobs/recruitmentReminder.js`

```javascript
const cron = require('node-cron');
const { Recruitment } = require('../modules/recruitment/recruitment.model');
const { Application } = require('../modules/recruitment/application.model');
const { Membership } = require('../modules/club/membership.model');
const notificationService = require('../modules/notification/notification.service');

/**
 * Workplan Line 222: Daily reminder if <100 applications
 * Runs daily at 6 PM
 */
async function checkRecruitmentApplications() {
  try {
    console.log('📋 Checking recruitment application counts...');
    
    const openRecruitments = await Recruitment.find({ 
      status: 'open' 
    }).populate('club', 'name');
    
    for (const recruitment of openRecruitments) {
      const appCount = await Application.countDocuments({ 
        recruitment: recruitment._id 
      });
      
      if (appCount < 100) {
        console.log(`⚠️  Low applications for ${recruitment.club.name}: ${appCount}/100`);
        
        // Get club core team members
        const coreMembers = await Membership.find({
          club: recruitment.club._id,
          role: { $in: ['president', 'vicePresident', 'core', 'secretary', 'treasurer', 'leadPR', 'leadTech'] },
          status: 'approved'
        }).distinct('user');
        
        // Send notification to core team
        for (const userId of coreMembers) {
          await notificationService.create({
            user: userId,
            type: 'recruitment_closing',
            payload: {
              clubName: recruitment.club.name,
              recruitmentTitle: recruitment.title,
              applicationCount: appCount,
              message: `Only ${appCount} applications received. Consider promoting the recruitment.`
            },
            priority: 'MEDIUM'
          });
        }
      }
    }
    
    console.log('✅ Recruitment reminder check completed');
  } catch (error) {
    console.error('❌ Recruitment reminder error:', error);
  }
}

// Schedule daily at 6 PM (18:00)
cron.schedule('0 18 * * *', checkRecruitmentApplications);

module.exports = { checkRecruitmentApplications };
```

**Then Import in:** `src/server.js`

```javascript
// Add after line 79 in server.js
if (config.START_SCHEDULERS) {
  try {
    require('./jobs/recruitmentReminder'); // ✅ ADD THIS LINE
    console.log('📋 Recruitment Reminder Cron: Running daily at 6 PM');
  } catch (e) {
    console.error('Failed to start recruitment reminder:', e);
  }
}
```

---

### GAP 8: System Settings Configurable (Workplan Line 558-565)

**File:** `src/modules/settings/settings.controller.js`

**Add Update Endpoint:**

```javascript
/**
 * Workplan Line 558-565: Make system settings configurable
 * Update specific system settings
 */
exports.updateSettings = async (req, res, next) => {
  try {
    const { category, updates } = req.body;
    
    // Validate category
    const validCategories = [
      'recruitment_windows',
      'budget_limits',
      'file_size_limits',
      'session_timeout',
      'notification_rules'
    ];
    
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Must be one of: ${validCategories.join(', ')}`
      });
    }
    
    // Find or create settings document
    let settings = await Settings.findOne({ key: 'system_config' });
    if (!settings) {
      settings = new Settings({ key: 'system_config', value: {} });
    }
    
    // Update the specific category
    settings.value[category] = {
      ...settings.value[category],
      ...updates
    };
    
    settings.updatedBy = req.user.id;
    await settings.save();
    
    // Audit log
    await require('../audit/audit.service').log({
      user: req.user.id,
      action: 'SYSTEM_SETTINGS_UPDATE',
      target: `Settings:${category}`,
      oldValue: settings.value[category],
      newValue: updates,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: settings.value[category]
    });
  } catch (err) {
    next(err);
  }
};
```

**Add Route in:** `src/modules/settings/settings.routes.js`

```javascript
const { requireAdmin } = require('../../middlewares/permission');

router.put('/system',
  authMw,
  requireAdmin(),
  settingsCtrl.updateSettings
);
```

---

### GAP 9: CSV Export Format (Workplan Line 474)

**File:** `src/modules/reports/report.service.js`

**Add Method:**

```javascript
/**
 * Workplan Line 474: CSV export format
 * Generate CSV from data array
 */
async generateCSV(data, filename) {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }
  
  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV rows
  const csvRows = [];
  
  // Add header row
  csvRows.push(headers.join(','));
  
  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      
      // Handle different data types
      if (value === null || value === undefined) {
        return '';
      }
      
      // Escape quotes and wrap in quotes if contains comma/quote/newline
      const escaped = String(value).replace(/"/g, '""');
      return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')
        ? `"${escaped}"`
        : escaped;
    });
    
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

/**
 * Export report as CSV
 */
async exportReportAsCSV(reportType, params) {
  let data;
  
  switch (reportType) {
    case 'club_activity':
      data = await this.getClubActivityData(params);
      break;
    case 'annual':
      data = await this.getAnnualReportData(params);
      break;
    case 'audit':
      data = await this.listAudit(params).then(r => r.items);
      break;
    default:
      throw new Error('Invalid report type');
  }
  
  return this.generateCSV(data, `${reportType}_${Date.now()}.csv`);
}
```

**Add Controller Method in:** `src/modules/reports/report.controller.js`

```javascript
exports.exportCSV = async (req, res, next) => {
  try {
    const { type, ...params } = req.query;
    const csv = await reportService.exportReportAsCSV(type, params);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${type}_report.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
};
```

**Add Route:**

```javascript
router.get('/export/csv',
  authMw,
  requireEither(['coordinator', 'admin'], []),
  reportCtrl.exportCSV
);
```

---

## 📋 Summary

### ✅ Completed (5/9):
1. PasswordReset model fix
2. OTP resend rate limiting  
3. One application per recruitment
4. Database indexes
5. Session progress saving with resend OTP

### 🔧 Remaining (4/9):
6. Club auto-activation (Simple - 1 line change)
7. Daily recruitment reminder (Add cron job file)
8. System settings API (Add update endpoint)
9. CSV export (Add export method)

---

## Next Steps

**Would you like me to:**
1. Implement the remaining 4 gaps now? (I can do them all in one go)
2. Focus on testing the 5 completed fixes first?
3. Provide more details on any specific gap?

All remaining gaps are straightforward and won't break existing functionality.
