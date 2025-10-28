// Script to create missing attendance records for existing events
const mongoose = require('mongoose');
const config = require('../../config');

// Define schemas
const EventSchema = new mongoose.Schema({
  club: { type: mongoose.Types.ObjectId, ref: 'Club' },
  participatingClubs: [{ type: mongoose.Types.ObjectId, ref: 'Club' }],
  title: String,
  status: String
}, { timestamps: true });

const MembershipSchema = new mongoose.Schema({
  club: { type: mongoose.Types.ObjectId, ref: 'Club' },
  user: { type: mongoose.Types.ObjectId, ref: 'User' },
  status: String,
  role: String
}, { timestamps: true });

const AttendanceSchema = new mongoose.Schema({
  event: { type: mongoose.Types.ObjectId, ref: 'Event' },
  user: { type: mongoose.Types.ObjectId, ref: 'User' },
  club: { type: mongoose.Types.ObjectId, ref: 'Club' },
  status: String,
  type: String
}, { timestamps: true });

AttendanceSchema.index({ event: 1, user: 1 }, { unique: true });

const Event = mongoose.model('Event', EventSchema);
const Membership = mongoose.model('Membership', MembershipSchema);
const Attendance = mongoose.model('Attendance', AttendanceSchema);

async function fixMissingAttendance() {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all events
    const events = await Event.find({}).lean();
    console.log(`📊 Found ${events.length} events`);

    let fixedCount = 0;
    let skippedCount = 0;

    for (const event of events) {
      console.log(`\n🔍 Checking event: "${event.title}" (${event._id})`);
      
      // Check if attendance records exist
      const existingCount = await Attendance.countDocuments({ event: event._id });
      
      if (existingCount > 0) {
        console.log(`  ✓ Already has ${existingCount} attendance records - skipping`);
        skippedCount++;
        continue;
      }

      console.log(`  ⚠️  No attendance records found - creating...`);

      // Get all club IDs involved
      const allClubIds = [event.club, ...(event.participatingClubs || [])];
      console.log(`  📋 Clubs involved: ${allClubIds.length}`);
      console.log(`     - Primary club (creator): ${event.club}`);
      if (event.participatingClubs && event.participatingClubs.length > 0) {
        console.log(`     - Participating clubs: ${event.participatingClubs.length}`);
      }

      // Get all approved members from all involved clubs
      const clubMembers = await Membership.find({
        club: { $in: allClubIds },
        status: 'approved'
      }).lean();

      console.log(`  👥 Found ${clubMembers.length} club members TOTAL`);

      if (clubMembers.length === 0) {
        console.log(`  ⚠️  No members found for this event - skipping`);
        continue;
      }

      // Create attendance records
      const attendanceRecords = clubMembers.map(member => ({
        event: event._id,
        user: member.user,
        club: member.club,
        status: 'absent', // Default status
        type: 'organizer'
      }));

      try {
        await Attendance.insertMany(attendanceRecords, { ordered: false });
        console.log(`  ✅ Created ${attendanceRecords.length} attendance records`);
        fixedCount++;
      } catch (err) {
        if (err.code === 11000) {
          console.log(`  ⚠️  Some records already existed - created remaining`);
          fixedCount++;
        } else {
          console.error(`  ❌ Error creating attendance:`, err.message);
        }
      }
    }

    console.log(`\n\n📊 Summary:`);
    console.log(`  ✅ Fixed: ${fixedCount} events`);
    console.log(`  ✓ Skipped (already OK): ${skippedCount} events`);
    console.log(`  📝 Total events: ${events.length}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixMissingAttendance();
