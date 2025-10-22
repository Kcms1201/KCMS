//src/modules/document/document.service.js
const mongoose = require('mongoose');
const { Document } = require('./document.model');
const cloudinary   = require('../../utils/cloudinary');
const auditService = require('../audit/audit.service');
const notificationService = require('../notification/notification.service');
const { Membership } = require('../club/membership.model');

class DocumentService {
  /**
   * Upload one or more files for a club.
   * @param {string} clubId
   * @param {object} userContext { id, ip, userAgent }
   * @param {Array<File>} files
   * @param {object} opts { album, tags }
   */
  async uploadFiles(clubId, userContext, files, { album, tags }) {
    const docs = [];

    for (const file of files) {
      // Check for duplicate filename in same album
      const existingDoc = await Document.findOne({
        club: clubId,
        album: album,
        'metadata.filename': file.originalname
      });

      if (existingDoc) {
        console.log(`⚠️ Skipping duplicate file: ${file.originalname}`);
        continue; // Skip this file
      }

      const ext = file.mimetype.split('/')[1].toLowerCase();
      let type, url, thumbUrl;

      // Image upload & thumbnail
      if (['jpeg','jpg','png','webp'].includes(ext)) {
        type = 'photo';
        const img = await cloudinary.uploadImage(file.path, {
          folder: `clubs/${clubId}/photos`,
          transformation: [{ width: 1024, crop: 'limit' }]
        });
        url = img.secure_url;
        const thumb = await cloudinary.uploadImage(file.path, {
          folder: `clubs/${clubId}/photos/thumbs`,
          transformation: [{ width: 300, crop: 'limit' }]
        });
        thumbUrl = thumb.secure_url;
      }
      // Document upload
      else if (['pdf','msword','vnd.openxmlformats-officedocument.wordprocessingml.document']
               .includes(file.mimetype)) {
        type = 'document';
        const docRes = await cloudinary.uploadFile(file.path, {
          folder: `clubs/${clubId}/docs`
        });
        url = docRes.secure_url;
      }
      else {
        const err = new Error('Unsupported file type');
        err.statusCode = 400;
        throw err;
      }

      // Persist metadata with explicit storageType
      const doc = await Document.create({
        club: clubId,
        album,
        type,
        storageType: 'cloudinary', // Explicitly set for counting
        url,
        thumbUrl,
        metadata: {
          filename: file.originalname,
          size: file.size,
          mimeType: file.mimetype
        },
        uploadedBy: userContext.id,
        tags
      });
      docs.push(doc);

      // Audit log
      await auditService.log({
        user: userContext.id,
        action: 'DOCUMENT_UPLOAD',
        target: `Document:${doc._id}`,
        newValue: doc.toObject(),
        ip: userContext.ip,
        userAgent: userContext.userAgent
      });

      // Notify club core team
      const cores = await Membership.find({
        club: clubId,
        status: 'approved'
      }).distinct('user');
      await Promise.all(
        cores.map(uid =>
          notificationService.create({
            user: uid,
            type: 'approval_required',  // or define 'media_uploaded'
            payload: { documentId: doc._id, clubId },
            priority: 'MEDIUM'
          })
        )
      );
    }

    return docs;
  }

