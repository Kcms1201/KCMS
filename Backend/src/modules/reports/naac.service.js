const mongoose = require('mongoose');
const { Club } = require('../club/club.model');
const { Membership } = require('../club/membership.model');
const { Event } = require('../event/event.model');
const { Attendance } = require('../event/attendance.model');
const { Recruitment } = require('../recruitment/recruitment.model');
const { User } = require('../auth/user.model');
const settingsService = require('../settings/settings.service');
const PDFDocument = require('pdfkit');
const cloudinary = require('../../utils/cloudinary');

/**
 * NAAC Report Service
 * Generates comprehensive NAAC/NBA reports with proper formatting,
 * criteria mapping, and evidence bundling
 */
class NAACReportService {
  /**
   * Generate comprehensive NAAC report
   * @param {number} year - Academic year
   * @param {object} userContext - User requesting the report
   */
  async generateNAACReport(year, userContext) {
    // Get settings for institution details and criteria mapping
    const settings = await settingsService.getSettings();
    const { institutionName, institutionCode, naacGrade, criteriaMapping } = settings.accreditation;

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year + 1, 0, 1);

    // Collect all data
    const [
      studentParticipationData,
      clubActivityData,
      eventData,
      impactAssessmentData,
      yearWiseComparison
    ] = await Promise.all([
      this.getStudentParticipationData(startDate, endDate),
      this.getClubActivityData(startDate, endDate),
      this.getEventData(startDate, endDate),
      this.getImpactAssessmentData(startDate, endDate),
      this.getYearWiseComparison(year)
    ]);

    // Map to NAAC criteria
    const criteriaData = this.mapToNAACCriteria(
      {
        studentParticipationData,
        clubActivityData,
        eventData,
        impactAssessmentData
      },
      criteriaMapping
    );

    // Generate PDF report
    const pdfBuffer = await this.generateNAACPDF({
      institutionName,
      institutionCode,
      naacGrade,
      year,
      studentParticipationData,
      clubActivityData,
      eventData,
      impactAssessmentData,
      criteriaData,
      yearWiseComparison
    });

