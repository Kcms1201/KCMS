// src/utils/reportGenerator.js
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const cloudinary = require('./cloudinary');

class ReportGenerator {
  /**
   * Generate Club Activity Report (PDF)
   */
  async generateClubActivityReport(clubData, eventData, memberData, budgetData) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Header
        doc.fontSize(20)
           .text('Club Activity Report', { align: 'center' })
           .fontSize(16)
           .text(clubData.name, { align: 'center' })
           .moveDown();

        // Club Information
        doc.fontSize(14)
           .text('Club Information', { underline: true })
           .fontSize(12)
           .text(`Category: ${clubData.category}`)
           .text(`Status: ${clubData.status}`)
           .text(`Coordinator: ${clubData.coordinatorName}`)
           .text(`Members: ${memberData.totalMembers}`)
           .moveDown();

        // Events Section
        doc.fontSize(14)
           .text('Events Overview', { underline: true })
           .fontSize(12);

        if (eventData.length > 0) {
          eventData.forEach(event => {
            doc.text(`• ${event.title} - ${new Date(event.dateTime).toLocaleDateString()}`)
              .text(`  Status: ${event.status} | Attendees: ${event.attendees || 0}`)
              .moveDown(0.5);
          });
        } else {
          doc.text('No events recorded for this period.');
        }

        doc.moveDown();

        // Budget Section
        doc.fontSize(14)
           .text('Budget Overview', { underline: true })
           .fontSize(12);

        if (budgetData && budgetData.length > 0) {
          let totalBudget = 0;
          budgetData.forEach(budget => {
            totalBudget += budget.amount || 0;
            doc.text(`• ${budget.title}`)
              .text(`  Amount: ₹${budget.amount}`)
              .text(`  Status: ${budget.status}`)
              .moveDown(0.5);
          });
          
          doc.moveDown();
          doc.fontSize(13)
             .fillColor('blue')
             .text(`Total Budget: ₹${totalBudget}`, { align: 'right' })
             .fillColor('black');
        } else {
          doc.text('No budget requests for this period.');
        }

        doc.moveDown(2);

        // Footer
        doc.fontSize(10)
           .fillColor('gray')
           .text(`Report generated on: ${new Date().toLocaleString()}`, { align: 'center' })
           .fillColor('black');

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate NAAC/NBA Report (Excel)
   */
  async generateNAACReport(clubsData, eventsData, membersData) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('NAAC/NBA Report');

    // Set up headers
    worksheet.columns = [
      { header: 'Club Name', key: 'clubName', width: 25 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Total Members', key: 'totalMembers', width: 15 },
      { header: 'Events Conducted', key: 'eventsConducted', width: 18 },
      { header: 'Total Attendees', key: 'totalAttendees', width: 18 },
      { header: 'Budget Utilized', key: 'budgetUtilized', width: 15 },
      { header: 'Status', key: 'status', width: 12 }
    ];

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add data
    clubsData.forEach(club => {
      const clubEvents = eventsData.filter(event => event.clubId === club._id);
      const totalAttendees = clubEvents.reduce((sum, event) => sum + (event.attendees || 0), 0);
      const totalBudget = clubEvents.reduce((sum, event) => sum + (event.budget || 0), 0);

      worksheet.addRow({
        clubName: club.name,
        category: club.category,
        totalMembers: club.memberCount,
        eventsConducted: clubEvents.length,
        totalAttendees,
        budgetUtilized: totalBudget,
        status: club.status
      });
    });

    // Add summary row
    const totalRow = clubsData.length + 2;
    worksheet.getRow(totalRow).values = [
      'TOTAL',
      '',
      clubsData.reduce((sum, club) => sum + club.memberCount, 0),
      eventsData.length,
      eventsData.reduce((sum, event) => sum + (event.attendees || 0), 0),
      eventsData.reduce((sum, event) => sum + (event.budget || 0), 0),
      ''
    ];

    worksheet.getRow(totalRow).font = { bold: true };
    worksheet.getRow(totalRow).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD0E0D0' }
    };

