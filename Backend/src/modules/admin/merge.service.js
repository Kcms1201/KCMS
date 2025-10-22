/**
 * Account Merge Service
 * Handles merging duplicate user accounts
 * Workplan Line 553: Admin can merge duplicate accounts
 */

const mongoose = require('mongoose');
const { User } = require('../auth/user.model');
const { Membership } = require('../club/membership.model');
const { Notification } = require('../notification/notification.model');
const { Application } = require('../recruitment/application.model');
const { Session } = require('../auth/session.model');
const { PushSubscription } = require('../notification/pushSubscription.model');
const { Unsubscribe } = require('../notification/unsubscribe.model');
const { EventRegistration } = require('../event/eventRegistration.model');
const { Document } = require('../document/document.model');
const auditService = require('../audit/audit.service');

/**
 * Preview what will be merged (dry run)
 */
exports.previewMerge = async (sourceUserId, targetUserId) => {
  const [sourceUser, targetUser] = await Promise.all([
    User.findById(sourceUserId),
    User.findById(targetUserId)
  ]);
  
  if (!sourceUser) {
    const err = new Error('Source user not found');
    err.statusCode = 404;
    throw err;
  }
  
  if (!targetUser) {
    const err = new Error('Target user not found');
    err.statusCode = 404;
    throw err;
  }
  
  if (sourceUserId === targetUserId) {
    const err = new Error('Cannot merge user with themselves');
    err.statusCode = 400;
    throw err;
  }
  
  // Count data to be transferred
  const [
    memberships,
    notifications,
    applications,
    sessions,
    pushSubscriptions,
    eventRegistrations,
    documents
  ] = await Promise.all([
    Membership.countDocuments({ user: sourceUserId }),
    Notification.countDocuments({ user: sourceUserId }),
    Application.countDocuments({ user: sourceUserId }),
    Session.countDocuments({ user: sourceUserId }),
    PushSubscription.countDocuments({ user: sourceUserId }),
    EventRegistration.countDocuments({ user: sourceUserId }),
    Document.countDocuments({ uploadedBy: sourceUserId })
  ]);
  
  return {
    sourceUser: {
      id: sourceUser._id,
      rollNumber: sourceUser.rollNumber,
      email: sourceUser.email,
      name: sourceUser.profile.name,
      status: sourceUser.status
    },
    targetUser: {
      id: targetUser._id,
      rollNumber: targetUser.rollNumber,
      email: targetUser.email,
      name: targetUser.profile.name,
      status: targetUser.status
    },
    dataToTransfer: {
      memberships,
      notifications,
      applications,
      sessions,
      pushSubscriptions,
      eventRegistrations,
      documents
    },
    warnings: generateWarnings(sourceUser, targetUser, {
      memberships,
      applications
    })
  };
};

/**
 * Merge two user accounts
 */
