// src/modules/event/eventRegistration.controller.js
const registrationService = require('./eventRegistration.service');
const { successResponse } = require('../../utils/response');

/**
 * Register for an event
 */
exports.register = async (req, res, next) => {
  try {
    const registration = await registrationService.register(
      req.params.eventId,
      req.body,
      { id: req.user.id, ip: req.ip, userAgent: req.headers['user-agent'] }
    );
    successResponse(res, registration, 'Registration successful');
  } catch (err) {
    next(err);
  }
};

/**
 * Review performer registration (approve/reject)
 */
exports.reviewRegistration = async (req, res, next) => {
  try {
    const registration = await registrationService.reviewRegistration(
      req.params.registrationId,
      req.body,
      { id: req.user.id, ip: req.ip, userAgent: req.headers['user-agent'] }
    );
    successResponse(res, registration, 'Registration reviewed');
  } catch (err) {
    next(err);
  }
};

/**
 * List event registrations
 */
exports.listEventRegistrations = async (req, res, next) => {
  try {
    const registrations = await registrationService.listEventRegistrations(
      req.params.eventId,
      req.query
    );
    successResponse(res, registrations, 'Registrations retrieved');
  } catch (err) {
    next(err);
  }
};

/**
 * Get my registration for an event
 */
exports.getMyRegistration = async (req, res, next) => {
  try {
    const registration = await registrationService.getMyRegistration(
      req.params.eventId,
      req.user.id
    );
    successResponse(res, registration, 'Registration retrieved');
  } catch (err) {
    next(err);
  }
};

/**
 * Get pending registrations for a club
 */
exports.listClubPendingRegistrations = async (req, res, next) => {
  try {
    const registrations = await registrationService.listClubPendingRegistrations(
      req.params.clubId,
      req.query.eventId
    );
    successResponse(res, registrations, 'Pending registrations retrieved');
  } catch (err) {
    next(err);
  }
};

/**
 * Get event registration statistics
 */
exports.getEventStats = async (req, res, next) => {
  try {
    const stats = await registrationService.getEventStats(req.params.eventId);
    successResponse(res, stats, 'Statistics retrieved');
  } catch (err) {
    next(err);
  }
};

/**
 * Cancel registration
 */
exports.cancelRegistration = async (req, res, next) => {
  try {
    const result = await registrationService.cancelRegistration(
      req.params.registrationId,
      { id: req.user.id, ip: req.ip, userAgent: req.headers['user-agent'] }
    );
    successResponse(res, result, 'Registration cancelled');
  } catch (err) {
    next(err);
  }
};

/**
 * Update audition status
 */
exports.updateAuditionStatus = async (req, res, next) => {
  try {
    const registration = await registrationService.updateAuditionStatus(
      req.params.registrationId,
      req.body,
      { id: req.user.id, roles: req.user.roles, ip: req.ip, userAgent: req.headers['user-agent'] }
    );
    successResponse(res, registration, 'Audition status updated');
  } catch (err) {
    next(err);
  }
};

/**
 * List pending auditions for a club
 */
exports.listPendingAuditions = async (req, res, next) => {
  try {
    const registrations = await registrationService.listPendingAuditions(
      req.params.clubId,
      req.query.eventId
    );
    successResponse(res, registrations, 'Pending auditions retrieved');
  } catch (err) {
    next(err);
  }
};
