import api from './api';

const registrationService = {
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
   * Get all registrations for an event (for managers)
   */
  getEventRegistrations: (eventId, filters = {}) => {
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
  getClubPendingRegistrations: (clubId, eventId = null) => {
    const params = eventId ? { eventId } : {};
    return api.get(`/clubs/${clubId}/pending-registrations`, { params });
  },

  /**
   * Get pending auditions for a club
   */
  getPendingAuditions: (clubId, eventId = null) => {
    const params = eventId ? { eventId } : {};
    return api.get(`/clubs/${clubId}/pending-auditions`, { params });
  },

  /**
   * Update audition status
   */
  updateAuditionStatus: (registrationId, data) => {
    return api.post(`/registrations/${registrationId}/audition`, data);
  }
};

export default registrationService;
