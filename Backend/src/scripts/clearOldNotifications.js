// Script to clear old notifications that don't have proper title/message
const mongoose = require('mongoose');
const config = require('../../config');

const NotificationSchema = new mongoose.Schema({
  user: { type: mongoose.Types.ObjectId, ref: 'User' },
  type: String,
  title: String,
  message: String,
  payload: mongoose.Schema.Types.Mixed,
  priority: String,
  isRead: Boolean
}, { timestamps: true });

const Notification = mongoose.model('Notification', NotificationSchema);

async function clearOldNotifications() {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Delete notifications with generic title or empty message
    const result = await Notification.deleteMany({
      $or: [
        { title: 'Notification' },
        { title: { $exists: false } },
        { message: { $exists: false } },
        { message: '' }
      ]
    });

    console.log(`🗑️  Deleted ${result.deletedCount} old notifications`);
    console.log('✅ All new notifications will have proper titles and messages!');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

clearOldNotifications();
