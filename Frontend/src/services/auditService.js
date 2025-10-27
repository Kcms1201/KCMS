import api from './api';

const auditService = {
  // List audit logs with filtering
  list: async (params = {}) => {
    const response = await api.get('/audit', { params });
    // Backend: successResponse(res, { total, page, limit, items })
    return response.data;
  },

  // Get audit statistics
  getStatistics: async (params = {}) => {
    const response = await api.get('/audit/statistics', { params });
    // Backend: successResponse(res, { statistics })
    return response.data;
  },

  // Get recent critical/high severity logs
  getRecentCritical: async (limit = 20) => {
    const response = await api.get('/audit/critical', { params: { limit } });
    // Backend: successResponse(res, { logs })
    return response.data;
  },

  // Get user activity logs
  getUserActivity: async (userId, params = {}) => {
    const response = await api.get(`/audit/user/${userId}`, { params });
    // Backend: successResponse(res, { total, page, limit, items })
    return response.data;
  },

  // Export audit logs to CSV (Workplan Gap Fix - uses reports CSV endpoint)
  exportCSV: async (params = {}) => {
    const response = await api.get('/reports/export/csv/audit-logs', {
      params,
      responseType: 'blob' // Important for file download
    });
    return response.data;
  }
};

export default auditService;
