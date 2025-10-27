import api from './api';

const recruitmentService = {
  // Create Recruitment
  create: async (data) => {
    const response = await api.post('/recruitments', data);
    return response.data;
  },

  // Update Recruitment
  update: async (id, data) => {
    const response = await api.patch(`/recruitments/${id}`, data);
    return response.data;
  },

  // Change Status
  changeStatus: async (id, action) => {
    const response = await api.post(`/recruitments/${id}/status`, { action });
    return response.data;
  },

  // List Recruitments
  list: async (params = {}) => {
    const response = await api.get('/recruitments', { params });
    return response.data;
  },

  // Get By ID
  getById: async (id) => {
    const response = await api.get(`/recruitments/${id}`);
    return response.data;
  },

  // Apply
  apply: async (id, data) => {
    const response = await api.post(`/recruitments/${id}/apply`, data);
    return response.data;
  },

  // List Applications
  listApplications: async (id, params = {}) => {
    const response = await api.get(`/recruitments/${id}/applications`, { params });
    return response.data;
  },

  // Review Application
  review: async (id, appId, data) => {
    const response = await api.patch(`/recruitments/${id}/applications/${appId}`, data);
    return response.data;
  },

  // Bulk Review
  bulkReview: async (id, data) => {
    const response = await api.patch(`/recruitments/${id}/applications`, data);
    return response.data;
  },
};

export default recruitmentService;
