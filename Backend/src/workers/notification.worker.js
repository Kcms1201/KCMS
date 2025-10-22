const { Worker } = require('bullmq');
const appConfig = require('../config');
const config = { connection: { url: appConfig.REDIS_URL } };
const { Notification } = require('../modules/notification/notification.model');
const { sendMail, sendNotificationEmail } = require('../utils/mail');
const { User } = require('../modules/auth/user.model');
const { sendPushToUser, createPayloadFromNotification, isPushAvailable } = require('../utils/pushNotification');

const concurrency = appConfig.NOTIFICATION_WORKER_CONCURRENCY;
const BATCH_INTERVAL = appConfig.NOTIFICATION_BATCH_EVERY_MS || 4 * 60 * 60 * 1000; // 4 hours

function renderEmail(notif) {
  const subject = `[${notif.priority}] ${notif.type}`;
  const payload = typeof notif.payload === 'object' ? JSON.stringify(notif.payload, null, 2) : String(notif.payload);
  const html = `<pre>${payload}</pre>`;
  const text = payload;
  return { subject, html, text };
}

const worker = new Worker(
  'notification',
  async (job) => {
    if (job.name === 'flushBatch') {
      await processBatchedNotifications();
      return;
    }

    const { notifId } = job.data;
    const notif = await Notification.findById(notifId).populate('user', 'email').lean();
    if (!notif || !notif.user?.email) return;

    // Send browser push notification (if enabled and user has subscriptions)
    if (isPushAvailable()) {
      try {
        const pushPayload = createPayloadFromNotification(notif);
        await sendPushToUser(notif.user._id, pushPayload);
        console.log(`📱 Push notification sent for ${notif.type}`);
      } catch (pushError) {
        console.error('Push notification failed:', pushError.message);
        // Don't fail the job if push fails, continue with email
      }
    }

    if (notif.priority === 'URGENT' || notif.priority === 'HIGH') {
      // Send immediately for URGENT and HIGH priority (with unsubscribe for non-URGENT)
      const { subject, html, text } = renderEmail(notif);
      await sendNotificationEmail(notif.user, notif.type, notif.priority, { subject, html, text });
      await Notification.findByIdAndUpdate(notifId, { emailSent: true, emailSentAt: new Date() });
    } else {
      // Queue for batch processing (MEDIUM and LOW priority)
      await Notification.findByIdAndUpdate(notifId, { queuedForBatch: true });
    }
  },
  { ...config, concurrency }
);

/**
 * Process batched notifications (MEDIUM and LOW priority)
 */
async function processBatchedNotifications() {
  try {
    console.log('📬 Processing batched notifications...');
    
    // Find all queued notifications that haven't been emailed
    const queuedNotifications = await Notification.find({
      queuedForBatch: true,
      emailSent: { $ne: true },
      priority: { $in: ['MEDIUM', 'LOW'] }
    }).populate('user', 'email profile.name').lean();
    
    if (queuedNotifications.length === 0) {
      console.log('No batched notifications to process');
      return;
    }
    
    // Group notifications by user
    const userNotifications = {};
    for (const notif of queuedNotifications) {
      if (!notif.user?.email) continue;
      
      const email = notif.user.email;
      if (!userNotifications[email]) {
        userNotifications[email] = {
          user: notif.user,
          notifications: []
        };
      }
      userNotifications[email].notifications.push(notif);
    }
    
    // Send batched emails
    let successCount = 0;
    const { Unsubscribe } = require('../modules/notification/unsubscribe.model');
    
    for (const [email, data] of Object.entries(userNotifications)) {
      try {
        const { user, notifications } = data;
        
        // Get or create unsubscribe preferences
        const prefs = await Unsubscribe.getOrCreatePreferences(user._id, email);
        
        // Filter out notifications user has unsubscribed from
        const allowedNotifications = notifications.filter(n => !prefs.hasUnsubscribed(n.type));
        
        if (allowedNotifications.length === 0) {
          console.log(`User ${email} has unsubscribed from all batched notifications`);
          // Mark as sent even though we didn't send (user opted out)
          const notifIds = notifications.map(n => n._id);
          await Notification.updateMany(
            { _id: { $in: notifIds } },
            { emailSent: false, emailSkipped: true, emailSkippedReason: 'unsubscribed' }
          );
          continue;
        }
        
        // Build batch email content
        const subject = `KMIT Clubs Hub - ${allowedNotifications.length} New Notification${allowedNotifications.length > 1 ? 's' : ''}`;
        const html = buildBatchEmailHtml(user, allowedNotifications, prefs.unsubscribeToken);
        const text = buildBatchEmailText(user, allowedNotifications);
        
        await sendMail({ to: email, subject, html, text });
        
        // Mark notifications as sent
        const notifIds = allowedNotifications.map(n => n._id);
        await Notification.updateMany(
          { _id: { $in: notifIds } },
          { emailSent: true, emailSentAt: new Date() }
        );
        
        // Mark filtered notifications as skipped
        const skippedNotifs = notifications.filter(n => !allowedNotifications.includes(n));
        if (skippedNotifs.length > 0) {
          const skippedIds = skippedNotifs.map(n => n._id);
          await Notification.updateMany(
            { _id: { $in: skippedIds } },
            { emailSent: false, emailSkipped: true, emailSkippedReason: 'unsubscribed' }
          );
        }
        
        successCount += allowedNotifications.length;
      } catch (error) {
        console.error(`Failed to send batch email to ${email}:`, error.message);
      }
    }
    
    console.log(`✅ Sent ${successCount} batched notifications to ${Object.keys(userNotifications).length} users`);
  } catch (error) {
    console.error('Batch processing failed:', error);
  }
}

