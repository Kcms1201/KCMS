// src/modules/analytics/analytics.routes.js
const router = require('express').Router();
const authenticate = require('../../middlewares/auth');
const ctrl = require('./analytics.controller');

// All analytics routes require authentication
router.use(authenticate);

/**
 * GET /api/analytics/clubs/:clubId/members
 * Get all club members with their participation stats
 * Query params: status, minEvents, role
 */
router.get('/clubs/:clubId/members', ctrl.getClubMemberAnalytics);

/**
 * GET /api/analytics/clubs/:clubId/members/:userId
 * Get detailed activity for a specific member
 */
router.get('/clubs/:clubId/members/:userId', ctrl.getMemberActivity);

/**
 * GET /api/analytics/clubs/:clubId/summary
 * Get club analytics summary
 */
router.get('/clubs/:clubId/summary', ctrl.getClubSummary);

/**
 * GET /api/analytics/clubs/:clubId/export
 * Export member analytics as CSV
 */
router.get('/clubs/:clubId/export', ctrl.exportMemberAnalytics);

module.exports = router;
