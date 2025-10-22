// src/modules/event/eventRegistration.routes.js
const express = require('express');
const router = express.Router();
const ctrl = require('./eventRegistration.controller');
const authenticate = require('../../middlewares/auth');

// Event registration routes

// Register for an event
router.post(
  '/events/:eventId/register',
  authenticate,
  ctrl.register
);

// Get my registration for an event
router.get(
  '/events/:eventId/my-registration',
  authenticate,
  ctrl.getMyRegistration
);

// List all registrations for an event
router.get(
  '/events/:eventId/registrations',
  authenticate,
  ctrl.listEventRegistrations
);

// Get registration statistics for an event
router.get(
  '/events/:eventId/registration-stats',
  authenticate,
  ctrl.getEventStats
);

// Review performer registration (approve/reject)
router.post(
  '/registrations/:registrationId/review',
  authenticate,
  ctrl.reviewRegistration
);

// Cancel my registration
router.delete(
  '/registrations/:registrationId',
  authenticate,
  ctrl.cancelRegistration
);

// Get pending registrations for a club
router.get(
  '/clubs/:clubId/pending-registrations',
  authenticate,
  ctrl.listClubPendingRegistrations
);

// ✅ NEW: Audition management
// Get pending auditions for a club
router.get(
  '/clubs/:clubId/pending-auditions',
  authenticate,
  ctrl.listPendingAuditions
);

// Update audition status (pass/fail)
router.post(
  '/registrations/:registrationId/audition',
  authenticate,
  ctrl.updateAuditionStatus
);

module.exports = router;
