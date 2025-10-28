// src/modules/document/document.controller.js
const svc = require('./document.service');
const { successResponse } = require('../../utils/response');

exports.upload = async (req, res, next) => {
  try {
    const docs = await svc.uploadFiles(
      req.params.clubId,
      { id: req.user.id, ip: req.ip, userAgent: req.headers['user-agent'] },
      req.files || [],
      req.body  // album & tags
    );
    successResponse(res, { documents: docs }, 'Files uploaded');
  } catch (err) {
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    const data = await svc.listDocuments(
      req.params.clubId,
      { id: req.user.id, ip: req.ip, userAgent: req.headers['user-agent'] },
      req.query
    );
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
};

exports.download = async (req, res, next) => {
  try {
    const doc = await svc.getDocument(req.params.docId, req.params.clubId);
    res.redirect(doc.url);
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    // Extract clubId from URL (middleware fallback)
    let clubId = req.params.clubId;
    
    // If not in params, extract from baseUrl
    if (!clubId && req.baseUrl) {
      const match = req.baseUrl.match(/\/clubs\/([a-f0-9]+)/i);
      if (match) {
        clubId = match[1];
        console.log('🔧 Extracted clubId from baseUrl:', clubId);
      }
    }
    
    // If still not found, try originalUrl
    if (!clubId && req.originalUrl) {
      const match = req.originalUrl.match(/\/clubs\/([a-f0-9]+)/i);
      if (match) {
        clubId = match[1];
        console.log('🔧 Extracted clubId from originalUrl:', clubId);
      }
    }
    
    console.log('=== DELETE CONTROLLER DEBUG ===');
    console.log('Final clubId:', clubId);
    console.log('req.params.docId:', req.params.docId);
    console.log('req.baseUrl:', req.baseUrl);
    console.log('req.originalUrl:', req.originalUrl);
    
    await svc.deleteDocument(
      req.params.docId,
      clubId,
      { id: req.user.id, ip: req.ip, userAgent: req.headers['user-agent'] }
    );
    successResponse(res, null, 'Document deleted');
  } catch (err) {
    next(err);
  }
};

// Create Album
exports.createAlbum = async (req, res, next) => {
  try {
    console.log('📁 CREATE ALBUM REQUEST:');
    console.log('  Club ID:', req.params.clubId);
    console.log('  Album Name:', req.body.name);
    console.log('  Description:', req.body.description);
    console.log('  Event ID:', req.body.eventId);
    console.log('  User:', req.user.id);
    
    const album = await svc.createAlbum(
      req.params.clubId,
      req.body.name,
      req.body.description,
      { id: req.user.id, ip: req.ip, userAgent: req.headers['user-agent'] },
      req.body.eventId // Optional: Link album to event
    );
    
    console.log('✅ Album created successfully:', album._id);
    successResponse(res, { album }, 'Album created successfully');
  } catch (err) {
    console.error('❌ Album creation failed:', err.message);
    next(err);
  }
};

// Get Albums
exports.getAlbums = async (req, res, next) => {
  try {
    console.log('📚 GET ALBUMS REQUEST:');
    console.log('  Club ID:', req.params.clubId);
    
    const albums = await svc.getAlbums(req.params.clubId);
    
    console.log('✅ Found', albums.length, 'albums');
    albums.forEach(album => {
      console.log(`   - "${album.name}" (ID: ${album._id})`);
    });
    
    successResponse(res, { albums }, 'Albums retrieved successfully');
  } catch (err) {
    console.error('❌ Get albums failed:', err.message);
    next(err);
  }
};

// Bulk Upload
exports.bulkUpload = async (req, res, next) => {
  try {
    const documents = await svc.bulkUpload(
      req.params.clubId,
      { id: req.user.id, ip: req.ip, userAgent: req.headers['user-agent'] },
      req.files,
      { album: req.body.album, tags: req.body.tags }
    );
    successResponse(res, { documents }, 'Files uploaded successfully');
  } catch (err) {
    next(err);
  }
};

// Tag Members in Photo
exports.tagMembers = async (req, res, next) => {
  try {
    const document = await svc.tagMembers(
      req.params.docId,
      req.body.memberIds,
      { id: req.user.id, ip: req.ip, userAgent: req.headers['user-agent'] }
    );
    successResponse(res, { document }, 'Members tagged successfully');
  } catch (err) {
    next(err);
  }
};

// Get Document Analytics
exports.getAnalytics = async (req, res, next) => {
  try {
    const analytics = await svc.getAnalytics(
      req.params.clubId,
      req.query.period
    );
    successResponse(res, { analytics }, 'Document analytics retrieved');
  } catch (err) {
    next(err);
  }
};

// Search Documents
exports.searchDocuments = async (req, res, next) => {
  try {
    const documents = await svc.searchDocuments(
      req.params.clubId,
      req.query.q,
      req.query
    );
    successResponse(res, { documents }, 'Document search completed');
  } catch (err) {
    next(err);
  }
};

// Get Download URL
exports.getDownloadUrl = async (req, res, next) => {
  try {
    const downloadData = await svc.getDownloadUrl(
      req.params.docId,
      req.params.clubId,
      { id: req.user.id, ip: req.ip, userAgent: req.headers['user-agent'] }
    );
    successResponse(res, downloadData, 'Download URL generated');
  } catch (err) {
    next(err);
  }
};

// Link Existing Photos to Events (Utility/Fix)
exports.linkPhotosToEvents = async (req, res, next) => {
  try {
    const result = await svc.linkPhotosToEvents(req.params.clubId);
    successResponse(res, result, 'Photos linked to events successfully');
  } catch (err) {
    next(err);
  }
};

// Get Storage Statistics for Club
exports.getStorageStats = async (req, res, next) => {
  try {
    const stats = await svc.getStorageStats(req.params.clubId);
    successResponse(res, stats, 'Storage statistics retrieved');
  } catch (err) {
    next(err);
  }
};

// Find Duplicate Images
exports.findDuplicates = async (req, res, next) => {
  try {
    const duplicates = await svc.findDuplicates(req.params.clubId);
    successResponse(res, { duplicates }, 'Duplicate detection completed');
  } catch (err) {
    next(err);
  }
};

// Generate Upload Signature for Direct Upload
exports.getUploadSignature = async (req, res, next) => {
  try {
    const { album } = req.body;
    const signature = await svc.getUploadSignature(req.params.clubId, album);
    successResponse(res, signature, 'Upload signature generated');
  } catch (err) {
    next(err);
  }
};

// Add Google Drive Link
exports.addDriveLink = async (req, res, next) => {
  try {
    const { album, driveUrl, folderName, photoCount, description } = req.body;
    const driveDoc = await svc.addDriveLink(
      req.params.clubId,
      { id: req.user.id, ip: req.ip, userAgent: req.headers['user-agent'] },
      { album, driveUrl, folderName, photoCount, description }
    );
    successResponse(res, { document: driveDoc }, 'Drive link added successfully');
  } catch (err) {
    next(err);
  }
};

// Get Photo Quota Status
exports.getPhotoQuota = async (req, res, next) => {
  try {
    const quota = await svc.getPhotoQuota(req.params.clubId);
    successResponse(res, quota, 'Photo quota retrieved');
  } catch (err) {
    next(err);
  }
};