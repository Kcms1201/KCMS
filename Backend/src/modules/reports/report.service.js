const mongoose = require('mongoose');
const { Club } = require('../club/club.model');
const { Membership } = require('../club/membership.model');
const { Event } = require('../event/event.model');
const { Recruitment } = require('../recruitment/recruitment.model');
const { BudgetRequest } = require('../event/budgetRequest.model');
const { AuditLog } = require('../audit/auditLog.model');
const { Attendance } = require('../event/attendance.model');
const reportGenerator = require('../../utils/reportGenerator');
const naacService = require('./naac.service');

class ReportService {
  async dashboard() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Get total counts
    const totalClubs = await Club.countDocuments({ status: 'active' });
    const totalStudents = await Membership.countDocuments({ status: 'approved' });
    const totalEvents = await Event.countDocuments(); // All events ever created
    
    // Get this month's stats
    const eventsThisMonth = await Event.countDocuments({
      dateTime: { $gte: monthStart, $lte: now }
    });
    
    const newMembersThisMonth = await Membership.countDocuments({
      joinedAt: { $gte: monthStart, $lte: now },
      status: 'approved'
    });
    
    // Get pending approvals
    const pendingClubs = await Club.countDocuments({ status: 'pending_approval' });
    const pendingEvents = await Event.countDocuments({ 
      status: { $in: ['pending_coordinator', 'pending_admin'] }
    });
    const pendingApprovals = pendingClubs + pendingEvents;
    
    // Get active recruitments (scheduled or in_progress)
    const activeRecruitments = await Recruitment.countDocuments({
      status: { $in: ['scheduled', 'in_progress'] }
    });
    
    // Get recruitment summary (for detailed stats if needed)
    const recruitmentStatuses = await Recruitment.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const recruitmentSummary = {};
    recruitmentStatuses.forEach(r => recruitmentSummary[r._id] = r.count);