exports.mergeAccounts = async (sourceUserId, targetUserId, adminUserId, reason) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const [sourceUser, targetUser] = await Promise.all([
      User.findById(sourceUserId).session(session),
      User.findById(targetUserId).session(session)
    ]);
    
    if (!sourceUser || !targetUser) {
      throw new Error('User not found');
    }
    
    if (sourceUserId === targetUserId) {
      throw new Error('Cannot merge user with themselves');
    }
    
    if (sourceUser.status === 'merged') {
      throw new Error('Source user has already been merged');
    }
    
    // Transfer all data
    const transferResults = await transferUserData(sourceUserId, targetUserId, session);
    
    // Mark source user as merged
    sourceUser.status = 'merged';
    sourceUser.mergedInto = targetUserId;
    sourceUser.mergedAt = new Date();
    sourceUser.mergedBy = adminUserId;
    sourceUser.mergeReason = reason || 'Duplicate account';
    await sourceUser.save({ session });
    
    // Log the merge
    await auditService.log({
      user: adminUserId,
      action: 'ACCOUNTS_MERGED',
      target: `User:${sourceUserId}`,
      oldValue: {
        sourceUser: {
          rollNumber: sourceUser.rollNumber,
          email: sourceUser.email
        }
      },
      newValue: {
        targetUser: {
          rollNumber: targetUser.rollNumber,
          email: targetUser.email
        },
        transferResults,
        reason
      },
      ip: 'admin',
      userAgent: 'merge-service'
    });
    
    await session.commitTransaction();
    
    return {
      success: true,
      message: 'Accounts merged successfully',
      sourceUser: {
        id: sourceUser._id,
        rollNumber: sourceUser.rollNumber,
        email: sourceUser.email
      },
      targetUser: {
        id: targetUser._id,
        rollNumber: targetUser.rollNumber,
        email: targetUser.email
      },
      transferResults
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Transfer all user data from source to target
 */
async function transferUserData(sourceUserId, targetUserId, session) {
  const results = {};
  
  // 1. Transfer memberships (avoid duplicates)
  const sourceMemberships = await Membership.find({ user: sourceUserId }).session(session);
  results.memberships = { transferred: 0, skipped: 0 };
  
  for (const membership of sourceMemberships) {
    // Check if target already has membership in this club
    const existingMembership = await Membership.findOne({
      user: targetUserId,
      club: membership.club
    }).session(session);
    
    if (existingMembership) {
      // Keep the higher role
      if (getRolePriority(membership.role) > getRolePriority(existingMembership.role)) {
        existingMembership.role = membership.role;
        existingMembership.position = membership.position;
        await existingMembership.save({ session });
      }
      // Delete source membership
      await Membership.deleteOne({ _id: membership._id }).session(session);
      results.memberships.skipped++;
    } else {
      // Transfer membership
      membership.user = targetUserId;
      await membership.save({ session });
      results.memberships.transferred++;
    }
  }
  
  // 2. Transfer applications (avoid duplicates)
  const sourceApplications = await Application.find({ user: sourceUserId }).session(session);
  results.applications = { transferred: 0, skipped: 0 };
  
  for (const application of sourceApplications) {
    const existingApplication = await Application.findOne({
      user: targetUserId,
      recruitment: application.recruitment
    }).session(session);
    
    if (existingApplication) {
      // Keep the more recent or higher status application
      if (application.updatedAt > existingApplication.updatedAt || 
          getApplicationStatusPriority(application.status) > getApplicationStatusPriority(existingApplication.status)) {
        await Application.deleteOne({ _id: existingApplication._id }).session(session);
        application.user = targetUserId;
        await application.save({ session });
        results.applications.transferred++;
      } else {
        await Application.deleteOne({ _id: application._id }).session(session);
        results.applications.skipped++;
      }
    } else {
      application.user = targetUserId;
      await application.save({ session });
      results.applications.transferred++;
    }
  }
  
  // 3. Transfer notifications
  const notificationUpdate = await Notification.updateMany(
    { user: sourceUserId },
    { user: targetUserId }
  ).session(session);
  results.notifications = notificationUpdate.modifiedCount;
  
  // 4. Transfer event registrations (avoid duplicates)
  const sourceRegistrations = await EventRegistration.find({ user: sourceUserId }).session(session);
  results.eventRegistrations = { transferred: 0, skipped: 0 };
  
  for (const registration of sourceRegistrations) {
    const existingRegistration = await EventRegistration.findOne({
      user: targetUserId,
      event: registration.event
    }).session(session);
    
    if (existingRegistration) {
      await EventRegistration.deleteOne({ _id: registration._id }).session(session);
      results.eventRegistrations.skipped++;
    } else {
      registration.user = targetUserId;
      await registration.save({ session });
      results.eventRegistrations.transferred++;
    }
  }
  
  // 5. Transfer documents (uploadedBy)
  const documentUpdate = await Document.updateMany(
    { uploadedBy: sourceUserId },
    { uploadedBy: targetUserId }
  ).session(session);
  results.documents = documentUpdate.modifiedCount;
  
  // 6. Invalidate all sessions (force re-login)
  const sessionUpdate = await Session.updateMany(
    { user: sourceUserId },
    { revokedAt: new Date() }
  ).session(session);
  results.sessions = { revoked: sessionUpdate.modifiedCount };
  
  // 7. Transfer push subscriptions
  const pushUpdate = await PushSubscription.updateMany(
    { user: sourceUserId },
    { user: targetUserId }
  ).session(session);
  results.pushSubscriptions = pushUpdate.modifiedCount;
  
  // 8. Merge unsubscribe preferences
  const sourceUnsubscribe = await Unsubscribe.findOne({ user: sourceUserId }).session(session);
  if (sourceUnsubscribe) {
    const targetUnsubscribe = await Unsubscribe.findOne({ user: targetUserId }).session(session);
    
    if (targetUnsubscribe) {
      // Merge preferences (keep target's preferences, but mark if source had unsubscribed)
      Object.keys(sourceUnsubscribe.preferences).forEach(key => {
        if (sourceUnsubscribe.preferences[key] === false) {
          targetUnsubscribe.preferences[key] = false;
        }
      });
      if (sourceUnsubscribe.unsubscribedAll) {
        targetUnsubscribe.unsubscribedAll = true;
      }
      await targetUnsubscribe.save({ session });
      await Unsubscribe.deleteOne({ _id: sourceUnsubscribe._id }).session(session);
      results.unsubscribePreferences = 'merged';
    } else {
      sourceUnsubscribe.user = targetUserId;
      await sourceUnsubscribe.save({ session });
      results.unsubscribePreferences = 'transferred';
    }
  } else {
    results.unsubscribePreferences = 'none';
  }
  
  return results;
}

/**
 * Get role priority for comparison
 */
function getRolePriority(role) {
  const priorities = {
    'president': 5,
    'vicePresident': 4,
    'secretary': 3,
    'treasurer': 3,
    'leadPR': 2,
    'leadTech': 2,
    'core': 2,
    'member': 1
  };
  return priorities[role] || 0;
}

/**
 * Get application status priority
 */
function getApplicationStatusPriority(status) {
  const priorities = {
    'selected': 4,
    'waitlisted': 3,
    'under_review': 2,
    'submitted': 1,
    'rejected': 0
  };
  return priorities[status] || 0;
}

/**
 * Generate warnings about merge
 */
function generateWarnings(sourceUser, targetUser, data) {
  const warnings = [];
  
  if (sourceUser.rollNumber !== targetUser.rollNumber) {
    warnings.push('Users have different roll numbers');
  }
  
  if (sourceUser.email !== targetUser.email) {
    warnings.push('Users have different email addresses');
  }
  
  if (sourceUser.profile.name !== targetUser.profile.name) {
    warnings.push('Users have different names');
  }
  
  if (data.memberships > 0) {
    warnings.push(`${data.memberships} membership(s) will be transferred or merged`);
  }
  
  if (data.applications > 0) {
    warnings.push(`${data.applications} application(s) will be transferred or merged`);
  }
  
  if (sourceUser.roles.global !== 'student') {
    warnings.push(`Source user has elevated role: ${sourceUser.roles.global}`);
  }
  
  return warnings;
}

module.exports = exports;