/**
 * Build HTML content for batch email
 * @param {Object} user - User object
 * @param {Array} notifications - Array of notifications
 * @param {string} unsubscribeToken - Unsubscribe token for the user
 */
function buildBatchEmailHtml(user, notifications, unsubscribeToken) {
  const notifItems = notifications.map(n => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">
        <strong style="color: ${getPriorityColor(n.priority)};">${n.type.replace(/_/g, ' ').toUpperCase()}</strong><br>
        <small style="color: #666;">${new Date(n.createdAt).toLocaleString()}</small><br>
        <p style="margin: 5px 0;">${JSON.stringify(n.payload)}</p>
      </td>
    </tr>
  `).join('');
  
  const unsubscribeUrl = `${appConfig.FRONTEND_URL}/unsubscribe/${unsubscribeToken}`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>KMIT Clubs Hub Notifications</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden;">
        <div style="background: #2563eb; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">KMIT Clubs Hub</h1>
        </div>
        <div style="padding: 20px;">
          <p>Hello ${user.profile?.name || 'User'},</p>
          <p>You have <strong>${notifications.length}</strong> new notification${notifications.length > 1 ? 's' : ''}:</p>
          <table style="width: 100%; border-collapse: collapse;">
            ${notifItems}
          </table>
          <p style="margin-top: 20px;">
            <a href="${appConfig.FRONTEND_URL}/notifications" 
               style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View All Notifications
            </a>
          </p>
        </div>
        <div style="background: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #666;">
          <p>KMIT Clubs Hub &copy; ${new Date().getFullYear()}</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e0e0e0;">
          <p style="margin-top: 15px;">
            You're receiving this email because you're a member of KMIT Clubs Hub.<br>
            <a href="${unsubscribeUrl}" style="color: #666; text-decoration: underline;">Manage email preferences</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Build text content for batch email
 */
function buildBatchEmailText(user, notifications) {
  const notifList = notifications.map((n, i) => 
    `${i + 1}. [${n.priority}] ${n.type.replace(/_/g, ' ').toUpperCase()}\n   ${new Date(n.createdAt).toLocaleString()}\n   ${JSON.stringify(n.payload)}\n`
  ).join('\n');
  
  return `
Hello ${user.profile?.name || 'User'},

You have ${notifications.length} new notification${notifications.length > 1 ? 's' : ''}:

${notifList}

Visit ${appConfig.FRONTEND_URL}/notifications to view all notifications.

---
KMIT Clubs Hub © ${new Date().getFullYear()}
  `;
}

/**
 * Get color for priority level
 */
function getPriorityColor(priority) {
  const colors = {
    URGENT: '#dc2626',
    HIGH: '#ea580c',
    MEDIUM: '#2563eb',
    LOW: '#64748b'
  };
  return colors[priority] || colors.MEDIUM;
}

worker.on('failed', (job, err) => {
  console.error('Notification worker failed', job?.id, job?.name, err?.message);
});

module.exports = { worker, processBatchedNotifications };
