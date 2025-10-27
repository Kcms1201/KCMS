import api from './api';

const authService = {
  // Registration
  register: async (data) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  // Verify OTP
  verifyOtp: async (data) => {
    const response = await api.post('/auth/verify-otp', data);
    // Backend returns { data: { token: "..." } }
    if (response.data.data.token) {
      localStorage.setItem('tempToken', response.data.data.token);
    }
    return response.data;
  },

  // Resend OTP (Workplan Gap Fix - Session progress saving)
  resendOtp: async (email) => {
    const response = await api.post('/auth/resend-otp', { email });
    return response.data;
  },

  // Complete Profile
  completeProfile: async (data) => {
    const tempToken = localStorage.getItem('tempToken');
    const response = await api.post('/auth/complete-profile', data, {
      headers: { Authorization: `Bearer ${tempToken}` }
    });
    
    if (response.data.data.accessToken) {
      localStorage.setItem('accessToken', response.data.data.accessToken);
      localStorage.setItem('refreshToken', response.data.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
      localStorage.removeItem('tempToken');
    }
    return response.data;
  },

  // Login
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    if (response.data.data.accessToken) {
      localStorage.setItem('accessToken', response.data.data.accessToken);
      localStorage.setItem('refreshToken', response.data.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
    }
    return response.data;
  },

  // Logout
  logout: async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (error) {
      // Ignore errors - user is logging out anyway
      console.log('Logout API call failed (expected if token expired)');
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  },

  // Logout All Devices
  logoutAll: async () => {
    try {
      await api.post('/auth/logout-all');
    } catch (error) {
      // Ignore errors - user is logging out anyway
      console.log('Logout all API call failed (expected if token expired)');
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  },

  // Forgot Password
  forgotPassword: async (data) => {
    const response = await api.post('/auth/forgot-password', data);
    return response.data;
  },

  // Verify Reset OTP
  verifyReset: async (data) => {
    const response = await api.post('/auth/verify-reset', data);
    return response.data;
  },

  // Reset Password
  resetPassword: async (data) => {
    const response = await api.post('/auth/reset-password', data);
    return response.data;
  },

  // Get current user
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Check if authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('accessToken');
  },
};

export default authService;
