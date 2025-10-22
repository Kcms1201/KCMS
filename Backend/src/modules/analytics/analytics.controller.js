// src/modules/analytics/analytics.controller.js
const svc = require('./analytics.service');
const { successResponse } = require('../../utils/response');

/**
 * Get club member analytics
 * GET /api/analytics/clubs/:clubId/members
 */
exports.getClubMemberAnalytics = async (req, res, next) => {
  try {
    const { clubId } = req.params;
    const filters = {
      status: req.query.status,
      minEvents: req.query.minEvents,
      role: req.query.role
    };
    
    const members = await svc.getClubMemberAnalytics(clubId, filters);
    successResponse(res, { members, total: members.length });
  } catch (err) {
    next(err);
  }
};

/**
 * Get specific member activity
 * GET /api/analytics/clubs/:clubId/members/:userId
 */
exports.getMemberActivity = async (req, res, next) => {
  try {
    const { clubId, userId } = req.params;
    const data = await svc.getMemberActivity(clubId, userId);
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
};

/**
 * Get club analytics summary
 * GET /api/analytics/clubs/:clubId/summary
 */
exports.getClubSummary = async (req, res, next) => {
  try {
    const { clubId } = req.params;
    const summary = await svc.getClubAnalyticsSummary(clubId);
    successResponse(res, summary);
  } catch (err) {
    next(err);
  }
};

/**
 * Export member analytics as CSV
 * GET /api/analytics/clubs/:clubId/export
 */
exports.exportMemberAnalytics = async (req, res, next) => {
  try {
    const { clubId } = req.params;
    const csv = await svc.exportMemberAnalytics(clubId);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="member-analytics-${clubId}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
};
