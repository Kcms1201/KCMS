/**
 * Daily Recruitment Application Reminder
 * Workplan Line 222: Send daily reminder if recruitment has <100 applications
 */

const cron = require('node-cron');
const { Recruitment } = require('../modules/recruitment/recruitment.model');
const { Application } = require('../modules/recruitment/application.model');
const { Membership } = require('../modules/club/membership.model');
const notificationService = require('../modules/notification/notification.service');

/**
 * Check all open recruitments and send reminders for low application counts
 */
async function checkRecruitmentApplications() {
  try {
    console.log('📋 Checking recruitment application counts...');
    
    // Find all open recruitments
    const openRecruitments = await Recruitment.find({ 
      status: 'open' 
    }).populate('club', 'name');
    
    if (openRecruitments.length === 0) {
      console.log('No open recruitments found');
      return;
    }
    
    for (const recruitment of openRecruitments) {
      // Count applications for this recruitment
      const appCount = await Application.countDocuments({ 
        recruitment: recruitment._id 
      });
      
      // Workplan Line 222: Send reminder if <100 applications
      if (appCount < 100) {
        console.log(`⚠️  Low applications for ${recruitment.club.name}: ${appCount}/100`);
        
        // Get club core team members (those who can manage recruitment)
        const coreMembers = await Membership.find({
          club: recruitment.club._id,
          role: { 
            $in: ['president', 'vicePresident', 'core', 'secretary', 'treasurer', 'leadPR', 'leadTech'] 
          },
          status: 'approved'
        }).distinct('user');
        
        if (coreMembers.length === 0) {
          console.log(`No core members found for club ${recruitment.club.name}`);
          continue;
        }
        
        // Send notification to each core team member
        for (const userId of coreMembers) {
          await notificationService.create({
            user: userId,
            type: 'recruitment_closing',
            payload: {
              clubName: recruitment.club.name,
              recruitmentId: recruitment._id,
              recruitmentTitle: recruitment.title,
              applicationCount: appCount,
              message: `Only ${appCount} applications received. Consider promoting the recruitment to attract more applicants.`
            },
            priority: 'MEDIUM'
          });
        }
        
        console.log(`✅ Sent reminders to ${coreMembers.length} core members of ${recruitment.club.name}`);
      } else {
        console.log(`✅ ${recruitment.club.name} has sufficient applications: ${appCount}`);
      }
    }
    
    console.log('✅ Recruitment reminder check completed');
  } catch (error) {
    console.error('❌ Recruitment reminder error:', error);
  }
}

// Schedule daily at 6 PM (18:00)
// Cron format: minute hour day month weekday
// '0 18 * * *' = At 18:00 (6 PM) every day
const job = cron.schedule('0 18 * * *', checkRecruitmentApplications, {
  scheduled: true,
  timezone: "Asia/Kolkata" // IST timezone
});

console.log('📋 Recruitment Reminder Cron scheduled: Daily at 6 PM IST');

// Export for manual triggering if needed
module.exports = { 
  checkRecruitmentApplications,
  job
};