    return workbook.xlsx.writeBuffer();
  }

  /**
   * Generate Annual Report (PDF)
   */
  async generateAnnualReport(year, summaryData, topClubs, topEvents) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Title Page
        doc.fontSize(24)
           .text('KMIT Clubs Hub', { align: 'center' })
           .fontSize(20)
           .text('Annual Report', { align: 'center' })
           .fontSize(16)
           .text(year, { align: 'center' })
           .moveDown(2);

        // Executive Summary
        doc.fontSize(14)
           .text('Executive Summary', { underline: true })
           .fontSize(12)
           .text(`Total Clubs: ${summaryData.totalClubs}`)
           .text(`Total Events: ${summaryData.totalEvents}`)
           .text(`Total Members: ${summaryData.totalMembers}`)
           .text(`Total Budget: ₹${summaryData.totalBudget}`)
           .moveDown();

        // Top Performing Clubs
        doc.fontSize(14)
           .text('Top Performing Clubs', { underline: true })
           .fontSize(12);

        topClubs.forEach((club, index) => {
          doc.text(`${index + 1}. ${club.name}`)
            .text(`   Events: ${club.eventsCount} | Members: ${club.memberCount}`)
            .moveDown(0.5);
        });

        doc.moveDown();

        // Notable Events
        doc.fontSize(14)
           .text('Notable Events', { underline: true })
           .fontSize(12);

        topEvents.forEach(event => {
          doc.text(`• ${event.title}`)
            .text(`  ${event.clubName} - ${new Date(event.dateTime).toLocaleDateString()}`)
            .text(`  Attendees: ${event.attendees}`)
            .moveDown(0.5);
        });

        // Footer
        doc.fontSize(10)
           .text(`Report generated on: ${new Date().toLocaleString()}`, { align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate Attendance Report (Excel)
   */
  async generateAttendanceReport(attendanceData, eventInfo) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance Report');

    // Set up headers
    worksheet.columns = [
      { header: 'Roll Number', key: 'rollNumber', width: 15 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Timestamp', key: 'timestamp', width: 20 }
    ];

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add event info
    worksheet.addRow({});
    worksheet.addRow({ rollNumber: 'Event:', name: eventInfo.title });
    worksheet.addRow({ rollNumber: 'Date:', name: new Date(eventInfo.dateTime).toLocaleString() });
    worksheet.addRow({ rollNumber: 'Venue:', name: eventInfo.venue });
    worksheet.addRow({});

    // Add attendance data
    attendanceData.forEach(attendance => {
      worksheet.addRow({
        rollNumber: attendance.rollNumber,
        name: attendance.name,
        email: attendance.email,
        status: attendance.status,
        timestamp: new Date(attendance.timestamp).toLocaleString()
      });
    });

    // Add summary
    const totalRow = attendanceData.length + 7;
    const presentCount = attendanceData.filter(a => a.status === 'present').length;
    const rsvpCount = attendanceData.filter(a => a.status === 'rsvp').length;

    worksheet.getRow(totalRow + 1).values = ['SUMMARY', '', '', '', ''];
    worksheet.getRow(totalRow + 2).values = ['Total RSVPs:', rsvpCount, '', '', ''];
    worksheet.getRow(totalRow + 3).values = ['Present:', presentCount, '', '', ''];
    worksheet.getRow(totalRow + 4).values = ['Attendance Rate:', `${((presentCount/rsvpCount)*100).toFixed(1)}%`, '', '', ''];

    return workbook.xlsx.writeBuffer();
  }

  /**
   * Upload report to Cloudinary and return URL
   */
  async uploadReport(buffer, fileName, folder = 'reports') {
    try {
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder,
            public_id: fileName,
            resource_type: 'raw'
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(buffer);
      });

      return result.secure_url;
    } catch (error) {
      throw new Error(`Failed to upload report: ${error.message}`);
    }
  }

  /**
   * Generate and upload report
   */
  async generateAndUploadReport(reportType, data, fileName, options = {}) {
    let buffer;
    
    switch (reportType) {
      case 'club-activity':
        buffer = await this.generateClubActivityReport(
          data.clubData,
          data.eventData,
          data.memberData,
          data.budgetData
        );
        break;
      case 'naac':
        buffer = await this.generateNAACReport(
          data.clubsData,
          data.eventsData,
          data.membersData
        );
        break;
      case 'annual':
        buffer = await this.generateAnnualReport(
          data.year,
          data.summaryData,
          data.topClubs,
          data.topEvents
        );
        break;
      case 'attendance':
        buffer = await this.generateAttendanceReport(
          data.attendanceData,
          data.eventInfo
        );
        break;
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }

    const url = await this.uploadReport(buffer, fileName, options.folder);
    
    return {
      url,
      fileName,
      size: buffer.length,
      type: reportType,
      generatedAt: new Date()
    };
  }
}

module.exports = new ReportGenerator();
