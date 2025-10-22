import api from './api';

const analyticsService = {
  // Get member analytics for a club
  getMemberAnalytics: async (clubId, filter = 'all') => {
    try {
      // ✅ FIX: Use correct backend endpoint /api/analytics/clubs/:clubId/members
      const response = await api.get(`/analytics/clubs/${clubId}/members`, {
        params: { filter }
      });
      return response;
    } catch (error) {
      console.error('Failed to fetch member analytics:', error);
      throw error;
    }
  },

  // Get individual member activity
  getMemberActivity: async (clubId, memberId) => {
    try {
      // ✅ FIX: Use correct backend endpoint /api/analytics/clubs/:clubId/members/:userId
      const response = await api.get(`/analytics/clubs/${clubId}/members/${memberId}`);
      return response;
    } catch (error) {
      console.error('Failed to fetch member activity:', error);
      throw error;
    }
  },

  // Export member analytics report
  exportMemberReport: async (clubId, format = 'csv') => {
    try {
      // ✅ FIX: Use correct backend endpoint /api/analytics/clubs/:clubId/export
      const response = await api.get(`/analytics/clubs/${clubId}/export`, {
        params: { format },
        responseType: 'blob'
      });
      return response;
    } catch (error) {
      console.error('Failed to export report:', error);
      throw error;
    }
  },

  // Get club activity summary
  getClubActivitySummary: async (clubId) => {
    try {
      // ✅ FIX: Use correct backend endpoint /api/analytics/clubs/:clubId/summary
      const response = await api.get(`/analytics/clubs/${clubId}/summary`);
      return response;
    } catch (error) {
      console.error('Failed to fetch club activity summary:', error);
      throw error;
    }
  }
};

export default analyticsService;