    return {
      // Field names matching frontend expectations
      totalClubs,
      totalStudents,
      totalEvents,
      activeRecruitments,
      eventsThisMonth,
      newMembersThisMonth,
      pendingApprovals,
      
      // Additional detailed info
      pendingClubs,
      pendingEvents,
      recruitmentSummary
    };
  }

  async clubActivity({ clubId, year }) {
    const start = new Date(year, 0, 1), end = new Date(year+1, 0, 1);
    const eventsCount = await Event.countDocuments({
      club: clubId,
      dateTime: { $gte: start, $lt: end }
    });
    const membersCount = await Membership.countDocuments({
      club: clubId,
      status: 'approved'
    });
    const budgets = await BudgetRequest.aggregate([
      { $match: { event: { $in: await Event.find({ club: clubId }).distinct('_id') } } },
      { $group: { _id: null, totalRequested: { $sum: '$amount' } } }
    ]);
    const recs = await Recruitment.countDocuments({ club: clubId, startDate: { $gte: start, $lt: end } });
    const apps = await mongoose.model('Application').countDocuments({
      recruitment: { $in: await Recruitment.find({ club: clubId }).distinct('_id') }
    });

    return {
      eventsCount,
      membersCount,
      totalBudgetRequested: budgets[0]?.totalRequested || 0,
      recruitmentCycles: recs,
      applications: apps
    };
  }

  async naacNba({ year }) {
    // similar to dashboard + clubActivity for all clubs
    const dash = await this.dashboard();
    const annual = await this.annual({ year });
    // attach evidence: count of docs & media uploaded that year
    const docsCount = await mongoose.model('Document').countDocuments({
      createdAt: { $gte: new Date(year,0,1), $lt: new Date(year+1,0,1) }
    });
    return { dash, annual, docsCount };
  }

  async annual({ year }) {
    const start = new Date(year,0,1), end = new Date(year+1,0,1);
    const clubs = await Club.countDocuments({ createdAt: { $gte: start, $lt: end } });
    const events = await Event.countDocuments({ createdAt: { $gte: start, $lt: end } });
    const members = await Membership.countDocuments({ createdAt: { $gte: start, $lt: end } });
    return { clubs, events, members };
  }

  async listAudit({ user, action, from, to, page=1, limit=20 }) {
    const query = {};
    if (user)   query.user = user;
    if (action) query.action = action;
    if (from || to) query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to)   query.createdAt.$lte = new Date(to);

    const skip = (page-1)*limit;
    const [total, items] = await Promise.all([
      AuditLog.countDocuments(query),
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
    ]);
    return { total, page, limit, items };
  }

  /**
   * Generate Club Activity Report (PDF)
   */
  async generateClubActivityReport(clubId, year, userContext) {
    const club = await Club.findById(clubId).populate('coordinator', 'profile.name');
    if (!club) {
      const err = new Error('Club not found');
      err.statusCode = 404;
      throw err;
    }

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year + 1, 0, 1);

    const [events, members, budgetRequests] = await Promise.all([
      Event.find({ 
        club: clubId, 
        dateTime: { $gte: startDate, $lt: endDate } 
      }).populate('club', 'name'),
      
      Membership.find({ 
        club: clubId, 
        status: 'approved' 
      }).populate('user', 'profile.name rollNumber'),
      
      BudgetRequest.find({
        event: { $in: await Event.find({ club: clubId }).distinct('_id') },
        createdAt: { $gte: startDate, $lt: endDate }
      }).populate('event', 'title')
    ]);

    const clubData = {
      name: club.name,
      category: club.category,
      status: club.status,
      coordinatorName: club.coordinator?.profile?.name || 'N/A'
    };

    const eventData = events.map(event => ({
      title: event.title,
      dateTime: event.dateTime,
      status: event.status,
      attendees: event.expectedAttendees || 0
    }));

    const memberData = {
      totalMembers: members.length
    };

    const budgetData = budgetRequests.map(br => ({
      title: br.event?.title || 'Unknown Event',
      amount: br.amount,
      status: br.status
    }));

    // Generate PDF buffer directly instead of uploading
    return await reportGenerator.generateClubActivityReport(
      clubData,
      eventData,
      memberData,
      budgetData
    );
  }

  /**
   * Generate Club Activity Report as Excel
   */
  async generateClubActivityExcel({ clubId, year }) {
    const club = await Club.findById(clubId).populate('coordinator', 'profile.name');
    if (!club) {
      const err = new Error('Club not found');
      err.statusCode = 404;
      throw err;
    }

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year + 1, 0, 1);

    const [events, members, budgetRequests] = await Promise.all([
      Event.find({ 
        club: clubId, 
        dateTime: { $gte: startDate, $lt: endDate } 
      }).lean(),
      
      Membership.find({ 
        club: clubId, 
        status: 'approved' 
      }).populate('user', 'profile.name rollNumber').lean(),
      
      BudgetRequest.find({
        event: { $in: await Event.find({ club: clubId }).distinct('_id') },
        createdAt: { $gte: startDate, $lt: endDate }
      }).populate('event', 'title').lean()
    ]);

    // Generate Excel using ExcelJS
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Club Activity Report');

    // === SUMMARY SECTION ===
    worksheet.mergeCells('A1:F1');
    worksheet.getCell('A1').value = `${club.name} - Activity Report ${year}`;
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };
    worksheet.addRow([]);

    // Club Summary
    worksheet.addRow(['Club Information']);
    worksheet.getRow(3).font = { bold: true, size: 12 };
    worksheet.addRow(['Club Name', club.name]);
    worksheet.addRow(['Category', club.category]);
    worksheet.addRow(['Coordinator', club.coordinator?.profile?.name || 'N/A']);
    worksheet.addRow(['Total Members', members.length]);
    worksheet.addRow(['Total Events', events.length]);
    worksheet.addRow(['Total Budget', `₹${budgetRequests.reduce((sum, br) => sum + (br.amount || 0), 0)}`]);
    worksheet.addRow([]);

    // === EVENTS SECTION ===
    worksheet.addRow(['Events List']);
    worksheet.getRow(worksheet.lastRow.number).font = { bold: true, size: 12 };
    
    // Events header
    const eventsHeaderRow = worksheet.addRow(['Event Title', 'Date', 'Status', 'Attendees', 'Budget']);
    eventsHeaderRow.font = { bold: true };
    eventsHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Events data
    events.forEach(event => {
      worksheet.addRow([
        event.title,
        new Date(event.dateTime).toLocaleDateString(),
        event.status,
        event.expectedAttendees || 0,
        event.budget ? `₹${event.budget}` : 'N/A'
      ]);
    });

    worksheet.addRow([]);

    // === BUDGET SECTION ===
    if (budgetRequests.length > 0) {
      worksheet.addRow(['Budget Requests']);
      worksheet.getRow(worksheet.lastRow.number).font = { bold: true, size: 12 };
      
      const budgetHeaderRow = worksheet.addRow(['Event', 'Amount', 'Status']);
      budgetHeaderRow.font = { bold: true };
      budgetHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      budgetRequests.forEach(br => {
        worksheet.addRow([
          br.event?.title || 'Unknown Event',
          `₹${br.amount}`,
          br.status
        ]);
      });
    }

    // Set column widths
    worksheet.getColumn(1).width = 30;
    worksheet.getColumn(2).width = 15;
    worksheet.getColumn(3).width = 15;
    worksheet.getColumn(4).width = 15;
    worksheet.getColumn(5).width = 15;

    return await workbook.xlsx.writeBuffer();
  }

  /**
   * Generate NAAC/NBA Report (Enhanced PDF with proper formatting)
   */
  async generateNAACReport(year, userContext) {
    // Use the enhanced NAAC service
    return await naacService.generateNAACReport(year, userContext);
  }

  /**
   * Generate Annual Report (PDF)
   */
  async generateAnnualReport(year, userContext) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year + 1, 0, 1);

    const [
      clubsCount,
      eventsCount,
      membersCount,
      totalBudget,
      clubs,
      events
    ] = await Promise.all([
      Club.countDocuments({ createdAt: { $gte: startDate, $lt: endDate } }),
      Event.countDocuments({ dateTime: { $gte: startDate, $lt: endDate } }),
      Membership.countDocuments({ createdAt: { $gte: startDate, $lt: endDate } }),
      Event.aggregate([
        { $match: { dateTime: { $gte: startDate, $lt: endDate } } },
        { $group: { _id: null, total: { $sum: '$budget' } } }
      ]),
      Club.find({ status: 'active' }).limit(10),
      Event.find({ 
        dateTime: { $gte: startDate, $lt: endDate },
        status: 'completed'
      }).populate('club', 'name').sort({ expectedAttendees: -1 }).limit(10)
    ]);

    const summaryData = {
      totalClubs: clubsCount,
      totalEvents: eventsCount,
      totalMembers: membersCount,
      totalBudget: totalBudget[0]?.total || 0
    };

    const topClubs = await Promise.all(clubs.map(async club => {
      const [eventsCount, memberCount] = await Promise.all([
        Event.countDocuments({ 
          club: club._id, 
          dateTime: { $gte: startDate, $lt: endDate } 
        }),
        Membership.countDocuments({ 
          club: club._id, 
          status: 'approved' 
        })
      ]);
      return {
        name: club.name,
        eventsCount,
        memberCount
      };
    }));

    const topEvents = events.map(event => ({
      title: event.title,
      clubName: event.club.name,
      dateTime: event.dateTime,
      attendees: event.expectedAttendees || 0
    }));

    // Generate PDF buffer directly instead of uploading
    return await reportGenerator.generateAnnualReport(
      year,
      summaryData,
      topClubs,
      topEvents
    );
  }

  /**
   * Generate Attendance Report (Excel)
   */
  async generateAttendanceReport(eventId, userContext) {
    const event = await Event.findById(eventId).populate('club', 'name');
    if (!event) {
      const err = new Error('Event not found');
      err.statusCode = 404;
      throw err;
    }

    const attendance = await Attendance.find({ event: eventId })
      .populate('user', 'profile.name rollNumber email')
      .sort({ timestamp: -1 });

    const attendanceData = attendance.map(att => ({
      rollNumber: att.user.rollNumber,
      name: att.user.profile.name,
      email: att.user.email,
      status: att.status,
      timestamp: att.timestamp
    }));

    const eventInfo = {
      title: event.title,
      dateTime: event.dateTime,
      venue: event.venue,
      clubName: event.club.name
    };

    // Generate Excel buffer directly instead of uploading
    return await reportGenerator.generateAttendanceReport(
      attendanceData,
      eventInfo
    );
  }
}

module.exports = new ReportService();