  /**
   * List documents with optional filters.
   */
  async listDocuments(clubId, userContext, filters) {
    const { type, album, year, page = 1, limit = 20 } = filters;
    const query = { club: clubId };
    if (type)  query.type = type;
    if (album) query.album = album;
    if (year)  query.createdAt = {
      $gte: new Date(`${year}-01-01`),
      $lt:  new Date(`${year+1}-01-01`)
    };
    const skip = (page - 1) * limit;
    const [total, items] = await Promise.all([
      Document.countDocuments(query),
      Document.find(query)
        .populate('club', 'name logo')
        .populate('uploadedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
    ]);
    return { total, page, limit, items };
  }

  /**
   * Get a single document to download or view.
   */
  async getDocument(docId, clubId) {
    // Try to find with club match first
    let doc = await Document.findOne({ _id: docId, club: clubId });
    
    // If not found, try without club filter (for backward compatibility)
    if (!doc) {
      doc = await Document.findById(docId);
    }
    
    if (!doc) {
      const err = new Error('Document not found');
      err.statusCode = 404;
      throw err;
    }
    return doc;
  }

  /**
   * Delete a document (soft-delete in DB & Cloudinary if desired).
   */
  async deleteDocument(docId, clubId, userContext) {
    console.log('=== DELETE SERVICE DEBUG ===');
    console.log('docId received:', docId, 'type:', typeof docId);
    console.log('clubId received:', clubId, 'type:', typeof clubId);
    console.log('userContext:', userContext);
    
    // First, check if document exists at all
    const existingDoc = await Document.findById(docId);
    
    if (!existingDoc) {
      console.error(`❌ DELETE FAILED: Document ${docId} does not exist in database`);
      const err = new Error(`Document not found. ID: ${docId}`);
      err.statusCode = 404;
      throw err;
    }
    
    // Check if document has a club field
    if (!existingDoc.club) {
      console.error(`❌ DELETE FAILED: Document ${docId} has no club field!`);
      console.error(`   Document data:`, existingDoc);
      const err = new Error(`Document is corrupted - missing club field. ID: ${docId}`);
      err.statusCode = 500;
      throw err;
    }
    
    // Check if document belongs to the specified club
    const docClubId = existingDoc.club.toString();
    const requestedClubId = clubId ? clubId.toString() : null;
    
    if (!requestedClubId) {
      console.error(`❌ DELETE FAILED: No clubId provided in request`);
      const err = new Error(`Club ID is required for deletion`);
      err.statusCode = 400;
      throw err;
    }
    
    if (docClubId !== requestedClubId) {
      console.error(`❌ DELETE FAILED: Club mismatch!`);
      console.error(`   Document ID: ${docId}`);
      console.error(`   Document belongs to club: ${docClubId}`);
      console.error(`   Requested club: ${requestedClubId}`);
      console.error(`   User: ${userContext.id}`);
      const err = new Error(`Document does not belong to this club. Document club: ${docClubId}, Requested club: ${requestedClubId}`);
      err.statusCode = 403;
      throw err;
    }
    
    console.log(`✅ DELETE: Document ${docId} belongs to club ${clubId}, proceeding with deletion...`);
    
    // Now delete the document
    const doc = await Document.findOneAndDelete({ _id: docId, club: clubId });
    if (!doc) {
      const err = new Error(`Failed to delete document. ID: ${docId}`);
      err.statusCode = 500;
      throw err;
    }

    // Audit log
    await auditService.log({
      user: userContext.id,
      action: 'DOCUMENT_DELETE',
      target: `Document:${docId}`,
      oldValue: doc.toObject(),
      ip: userContext.ip,
      userAgent: userContext.userAgent
    });

    // Notify core team
    const cores = await Membership.find({
      club: clubId,
      status: 'approved'
    }).distinct('user');
    await Promise.all(
      cores.map(uid =>
        notificationService.create({
          user: uid,
          type: 'system_maintenance', // or 'media_deleted'
          payload: { documentId: docId, clubId },
          priority: 'HIGH'
        })
      )
    );

    return;
  }

  /**
   * Create a new album
   */
  async createAlbum(clubId, albumName, description, userContext, eventId = null) {
    // Check if album already exists
    const existingAlbum = await Document.findOne({ 
      club: clubId, 
      album: albumName 
    });
    
    if (existingAlbum) {
      const err = new Error('Album already exists');
      err.statusCode = 409;
      throw err;
    }

    // Create a placeholder document to represent the album
    const albumData = {
      club: clubId,
      album: albumName,
      type: 'album',
      url: '', // No URL for album (now optional for album type)
      metadata: {
        filename: `${albumName} Album`,
        size: 0,
        mimeType: 'album/folder',
        description
      },
      uploadedBy: userContext.id
    };

    // Add event link if provided
    if (eventId) {
      albumData.event = eventId;
    }

    const albumDoc = await Document.create(albumData);

    await auditService.log({
      user: userContext.id,
      action: 'ALBUM_CREATE',
      target: `Album:${albumName}`,
      newValue: { albumName, description, eventId },
      ip: userContext.ip,
      userAgent: userContext.userAgent
    });

    return albumDoc;
  }

  /**
   * Get albums for a club
   */
  async getAlbums(clubId) {
    const albums = await Document.aggregate([
      { 
        $match: { 
          club: new mongoose.Types.ObjectId(clubId),
          type: { $ne: 'album' } // Exclude album metadata documents
        } 
      },
      {
        $group: {
          _id: '$album',
          count: { $sum: 1 },
          lastUpload: { $max: '$createdAt' },
          type: { $first: '$type' }
        }
      },
      { $sort: { lastUpload: -1 } }
    ]);

    return albums.map(album => ({
      name: album._id,
      count: album.count,
      lastUpload: album.lastUpload,
      type: album.type
    }));
  }

  /**
   * Bulk upload files
   */
  async bulkUpload(clubId, userContext, files, { album, tags }) {
    if (files.length > 10) {
      const err = new Error('Maximum 10 files allowed per upload');
      err.statusCode = 400;
      throw err;
    }

 
    const currentPhotoCount = await Document.countDocuments({
      club: clubId,
      type: 'photo',
      storageType: 'cloudinary'
    });

    const photoFiles = files.filter(f => f.mimetype?.startsWith('image/'));
    const newPhotoCount = currentPhotoCount + photoFiles.length;

    if (newPhotoCount > 10) {
      const remaining = 10 - currentPhotoCount;
      const err = new Error(
        `Cloudinary photo limit reached! You can only upload ${remaining} more photo(s). ` +
        `Use Google Drive links for additional photos. Current: ${currentPhotoCount}/10`
      );
      err.statusCode = 400;
      err.code = 'PHOTO_LIMIT_EXCEEDED';
      err.details = {
        limit: 10,
        current: currentPhotoCount,
        attempting: photoFiles.length,
        remaining: Math.max(0, remaining)
      };
      throw err;
    }

    const docs = await this.uploadFiles(clubId, userContext, files, { album, tags });
    
    // Check if album is linked to an event and update event completion
    if (album) {
      console.log(`📸 Checking album linkage for: "${album}"`);
      
      const albumDoc = await Document.findOne({ 
        club: clubId, 
        type: 'album',
        album: album 
      });
      
      console.log('📁 Album doc found:', albumDoc ? {
        _id: albumDoc._id,
        album: albumDoc.album,
        event: albumDoc.event,
        hasEvent: !!albumDoc.event
      } : 'NOT FOUND');
      
      if (albumDoc && albumDoc.event) {
        console.log(`🔗 Linking ${docs.length} photos to event: ${albumDoc.event}`);
        
        // Update all uploaded documents with event link
        const updateResult = await Document.updateMany(
          { _id: { $in: docs.map(d => d._id) } },
          { $set: { event: albumDoc.event } }
        );
        
        console.log(`✅ Updated ${updateResult.modifiedCount} documents with event link`);
        
        // Count photos for this event
        const photoCount = await Document.countDocuments({
          event: albumDoc.event,
          type: 'photo'
        });
        
        console.log(`📊 Total photos for event: ${photoCount}`);
        
        // Update event completion checklist
        if (photoCount >= 5) {
          const { Event } = require('../event/event.model');
          const eventUpdate = await Event.findByIdAndUpdate(
            albumDoc.event,
            { 'completionChecklist.photosUploaded': true },
            { new: true }
          );
          console.log(`✅ Event completion updated: photosUploaded = true`);
          console.log(`📋 Event checklist:`, eventUpdate.completionChecklist);
        } else {
          console.log(`⚠️ Not enough photos yet: ${photoCount}/5`);
        }
      } else {
        console.log('⚠️ Album not linked to event or album doc not found');
      }
    }
    
    // Notify about bulk upload
    await notificationService.create({
      user: userContext.id,
      type: 'system_maintenance',
      payload: { 
        action: 'bulk_upload',
        clubId, 
        count: docs.length,
        album 
      },
      priority: 'MEDIUM'
    });

    return docs;
  }

  /**
   * Tag members in photos
   */
  async tagMembers(docId, memberIds, userContext) {
    const doc = await Document.findById(docId);
    if (!doc) {
      const err = new Error('Document not found');
      err.statusCode = 404;
      throw err;
    }

    if (doc.type !== 'photo') {
      const err = new Error('Only photos can be tagged');
      err.statusCode = 400;
      throw err;
    }

    // Validate member IDs
    const validMembers = await Membership.find({
      _id: { $in: memberIds },
      club: doc.club,
      status: 'approved'
    });

    doc.tags = validMembers.map(m => m.user);
    await doc.save();

    await auditService.log({
      user: userContext.id,
      action: 'DOCUMENT_TAG',
      target: `Document:${docId}`,
      newValue: { taggedMembers: memberIds },
      ip: userContext.ip,
      userAgent: userContext.userAgent
    });

    return doc;
  }

  /**
   * Get document analytics
   */
  async getAnalytics(clubId, period = 'month') {
    const now = new Date();
    let startDate;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    const [
      totalDocuments,
      documentsByType,
      documentsByAlbum,
      uploadTrend,
      totalSize
    ] = await Promise.all([
      Document.countDocuments({ club: clubId }),
      
      Document.aggregate([
        { $match: { club: new mongoose.Types.ObjectId(clubId) } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      
      Document.aggregate([
        { $match: { club: new mongoose.Types.ObjectId(clubId) } },
        { $group: { _id: '$album', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      
      Document.aggregate([
        { $match: { 
          club: new mongoose.Types.ObjectId(clubId),
          createdAt: { $gte: startDate }
        }},
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      
      Document.aggregate([
        { $match: { club: new mongoose.Types.ObjectId(clubId) } },
        { $group: { _id: null, totalSize: { $sum: '$metadata.size' } } }
      ])
    ]);

    return {
      totalDocuments,
      documentsByType: documentsByType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      topAlbums: documentsByAlbum,
      uploadTrend,
      totalSize: totalSize[0]?.totalSize || 0
    };
  }

  /**
   * Search documents within a club
   */
  async searchDocuments(clubId, query, filters = {}) {
    const searchQuery = { club: clubId };
    
    if (query) {
      const regex = new RegExp(query, 'i');
      searchQuery.$or = [
        { 'metadata.filename': regex },
        { album: regex }
      ];
    }

    // Apply filters
    if (filters.type) searchQuery.type = filters.type;
    if (filters.album) searchQuery.album = filters.album;
    if (filters.uploadedBy) searchQuery.uploadedBy = filters.uploadedBy;

    return Document.find(searchQuery)
      .populate('uploadedBy', 'profile.name')
      .populate('tags', 'profile.name')
      .sort({ createdAt: -1 });
  }

  /**
   * Download document (generate secure URL)
   */
  async getDownloadUrl(docId, clubId, userContext) {
    const doc = await Document.findOne({ _id: docId, club: clubId });
    if (!doc) {
      const err = new Error('Document not found');
      err.statusCode = 404;
      throw err;
    }

    // Log download
    await auditService.log({
      user: userContext.id,
      action: 'DOCUMENT_DOWNLOAD',
      target: `Document:${docId}`,
      ip: userContext.ip,
      userAgent: userContext.userAgent
    });
 
    // For Cloudinary, generate signed URL for download
    const signedUrl = cloudinary.url(doc.url, {
      sign_url: true,
      type: 'authenticated',
      expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour
    });

    return {
      downloadUrl: signedUrl,
      filename: doc.metadata.filename,
      size: doc.metadata.size
    };
  }

  /**
   * Utility: Link existing photos to events based on album names
   * This fixes photos uploaded before event linking was implemented
   */
  async linkPhotosToEvents(clubId) {
    console.log('🔧 Starting to link existing photos to events...');
    
    // Find all album documents that have event links
    const albumDocs = await Document.find({
      club: clubId,
      type: 'album',
      event: { $exists: true, $ne: null }
    });
    
    console.log(`📁 Found ${albumDocs.length} albums with event links`);
    
    let totalLinked = 0;
    
    for (const albumDoc of albumDocs) {
      console.log(`\n🔗 Processing album: "${albumDoc.album}" → Event: ${albumDoc.event}`);
      
      // Find all photos in this album that don't have event link yet
      const unlinkedPhotos = await Document.find({
        club: clubId,
        album: albumDoc.album,
        type: 'photo',
        $or: [{ event: { $exists: false } }, { event: null }]
      });
      
      if (unlinkedPhotos.length > 0) {
        console.log(`  📸 Found ${unlinkedPhotos.length} unlinked photos`);
        
        // Link them to the event
        const result = await Document.updateMany(
          {
            club: clubId,
            album: albumDoc.album,
            type: 'photo',
            $or: [{ event: { $exists: false } }, { event: null }]
          },
          { $set: { event: albumDoc.event } }
        );
        
        console.log(`  ✅ Linked ${result.modifiedCount} photos to event`);
        totalLinked += result.modifiedCount;
        
        // Update event completion
        const photoCount = await Document.countDocuments({
          event: albumDoc.event,
          type: 'photo'
        });
        
        console.log(`  📊 Total photos for this event: ${photoCount}`);
        
        if (photoCount >= 5) {
          const { Event } = require('../event/event.model');
          await Event.findByIdAndUpdate(albumDoc.event, {
            'completionChecklist.photosUploaded': true
          });
          console.log(`  ✅ Event completion updated: photosUploaded = true`);
        }
      } else {
        console.log(`  ℹ️ All photos already linked`);
      }
    }
    
    console.log(`\n🎉 Complete! Linked ${totalLinked} photos to events`);
    return { totalLinked, albumsProcessed: albumDocs.length };
  }

  /**
   * Get storage statistics for a club
   */
  async getStorageStats(clubId) {
    const folder = `clubs/${clubId}`;
    return await cloudinary.getStorageStats(folder);
  }

  /**
   * Find duplicate images in club storage
   */
  async findDuplicates(clubId) {
    const folder = `clubs/${clubId}`;
    return await cloudinary.findDuplicates(folder);
  }

  /**
   * Generate upload signature for direct client uploads
   */
  async getUploadSignature(clubId, album) {
    const folder = `clubs/${clubId}/photos`;
    const options = album ? { tags: [album] } : {};
    return cloudinary.generateUploadSignature(folder, options);
  }

  /**
   * Add Google Drive link for additional photos
   * Bypasses the 10 photo Cloudinary limit
   */
  async addDriveLink(clubId, userContext, { album, driveUrl, folderName, photoCount, description }) {
    // Extract folder ID from Drive URL
    // Supports formats:
    // - https://drive.google.com/drive/folders/FOLDER_ID
    // - https://drive.google.com/drive/u/0/folders/FOLDER_ID
    let folderId = null;
    
    if (driveUrl) {
      const folderMatch = driveUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
      if (folderMatch) {
        folderId = folderMatch[1];
      } else {
        const err = new Error('Invalid Google Drive URL. Please provide a folder link.');
        err.statusCode = 400;
        throw err;
      }
    }

    // Check if album exists, create if not
    let albumDoc = await Document.findOne({
      club: clubId,
      type: 'album',
      album: album
    });

    if (!albumDoc) {
      albumDoc = await Document.create({
        club: clubId,
        type: 'album',
        album: album,
        url: driveUrl,
        storageType: 'drive',
        uploadedBy: userContext.id
      });
    }

    // Create drive link document
    const driveDoc = await Document.create({
      club: clubId,
      album: album,
      type: 'photo',
      storageType: 'drive',
      url: driveUrl,
      driveMetadata: {
        folderId,
        folderName: folderName || album,
        photoCount: photoCount || 0,
        description: description || `Google Drive folder for ${album}`
      },
      metadata: {
        filename: folderName || 'Google Drive Folder'
      },
      uploadedBy: userContext.id,
      event: albumDoc.event // Link to event if album has one
    });

    // Log the action
    await auditService.log({
      user: userContext.id,
      action: 'DRIVE_LINK_ADDED',
      target: `Document:${driveDoc._id}`,
      details: { album, folderName, photoCount },
      ip: userContext.ip,
      userAgent: userContext.userAgent
    });

    console.log(`🔗 Drive link added for album "${album}": ${photoCount || 0} photos`);

    return driveDoc;
  }

  /**
   * Get club's photo quota status
   */
  async getPhotoQuota(clubId) {
    const cloudinaryCount = await Document.countDocuments({
      club: clubId,
      type: 'photo',
      storageType: 'cloudinary'
    });

    const driveCount = await Document.countDocuments({
      club: clubId,
      type: 'photo',
      storageType: 'drive'
    });

    const totalDrivePhotos = await Document.aggregate([
      {
        $match: {
          club: new mongoose.Types.ObjectId(clubId),
          type: 'photo',
          storageType: 'drive'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$driveMetadata.photoCount' }
        }
      }
    ]);

    return {
      cloudinary: {
        used: cloudinaryCount,
        limit: 10,
        remaining: Math.max(0, 10 - cloudinaryCount),
        percentage: Math.round((cloudinaryCount / 10) * 100)
      },
      drive: {
        linkCount: driveCount,
        estimatedPhotos: totalDrivePhotos[0]?.total || 0
      },
      total: {
        photos: cloudinaryCount + (totalDrivePhotos[0]?.total || 0)
      }
    };
  }
}

module.exports = new DocumentService();