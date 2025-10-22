// Frontend/src/services/eventRegistrationService.js
import api from './api';

const eventRegistrationService = {
  /**
   * Register for an event
   */
  register: (eventId, data) => {
    return api.post(`/events/${eventId}/register`, data);
  },

  /**
   * Get my registration for an event
   */
  getMyRegistration: (eventId) => {
    return api.get(`/events/${eventId}/my-registration`);
  },

  /**
   * List all registrations for an event
   */
  listEventRegistrations: (eventId, filters = {}) => {
    return api.get(`/events/${eventId}/registrations`, { params: filters });
  },

  /**
   * Get registration statistics
   */
  getEventStats: (eventId) => {
    return api.get(`/events/${eventId}/registration-stats`);
  },

  /**
   * Review performer registration (approve/reject)
   */
  reviewRegistration: (registrationId, decision) => {
    return api.post(`/registrations/${registrationId}/review`, decision);
  },

  /**
   * Cancel my registration
   */
  cancelRegistration: (registrationId) => {
    return api.delete(`/registrations/${registrationId}`);
  },

  /**
   * Get pending registrations for a club
   */
  listClubPendingRegistrations: (clubId, eventId = null) => {
    return api.get(`/clubs/${clubId}/pending-registrations`, { 
      params: eventId ? { eventId } : {} 
    });
  },

  /**
   * Get pending auditions for a club
   */
  listPendingAuditions: (clubId) => {
    return api.get(`/clubs/${clubId}/pending-auditions`);
  },

  /**
   * Update audition status (pass/fail)
   */
  updateAuditionStatus: (registrationId, auditionData) => {
    return api.post(`/registrations/${registrationId}/audition`, auditionData);
  },
};

export default eventRegistrationService;
