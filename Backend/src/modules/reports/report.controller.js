const svc = require('./report.service');
const { successResponse } = require('../../utils/response');

exports.dashboard = async (req, res, next) => {
  try {
    const data = await svc.dashboard();
    successResponse(res, { dashboard: data });
  } catch (err) { next(err); }
};

exports.clubActivity = async (req, res, next) => {
  try {
    const { format, ...queryParams } = req.query;
    
    // If Excel format requested, generate Excel file
    if (format === 'excel') {
      const excelBuffer = await svc.generateClubActivityExcel(queryParams);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="club-activity-report.xlsx"');
      return res.send(excelBuffer);
    }
    
    // Otherwise return JSON data
    const data = await svc.clubActivity(queryParams);
    successResponse(res, { report: data });
  } catch (err) { next(err); }
};

exports.naacNba = async (req, res, next) => {
  try {
    const data = await svc.naacNba(req.query);
    successResponse(res, { report: data });
  } catch (err) { next(err); }
};

exports.annual = async (req, res, next) => {
  try {
    const data = await svc.annual(req.query);
    successResponse(res, { report: data });
  } catch (err) { next(err); }
};

exports.listAudit = async (req, res, next) => {
  try {
    const data = await svc.listAudit(req.query);
    successResponse(res, data);
  } catch (err) { next(err); }
};

// Generate Club Activity Report
exports.generateClubActivityReport = async (req, res, next) => {
  try {
    const pdfBuffer = await svc.generateClubActivityReport(
      req.params.clubId,
      req.params.year,
      { id: req.user.id, ip: req.ip, userAgent: req.headers['user-agent'] }
    );
    
    // Send PDF buffer directly
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="club-activity-${req.params.year}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) { next(err); }
};

// Generate NAAC/NBA Report
exports.generateNAACReport = async (req, res, next) => {
  try {
    const pdfBuffer = await svc.generateNAACReport(
      req.params.year,
      { id: req.user.id, ip: req.ip, userAgent: req.headers['user-agent'] }
    );
    
    // Send PDF buffer directly
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="naac-report-${req.params.year}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) { next(err); }
};

// Generate Annual Report
exports.generateAnnualReport = async (req, res, next) => {
  try {
    const pdfBuffer = await svc.generateAnnualReport(
      req.params.year,
      { id: req.user.id, ip: req.ip, userAgent: req.headers['user-agent'] }
    );
    
    // Send PDF buffer directly
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="annual-report-${req.params.year}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) { next(err); }
};

// Generate Attendance Report
exports.generateAttendanceReport = async (req, res, next) => {
  try {
    const pdfBuffer = await svc.generateAttendanceReport(
      req.params.eventId,
      { id: req.user.id, ip: req.ip, userAgent: req.headers['user-agent'] }
    );
    successResponse(res, { report }, 'Attendance report generated');
  } catch (err) { next(err); }
};