    // Return PDF buffer directly instead of uploading
    return pdfBuffer;
  }

  /**
   * Get student participation data (NAAC Criterion 2.5.3)
   */
  async getStudentParticipationData(startDate, endDate) {
    // Get all students who participated in any club activity
    const memberships = await Membership.find({
      createdAt: { $gte: startDate, $lt: endDate },
      status: 'approved'
    }).populate('user', 'profile.name rollNumber profile.year profile.branch');

    // Get event attendance
    const attendance = await Attendance.find({
      timestamp: { $gte: startDate, $lt: endDate },
      status: 'present'
    }).populate('user', 'profile.name rollNumber profile.year profile.branch');

    // Calculate unique students
    const uniqueStudentIds = new Set([
      ...memberships.map(m => m.user._id.toString()),
      ...attendance.map(a => a.user._id.toString())
    ]);

    // Break down by year and branch
    const byYear = {};
    const byBranch = {};

    [...memberships, ...attendance].forEach(item => {
      const user = item.user;
      if (!user) return;

      const year = user.profile?.year || 'Unknown';
      const branch = user.profile?.branch || 'Unknown';

      byYear[year] = (byYear[year] || 0) + 1;
      byBranch[branch] = (byBranch[branch] || 0) + 1;
    });

    // Get total student strength (assuming from User model)
    const totalStudents = await User.countDocuments({ 'roles.global': 'student' });
    const participationRate = (uniqueStudentIds.size / totalStudents * 100).toFixed(2);

    return {
      uniqueStudents: uniqueStudentIds.size,
      totalStudents,
      participationRate,
      byYear,
      byBranch,
      clubMemberships: memberships.length,
      eventAttendances: attendance.length
    };
  }

  /**
   * Get club activity data (NAAC Criterion 3.3.2)
   */
  async getClubActivityData(startDate, endDate) {
    const clubs = await Club.find({ status: 'active' });

    const clubDetails = await Promise.all(clubs.map(async (club) => {
      const [eventsCount, memberCount, totalBudget] = await Promise.all([
        Event.countDocuments({
          club: club._id,
          dateTime: { $gte: startDate, $lt: endDate }
        }),
        Membership.countDocuments({
          club: club._id,
          status: 'approved'
        }),
        Event.aggregate([
          { $match: { club: club._id, dateTime: { $gte: startDate, $lt: endDate } } },
          { $group: { _id: null, total: { $sum: '$budget' } } }
        ])
      ]);

      return {
        name: club.name,
        category: club.category,
        eventsCount,
        memberCount,
        budget: totalBudget[0]?.total || 0
      };
    }));

    // Category-wise breakdown
    const byCategory = {};
    clubDetails.forEach(club => {
      if (!byCategory[club.category]) {
        byCategory[club.category] = {
          clubs: 0,
          events: 0,
          members: 0,
          budget: 0
        };
      }
      byCategory[club.category].clubs++;
      byCategory[club.category].events += club.eventsCount;
      byCategory[club.category].members += club.memberCount;
      byCategory[club.category].budget += club.budget;
    });

    return {
      totalClubs: clubs.length,
      clubDetails,
      byCategory
    };
  }

  /**
   * Get event data (Co-curricular activities)
   */
  async getEventData(startDate, endDate) {
    const events = await Event.find({
      dateTime: { $gte: startDate, $lt: endDate },
      status: { $in: ['completed', 'published'] }
    }).populate('club', 'name category');

    const eventDetails = [];
    let totalAttendance = 0;
    let totalBudget = 0;

    for (const event of events) {
      const attendanceCount = await Attendance.countDocuments({
        event: event._id,
        status: 'present'
      });

      totalAttendance += attendanceCount;
      totalBudget += event.budget || 0;

      eventDetails.push({
        title: event.title,
        club: event.club.name,
        category: event.club.category,
        dateTime: event.dateTime,
        venue: event.venue,
        attendance: attendanceCount,
        budget: event.budget || 0,
        guestSpeakers: event.guestSpeakers ? event.guestSpeakers.length : 0
      });
    }

    return {
      totalEvents: events.length,
      eventDetails,
      totalAttendance,
      totalBudget,
      averageAttendance: events.length > 0 ? (totalAttendance / events.length).toFixed(1) : 0
    };
  }

  /**
   * Get impact assessment data (Student development indicators)
   */
  async getImpactAssessmentData(startDate, endDate) {
    // Leadership positions filled
    const leadershipPositions = await Membership.countDocuments({
      createdAt: { $gte: startDate, $lt: endDate },
      role: { $in: ['president', 'vicePresident', 'secretary', 'treasurer', 'leadPR', 'leadTech'] },
      status: 'approved'
    });

    // Recruitment participation
    const recruitments = await Recruitment.countDocuments({
      startDate: { $gte: startDate, $lt: endDate }
    });

    const applications = await mongoose.model('Application').countDocuments({
      createdAt: { $gte: startDate, $lt: endDate }
    });

    // Events with external participation (guest speakers)
    const externalEvents = await Event.countDocuments({
      dateTime: { $gte: startDate, $lt: endDate },
      guestSpeakers: { $exists: true, $not: { $size: 0 } }
    });

    return {
      leadershipPositions,
      recruitmentCycles: recruitments,
      totalApplications: applications,
      eventsWithExternalParticipation: externalEvents,
      skillDevelopmentOpportunities: leadershipPositions + externalEvents
    };
  }

  /**
   * Get year-wise comparison
   */
  async getYearWiseComparison(currentYear) {
    const years = [currentYear - 2, currentYear - 1, currentYear];
    const comparison = [];

    for (const year of years) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year + 1, 0, 1);

      const [clubsCount, eventsCount, membersCount, studentsParticipated] = await Promise.all([
        Club.countDocuments({ createdAt: { $lte: endDate } }),
        Event.countDocuments({ dateTime: { $gte: startDate, $lt: endDate } }),
        Membership.countDocuments({ createdAt: { $gte: startDate, $lt: endDate } }),
        Attendance.distinct('user', {
          timestamp: { $gte: startDate, $lt: endDate },
          status: 'present'
        }).then(users => users.length)
      ]);

      comparison.push({
        year,
        clubs: clubsCount,
        events: eventsCount,
        newMembers: membersCount,
        studentsParticipated
      });
    }

    return comparison;
  }

  /**
   * Map data to NAAC criteria
   */
  mapToNAACCriteria(data, criteriaMapping) {
    const mapped = {};

    // Student Participation (2.5.3)
    if (criteriaMapping.get('student_participation')) {
      mapped[criteriaMapping.get('student_participation')] = {
        title: 'Student Participation in Co-curricular Activities',
        data: {
          uniqueStudents: data.studentParticipationData.uniqueStudents,
          participationRate: data.studentParticipationData.participationRate,
          totalEvents: data.eventData.totalEvents,
          clubMemberships: data.studentParticipationData.clubMemberships
        }
      };
    }

    // Co-curricular Activities (3.3.2)
    if (criteriaMapping.get('co_curricular')) {
      mapped[criteriaMapping.get('co_curricular')] = {
        title: 'Number of extension and outreach programs conducted',
        data: {
          totalEvents: data.eventData.totalEvents,
          studentsParticipated: data.studentParticipationData.uniqueStudents,
          externalEvents: data.impactAssessmentData.eventsWithExternalParticipation
        }
      };
    }

    // Student Development (5.1.3)
    if (criteriaMapping.get('student_development')) {
      mapped[criteriaMapping.get('student_development')] = {
        title: 'Capacity building and skills enhancement initiatives',
        data: {
          leadershipPositions: data.impactAssessmentData.leadershipPositions,
          skillDevelopmentEvents: data.impactAssessmentData.skillDevelopmentOpportunities,
          clubActivities: data.clubActivityData.totalClubs
        }
      };
    }

    return mapped;
  }

  /**
   * Generate NAAC PDF with proper formatting
   */
  async generateNAACPDF(reportData) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // ===== TITLE PAGE =====
        doc.fontSize(24)
           .font('Helvetica-Bold')
           .text(reportData.institutionName, { align: 'center' })
           .moveDown(0.5);

        doc.fontSize(18)
           .text('NAAC Accreditation Report', { align: 'center' })
           .moveDown(0.3);

        doc.fontSize(14)
           .font('Helvetica')
           .text(`Academic Year: ${reportData.year}-${reportData.year + 1}`, { align: 'center' })
           .moveDown(0.3);

        doc.fontSize(12)
           .text(`Institution Code: ${reportData.institutionCode}`, { align: 'center' })
           .text(`NAAC Grade: ${reportData.naacGrade}`, { align: 'center' })
           .moveDown(2);

        // ===== EXECUTIVE SUMMARY =====
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text('Executive Summary', { underline: true })
           .moveDown(0.5);

        doc.fontSize(12)
           .font('Helvetica')
           .text(`Total Clubs: ${reportData.clubActivityData.totalClubs}`)
           .text(`Total Events Conducted: ${reportData.eventData.totalEvents}`)
           .text(`Unique Students Participated: ${reportData.studentParticipationData.uniqueStudents}`)
           .text(`Participation Rate: ${reportData.studentParticipationData.participationRate}%`)
           .text(`Total Attendance: ${reportData.eventData.totalAttendance}`)
           .text(`Total Budget Utilized: ₹${reportData.eventData.totalBudget}`)
           .moveDown(1.5);

        // ===== NAAC CRITERIA MAPPING =====
        doc.addPage();
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text('NAAC Criteria Compliance', { underline: true })
           .moveDown(0.5);

        Object.entries(reportData.criteriaData).forEach(([criteria, details]) => {
          doc.fontSize(14)
             .font('Helvetica-Bold')
             .text(`Criterion ${criteria}: ${details.title}`)
             .moveDown(0.3);

          doc.fontSize(12)
             .font('Helvetica');

          Object.entries(details.data).forEach(([key, value]) => {
            doc.text(`  • ${key.replace(/([A-Z])/g, ' $1').trim()}: ${value}`);
          });

          doc.moveDown(1);
        });

        // ===== STUDENT PARTICIPATION =====
        doc.addPage();
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text('Student Participation Analysis', { underline: true })
           .moveDown(0.5);

        doc.fontSize(12)
           .font('Helvetica')
           .text(`Total Students in Institution: ${reportData.studentParticipationData.totalStudents}`)
           .text(`Students Participated in Activities: ${reportData.studentParticipationData.uniqueStudents}`)
           .text(`Participation Rate: ${reportData.studentParticipationData.participationRate}%`)
           .moveDown(1);

        doc.fontSize(14)
           .font('Helvetica-Bold')
           .text('Year-wise Distribution:')
           .fontSize(12)
           .font('Helvetica');

        Object.entries(reportData.studentParticipationData.byYear).forEach(([year, count]) => {
          doc.text(`  ${year}: ${count} students`);
        });

        doc.moveDown(1);
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .text('Branch-wise Distribution:')
           .fontSize(12)
           .font('Helvetica');

        Object.entries(reportData.studentParticipationData.byBranch).forEach(([branch, count]) => {
          doc.text(`  ${branch}: ${count} students`);
        });

        // ===== CLUB ACTIVITIES =====
        doc.addPage();
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text('Club Activities Summary', { underline: true })
           .moveDown(0.5);

        doc.fontSize(12)
           .font('Helvetica')
           .text(`Total Active Clubs: ${reportData.clubActivityData.totalClubs}`)
           .moveDown(1);

        doc.fontSize(14)
           .font('Helvetica-Bold')
           .text('Category-wise Breakdown:')
           .fontSize(12)
           .font('Helvetica')
           .moveDown(0.3);

        Object.entries(reportData.clubActivityData.byCategory).forEach(([category, data]) => {
          doc.fontSize(12)
             .font('Helvetica-Bold')
             .text(`${category.toUpperCase()}:`)
             .font('Helvetica')
             .text(`  Clubs: ${data.clubs}`)
             .text(`  Events: ${data.events}`)
             .text(`  Members: ${data.members}`)
             .text(`  Budget: ₹${data.budget}`)
             .moveDown(0.5);
        });

        // ===== YEAR-WISE COMPARISON =====
        doc.addPage();
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text('Year-wise Comparison', { underline: true })
           .moveDown(0.5);

        reportData.yearWiseComparison.forEach(yearData => {
          doc.fontSize(14)
             .font('Helvetica-Bold')
             .text(`Year ${yearData.year}-${yearData.year + 1}:`)
             .fontSize(12)
             .font('Helvetica')
             .text(`  Clubs: ${yearData.clubs}`)
             .text(`  Events: ${yearData.events}`)
             .text(`  New Members: ${yearData.newMembers}`)
             .text(`  Students Participated: ${yearData.studentsParticipated}`)
             .moveDown(0.8);
        });

        // ===== FOOTER =====
        doc.fontSize(10)
           .font('Helvetica')
           .text(`Report Generated: ${new Date().toLocaleString()}`, 50, doc.page.height - 50, {
             align: 'center'
           });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Upload report to cloud storage
   */
  async uploadToCloud(buffer, fileName, folder) {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: fileName.replace(/\.[^/.]+$/, ""),
          resource_type: 'raw'
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result.secure_url);
        }
      ).end(buffer);
    });
  }
}

module.exports = new NAACReportService();
