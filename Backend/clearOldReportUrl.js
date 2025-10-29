/**
 * Quick script to clear old reportUrl (local path) from an event
 * This allows re-uploading with the new Cloudinary URL
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function clearOldReportUrl() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const Event = mongoose.model('Event', new mongoose.Schema({}, { strict: false }));

    // Find the event
    const eventId = '69004f5f37f21f3ca79b9518';
    const event = await Event.findById(eventId);

    if (!event) {
      console.error('❌ Event not found');
      process.exit(1);
    }

    console.log('📋 Current event data:');
    console.log('  Status:', event.status);
    console.log('  Report URL:', event.reportUrl);
    console.log('  Report uploaded:', event.completionChecklist?.reportUploaded);

    // Clear the old report URL and mark as not uploaded
    event.reportUrl = null;
    event.completionChecklist.reportUploaded = false;
    
    // Change status back to pending_completion (optional)
    if (event.status === 'completed') {
      event.status = 'pending_completion';
      console.log('📝 Status changed: completed → pending_completion');
    }

    await event.save();

    console.log('✅ Successfully cleared old report URL!');
    console.log('📋 Updated event data:');
    console.log('  Status:', event.status);
    console.log('  Report URL:', event.reportUrl);
    console.log('  Report uploaded:', event.completionChecklist?.reportUploaded);
    console.log('\n🎉 You can now re-upload the report with Cloudinary URL!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

clearOldReportUrl();
