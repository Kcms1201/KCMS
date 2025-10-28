// Diagnostic script to check attendance data
const mongoose = require('mongoose');
const config = require('../../config');

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

const ClubSchema = new mongoose.Schema({
  name: String
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
  email: String,
  rollNumber: String,
  profile: {
    name: String
  }
}, { timestamps: true });

const Event = mongoose.model('Event', EventSchema);
const Membership = mongoose.model('Membership', MembershipSchema);
const Attendance = mongoose.model('Attendance', AttendanceSchema);
const Club = mongoose.model('Club', ClubSchema);
const User = mongoose.model('User', UserSchema);

async function diagnose() {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get the ABCD event
    const events = await Event.find({ title: /ABCD/i }).lean();
    
    if (events.length === 0) {
      console.log('❌ No event found with title matching "ABCD"');
      console.log('\n📋 All events in database:');
      const allEvents = await Event.find({}).select('title status club').lean();
      allEvents.forEach(e => {
        console.log(`  - ${e.title} (${e.status}) - Club: ${e.club}`);
      });
      process.exit(0);
    }

    const event = events[0];
    console.log('🎯 EVENT FOUND:');
    console.log(`  Title: ${event.title}`);
    console.log(`  ID: ${event._id}`);
    console.log(`  Status: ${event.status}`);
    console.log(`  Club (creator): ${event.club}`);
    console.log(`  Participating clubs: ${event.participatingClubs?.length || 0}`);
    
    // Get club details
    const clubData = await Club.findById(event.club).lean();
    console.log(`\n📚 CREATOR CLUB:`);
    if (clubData) {
      console.log(`  Name: ${clubData.name}`);
      console.log(`  ID: ${clubData._id}`);
    } else {
      console.log(`  ❌ Club not found! ID: ${event.club}`);
    }

    // Check memberships
    console.log(`\n👥 MEMBERSHIPS:`);
    const allClubIds = [event.club, ...(event.participatingClubs || [])];
    console.log(`  Looking for members in clubs: ${allClubIds.map(id => id.toString()).join(', ')}`);
    
    const memberships = await Membership.find({
      club: { $in: allClubIds },
      status: 'approved'
    }).populate('user', 'profile.name email rollNumber').populate('club', 'name').lean();
    
    console.log(`  Found ${memberships.length} approved memberships`);
    
    if (memberships.length === 0) {
      console.log(`  ❌ NO MEMBERSHIPS FOUND!`);
      
      // Check if ANY memberships exist for this club
      const anyMemberships = await Membership.find({ club: event.club }).lean();
      console.log(`\n  📊 Total memberships for this club (any status): ${anyMemberships.length}`);
      
      if (anyMemberships.length > 0) {
        console.log(`  Membership statuses:`);
        const statusCounts = {};
        anyMemberships.forEach(m => {
          statusCounts[m.status] = (statusCounts[m.status] || 0) + 1;
        });
        Object.entries(statusCounts).forEach(([status, count]) => {
          console.log(`    - ${status}: ${count}`);
        });
      }
    } else {
      console.log(`\n  Members:`);
      memberships.forEach((m, i) => {
        console.log(`    ${i + 1}. ${m.user?.profile?.name || 'Unknown'} (${m.user?.rollNumber}) - ${m.club?.name} - Role: ${m.role}`);
      });
    }

    // Check attendance records
    console.log(`\n🎫 ATTENDANCE RECORDS:`);
    const attendanceRecords = await Attendance.find({ event: event._id })
      .populate('user', 'profile.name email rollNumber')
      .lean();
    
    console.log(`  Found ${attendanceRecords.length} attendance records`);
    
    if (attendanceRecords.length === 0) {
      console.log(`  ❌ NO ATTENDANCE RECORDS FOUND!`);
      console.log(`\n  💡 This is why the page shows "No organizers assigned"`);
      console.log(`  📝 Solution: Run the fixMissingAttendance.js script`);
    } else {
      console.log(`\n  Records:`);
      attendanceRecords.forEach((a, i) => {
        console.log(`    ${i + 1}. ${a.user?.profile?.name || 'Unknown'} - Status: ${a.status} - Type: ${a.type}`);
      });
    }

    // Summary
    console.log(`\n\n📊 SUMMARY:`);
    console.log(`  Event: ${event.title}`);
    console.log(`  Club Members: ${memberships.length}`);
    console.log(`  Attendance Records: ${attendanceRecords.length}`);
    
    if (memberships.length === 0) {
      console.log(`\n  ❌ PROBLEM: No approved club members found`);
      console.log(`  🔧 FIX: Check if users have joined the club with "approved" status`);
    } else if (attendanceRecords.length === 0) {
      console.log(`\n  ❌ PROBLEM: No attendance records exist`);
      console.log(`  🔧 FIX: Run: node src/scripts/fixMissingAttendance.js`);
    } else if (memberships.length !== attendanceRecords.length) {
      console.log(`\n  ⚠️  WARNING: Mismatch between members and attendance records`);
      console.log(`  Expected: ${memberships.length} records, Found: ${attendanceRecords.length}`);
    } else {
      console.log(`\n  ✅ Everything looks correct!`);
      console.log(`  If page still doesn't show organizers, check frontend console for errors`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

diagnose();
