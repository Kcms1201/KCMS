import api from './api';

const meetingService = {
  // Create meeting
  createMeeting: async (clubId, meetingData) => {
    const response = await api.post(`/clubs/${clubId}/meetings`, meetingData);
    return response.data;
  },

  // List meetings for a club
  listMeetings: async (clubId, params = {}) => {
    const response = await api.get(`/clubs/${clubId}/meetings`, { params });
    return response.data;
  },

  // Get single meeting
  getMeeting: async (meetingId) => {
    const response = await api.get(`/clubs/meetings/${meetingId}`);
    return response.data;
  },

  // Mark attendance (President/VicePresident only)
  markAttendance: async (meetingId, attendees) => {
    const response = await api.post(`/clubs/meetings/${meetingId}/attendance`, { attendees });
    return response.data;
  },

  // Complete meeting
  completeMeeting: async (meetingId, notes) => {
    const response = await api.patch(`/clubs/meetings/${meetingId}/complete`, { notes });
    return response.data;
  },

  // Cancel meeting
  cancelMeeting: async (meetingId) => {
    const response = await api.patch(`/clubs/meetings/${meetingId}/cancel`);
    return response.data;
  },

  // Update meeting
  updateMeeting: async (meetingId, updates) => {
    const response = await api.patch(`/clubs/meetings/${meetingId}`, updates);
    return response.data;
  }
};

export default meetingService;
