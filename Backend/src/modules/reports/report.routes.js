const router = require('express').Router();
const authenticate = require('../../middlewares/auth');
const { permit, requireAdmin, requireCoordinatorOrAdmin, requireEither, CORE_AND_PRESIDENT } = require('../../middlewares/permission');
const { hasClubMembership } = require('../../utils/rbac');
const { errorResponse } = require('../../utils/response');
const validate     = require('../../middlewares/validate');
const v            = require('./report.validators');
const ctrl         = require('./report.controller');

// Custom middleware: Allow coordinators (all events) OR club leaders (their events)
const requireCoordinatorOrClubLeader = () => {
  return async (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 401, 'Authentication required');
    }

    const userRole = req.user.roles?.global;
    
    // Admin or Coordinator - access all events
    if (userRole === 'admin' || userRole === 'coordinator') {
      return next();
    }

    // Club leaders - check if they're a leader of the event's club
    try {
      const { Event } = require('../event/event.model');
      const eventId = req.params.eventId;
      
      const event = await Event.findById(eventId).lean();
      if (!event) {
        return errorResponse(res, 404, 'Event not found');
      }

      const hasRole = await hasClubMembership(req.user.id, event.club.toString(), CORE_AND_PRESIDENT);
      if (hasRole) {
        return next();
      }

      return errorResponse(res, 403, 'Access denied: Coordinators or club leaders only');
    } catch (error) {
      console.error('Permission check error:', error);
      return errorResponse(res, 500, 'Error checking permissions');
    }
  };
};

// Dashboard (Coordinator or Admin - Section 8.1)
router.get(
  '/dashboard',
  authenticate,
  requireCoordinatorOrAdmin(),
  ctrl.dashboard
);

// Club Activity (Coordinator or Admin - Section 8.1)
router.get(
  '/club-activity',
  authenticate,
  requireCoordinatorOrAdmin(),
  validate(v.clubActivitySchema, 'query'),
  ctrl.clubActivity
);

// NAAC/NBA (Admin only - Section 8.2)
router.get(
  '/naac-nba',
  authenticate,
  requireAdmin(),
  validate(v.yearSchema, 'query'),
  ctrl.naacNba
);

// Annual Report (Admin only - Section 8.2)
router.get(
  '/annual',
  authenticate,
  requireAdmin(),
  validate(v.yearSchema, 'query'),
  ctrl.annual
);

// Audit Logs (Admin only - Section 8.3)
router.get(
  '/audit-logs',
  authenticate,
  requireAdmin(),
  validate(v.listAuditSchema, 'query'),
  ctrl.listAudit
);

// Generate Club Activity Report (Coordinator or Admin - Section 8.2)
router.get(
  '/clubs/:clubId/activity/:year',
  authenticate,
  requireCoordinatorOrAdmin(),
  validate(v.clubIdAndYear, 'params'),
  ctrl.generateClubActivityReport
);

// Generate NAAC/NBA Report (Admin only - Section 8.2)
router.post(
  '/naac/:year',
  authenticate,
  requireAdmin(),
  validate(v.year, 'params'),
  ctrl.generateNAACReport
);

// Generate Annual Report (Admin only - Section 8.2)
router.post(
  '/annual/:year',
  authenticate,
  requireAdmin(),
  validate(v.year, 'params'),
  ctrl.generateAnnualReport
);

// Generate Attendance Report (Coordinator or Admin - Section 8.2)
router.post(
  '/attendance/:eventId',
  authenticate,
  requireCoordinatorOrAdmin(),
  validate(v.eventId, 'params'),
  ctrl.generateAttendanceReport
);

// ===============================
// CSV EXPORT ROUTES (Workplan Line 474)
// ===============================

// Export Club Activity as CSV
router.get(
  '/export/csv/clubs/:clubId/activity/:year',
  authenticate,
  requireCoordinatorOrAdmin(),
  validate(v.clubIdAndYear, 'params'),
  ctrl.exportClubActivityCSV
);

// Export Audit Logs as CSV
router.get(
  '/export/csv/audit-logs',
  authenticate,
  requireAdmin(),
  validate(v.listAuditSchema, 'query'),
  ctrl.exportAuditLogsCSV
);

// Export Event Attendance as CSV
router.get(
  '/export/csv/attendance/:eventId',
  authenticate,
  requireCoordinatorOrClubLeader(), // ✅ Coordinators (all events) OR club leaders (their events)
  validate(v.eventId, 'params'),
  ctrl.exportAttendanceCSV
);

// Export Club Members as CSV
router.get(
  '/export/csv/clubs/:clubId/members',
  authenticate,
  requireCoordinatorOrAdmin(),
  ctrl.exportMembersCSV
);

module.exports = router;