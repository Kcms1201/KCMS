import api from './api';

const reportService = {
  // Get dashboard statistics (Coordinator/Admin only)
  getDashboard: async () => {
    const response = await api.get('/reports/dashboard');
    return response.data;
  },

  // Get club activity report data (Coordinator/Admin only)
  getClubActivity: async (params = {}) => {
    // If format is excel, request blob response
    const config = params.format === 'excel' 
      ? { params, responseType: 'blob' }
      : { params };
    
    const response = await api.get('/reports/club-activity', config);
    return params.format === 'excel' ? response : response.data;
  },

  // Get NAAC/NBA report data (Admin only)
  getNaacNba: async (year) => {
    const response = await api.get('/reports/naac-nba', {
      params: { year }
    });
    return response.data;
  },

  // Get annual report data (Admin only)
  getAnnual: async (year) => {
    const response = await api.get('/reports/annual', {
      params: { year }
    });
    return response.data;
  },

  // Get audit logs (Admin only)
  getAuditLogs: async (params = {}) => {
    const response = await api.get('/reports/audit-logs', { params });
    return response.data;
  },

  // Generate club activity report PDF (Coordinator/Admin only)
  generateClubActivityReport: async (clubId, year) => {
    // ✅ FIX: Backend route is GET, not POST (see report.routes.js Line 53)
    const response = await api.get(
      `/reports/clubs/${clubId}/activity/${year}`,
      { responseType: 'blob' }
    );
    return response;
  },

  // Generate NAAC report PDF (Admin only)
  generateNAACReport: async (year) => {
    const response = await api.post(
      `/reports/naac/${year}`,
      {},
      { responseType: 'blob' }
    );
    return response;
  },

  // Generate annual report PDF (Admin only)
  generateAnnualReport: async (year) => {
    const response = await api.post(
      `/reports/annual/${year}`,
      {},
      { responseType: 'blob' }
    );
    return response;
  },

  // Generate attendance report PDF (Coordinator/Admin only)
  generateAttendanceReport: async (eventId) => {
    const response = await api.post(
      `/reports/attendance/${eventId}`,
      {},
      { responseType: 'blob' }
    );
    return response;
  },

  // Helper function to download blob response as file
  downloadBlob: (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};

export default reportService;
