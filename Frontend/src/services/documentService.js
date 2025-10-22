import api from './api';

const documentService = {
  // Upload single or multiple documents (files array required)
  upload: async (clubId, files, metadata = {}) => {
    const formData = new FormData();
    
    // Handle multiple files - Backend expects 'files' field (array)
    if (Array.isArray(files)) {
      files.forEach(file => formData.append('files', file));
    } else {
      formData.append('files', files);
    }
    
    // Add metadata (album, description, etc.)
    Object.keys(metadata).forEach(key => {
      if (metadata[key]) formData.append(key, metadata[key]);
    });

    const response = await api.post(`/clubs/${clubId}/documents/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // List documents with filters (page, limit, type, album, search)
  list: async (clubId, params = {}) => {
    const response = await api.get(`/clubs/${clubId}/documents`, { params });
    return response.data;
  },

  // Download document (returns blob)
  download: async (clubId, docId) => {
    const response = await api.get(`/clubs/${clubId}/documents/${docId}/download`, {
      responseType: 'blob'
    });
    return response;
  },

  // Delete document
  delete: async (clubId, docId) => {
    const response = await api.delete(`/clubs/${clubId}/documents/${docId}`);
    return response.data;
  },

  // Create album
  createAlbum: async (clubId, albumData) => {
    const response = await api.post(`/clubs/${clubId}/documents/albums`, albumData);
    return response.data;
  },

  // Get albums for a club
  getAlbums: async (clubId) => {
    const response = await api.get(`/clubs/${clubId}/documents/albums`);
    return response.data;
  },

  // Bulk upload documents (max 10 files)
  bulkUpload: async (clubId, files, metadata = {}) => {
    const formData = new FormData();
    
    files.forEach(file => formData.append('files', file));
    
    Object.keys(metadata).forEach(key => {
      if (metadata[key]) formData.append(key, metadata[key]);
    });

    const response = await api.post(`/clubs/${clubId}/documents/bulk-upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // Tag members in a document/photo
  tagMembers: async (clubId, docId, memberIds) => {
    const response = await api.patch(`/clubs/${clubId}/documents/${docId}/tag`, {
      memberIds
    });
    return response.data;
  },

  // Get document analytics
  getAnalytics: async (clubId, params = {}) => {
    const response = await api.get(`/clubs/${clubId}/documents/analytics`, { params });
    return response.data;
  },

  // Search documents within a club
  search: async (clubId, params = {}) => {
    const response = await api.get(`/clubs/${clubId}/documents/search`, { params });
    return response.data;
  },

  // Get download URL (for temporary/signed URLs)
  getDownloadUrl: async (clubId, docId) => {
    const response = await api.get(`/clubs/${clubId}/documents/${docId}/download-url`);
    return response.data;
  },

  // Helper: Download blob as file
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

  // Get photo quota status (Cloudinary limit check)
  getPhotoQuota: async (clubId) => {
    const response = await api.get(`/clubs/${clubId}/documents/quota`);
    return response.data;
  },

  // Add Google Drive link for additional photos
  addDriveLink: async (clubId, driveData) => {
    const response = await api.post(`/clubs/${clubId}/documents/drive-link`, driveData);
    return response.data;
  },

  // Link existing photos to events (Utility for admins)
  linkPhotosToEvents: async (clubId, data) => {
    const response = await api.post(`/clubs/${clubId}/documents/link-to-events`, data);
    return response.data;
  },

  // Get storage statistics (Leadership only)
  getStorageStats: async (clubId) => {
    const response = await api.get(`/clubs/${clubId}/documents/storage/stats`);
    return response.data;
  },

  // Find duplicate images (Leadership only)
  findDuplicates: async (clubId) => {
    const response = await api.get(`/clubs/${clubId}/documents/storage/duplicates`);
    return response.data;
  },

  // Get upload signature for direct upload to Cloudinary
  getUploadSignature: async (clubId, uploadData) => {
    const response = await api.post(`/clubs/${clubId}/documents/upload/signature`, uploadData);
    return response.data;
  },
};

export default documentService;
