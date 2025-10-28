import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import documentService from '../../services/documentService';
import clubService from '../../services/clubService';
import eventService from '../../services/eventService';
import { useAuth } from '../../context/AuthContext';
import { 
  FaImage, 
  FaUpload, 
  FaDownload, 
  FaTrash,
  FaFolderPlus,
  FaSearch,
  FaTimes
} from 'react-icons/fa';
import '../../styles/Gallery.css';

function GalleryPage() {
  const { user, clubMemberships } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const eventIdParam = searchParams.get('event');
  const actionParam = searchParams.get('action');
  const clubIdParam = searchParams.get('clubId');
  
  // ✅ Prevent duplicate album creation in React StrictMode
  const albumCreationAttempted = useRef(false);
  
  const [documents, setDocuments] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [selectedAlbum, setSelectedAlbum] = useState(searchParams.get('album') || 'all');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAlbumModal, setShowAlbumModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showDriveLinkModal, setShowDriveLinkModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [eventContext, setEventContext] = useState(null);
  const [photoQuota, setPhotoQuota] = useState(null);
  
  // Form states
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadClubId, setUploadClubId] = useState('');
  const [uploadAlbum, setUploadAlbum] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumDescription, setNewAlbumDescription] = useState('');
  
  // Drive link form states
  const [driveUrl, setDriveUrl] = useState('');
  const [driveFolderName, setDriveFolderName] = useState('');
  const [drivePhotoCount, setDrivePhotoCount] = useState('');
  const [driveDescription, setDriveDescription] = useState('');

  const [clubs, setClubs] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Check if user can upload to selected club
  const canUpload = useMemo(() => {
    if (user?.roles?.global === 'admin') return true;
    if (!uploadClubId) return false;
    
    const membership = clubMemberships?.find(m => 
      (m.club?._id || m.club) === uploadClubId
    );
    
    const coreRoles = ['president', 'vicePresident', 'core', 'secretary', 
                       'treasurer', 'leadPR', 'leadTech'];
    
    return membership && coreRoles.includes(membership.role);
  }, [user, clubMemberships, uploadClubId]);

  useEffect(() => {
    fetchClubs();
  }, []);
  
  // Handle event context and auto-create album
  useEffect(() => {
    if (eventIdParam && clubIdParam && !albumCreationAttempted.current) {
      console.log('📍 useEffect triggered - creating event album');
      albumCreationAttempted.current = true; // ✅ Mark as attempted
      setUploadClubId(clubIdParam);
      handleAutoCreateEventAlbum();
    }
  }, [eventIdParam, clubIdParam]);

  useEffect(() => {
    if (uploadClubId) {
      fetchDocuments();
      fetchAlbums();
      fetchPhotoQuota();
    }
  }, [uploadClubId, selectedAlbum, searchQuery, page]);

  const fetchDocuments = async () => {
    if (!uploadClubId) {
      setDocuments([]);
      return;
    }

    try {
      setLoading(true);
      const params = {
        page,
        limit: 20,
        type: 'photo'
      };

      if (selectedAlbum && selectedAlbum !== 'all') {
        params.album = selectedAlbum;
      }

      if (searchQuery) {
        params.search = searchQuery;
      }

      const response = await documentService.list(uploadClubId, params);
      setDocuments(response.data?.items || []);
      setTotalPages(Math.ceil((response.data?.total || 0) / 20));
    } catch (err) {
      console.error('Error fetching documents:', err);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlbums = async () => {
    console.log('📚 fetchAlbums called, uploadClubId:', uploadClubId);
    
    if (!uploadClubId) {
      console.log('⚠️ No uploadClubId, skipping album fetch');
      setAlbums([]);
      return;
    }

    try {
      console.log('🔄 Fetching albums for club:', uploadClubId);
      const response = await documentService.getAlbums(uploadClubId);
      console.log('📦 Albums response:', response);
      
      // Backend returns { albums: [...] } or { data: { albums: [...] } }
      const albumsList = response.albums || response.data?.albums || [];
      console.log('✅ Setting albums state:', albumsList.length, 'albums');
      albumsList.forEach(album => {
        console.log(`   - "${album.name}"`);
      });
      
      setAlbums(albumsList);
    } catch (err) {
      console.error('❌ Error fetching albums:', err);
      setAlbums([]);
    }
  };

  const fetchPhotoQuota = async () => {
    if (!uploadClubId) {
      setPhotoQuota(null);
      return;
    }

    try {
      const response = await documentService.getPhotoQuota(uploadClubId);
      setPhotoQuota(response.data);
    } catch (err) {
      console.error('Error fetching quota:', err);
      setPhotoQuota(null);
    }
  };

  const fetchClubs = async () => {
    try {
      const response = await clubService.listClubs();
      setClubs(response.data?.clubs || []);
    } catch (err) {
      console.error('Error fetching clubs:', err);
      setClubs([]);
    }
  };
  
  // Auto-create album for event
  const handleAutoCreateEventAlbum = async () => {
    if (!eventIdParam || !clubIdParam) {
      console.error('Missing event ID or club ID');
      return;
    }
    
    try {
      console.log('🔄 Auto-creating album for event:', eventIdParam);
      
      // Fetch event details
      console.log('📡 Fetching event with ID:', eventIdParam);
      const eventRes = await eventService.getById(eventIdParam);
      console.log('📦 Raw eventRes:', JSON.stringify(eventRes, null, 2));
      
      // Backend returns: { status: 'success', data: { event: {...} } }
      // eventService extracts response.data, so we get: { status, data: { event } }
      const event = eventRes.data?.event || eventRes.event || eventRes.data || eventRes;
      console.log('🎯 Extracted event:', { title: event?.title, dateTime: event?.dateTime, _id: event?._id });
      
      if (!event || !event.title || !event.dateTime) {
        console.error('❌ Invalid event data:', event);
        throw new Error('Invalid event data received');
      }
      
      setEventContext(event);
      
      // Album name: "Tech Talk - 2024"
      const eventYear = new Date(event.dateTime).getFullYear();
      const albumName = `${event.title} - ${eventYear}`;
      
      console.log('📁 Album name:', albumName);
      console.log('📅 Event:', event.title, 'Date:', event.dateTime);
      
      // Fetch existing albums directly (don't rely on state)
      console.log('📂 Fetching albums for club:', clubIdParam);
      
      let existingAlbums = [];
      try {
        const albumsRes = await documentService.getAlbums(clubIdParam);
        existingAlbums = albumsRes.albums || albumsRes.data?.albums || [];
        console.log('📚 Existing albums:', existingAlbums.length);
      } catch (albumErr) {
        // If 404, it means no albums exist yet (first time), which is OK
        if (albumErr.response?.status === 404) {
          console.log('ℹ️ No albums endpoint or no albums yet - will create first album');
          existingAlbums = [];
        } else {
          console.error('⚠️ Error fetching albums:', albumErr.message);
          // Continue anyway - we'll try to create the album
          existingAlbums = [];
        }
      }
      
      console.log('🔍 Looking for existing album:', albumName);
      console.log('📚 Existing albums:', existingAlbums.map(a => a.name));
      
      const existingAlbum = existingAlbums.find(a => a.name === albumName);
      
      if (!existingAlbum) {
        console.log('✨ Creating new album...');
        const albumData = {
          name: albumName,
          description: `Photos from ${event.title}`,
          eventId: eventIdParam
        };
        console.log('📤 Sending album data:', albumData);
        console.log('🏢 Club ID:', clubIdParam);
        
        try {
          const createRes = await documentService.createAlbum(clubIdParam, albumData);
          console.log('✅ Album created successfully!', createRes);
        } catch (createErr) {
          console.error('❌ Album creation failed:');
          console.error('  Status:', createErr.response?.status);
          console.error('  Message:', createErr.response?.data?.message || createErr.message);
          
          // ✅ If album already exists, continue anyway (don't throw error)
          if (createErr.response?.status === 409 || createErr.response?.data?.message?.includes('already exists')) {
            console.log('ℹ️ Album already exists (409) - continuing...');
          } else {
            console.error('  Full error:', createErr.response?.data);
            throw createErr; // Only throw for non-duplicate errors
          }
        }
      } else {
        console.log('ℹ️ Album already exists in fetched list');
      }
      
      // ✅ ALWAYS refresh albums list (even if creation failed due to duplicate)
      console.log('🔄 Refreshing albums list with clubId:', clubIdParam);
      
      // Fetch albums directly with clubId (don't rely on state)
      try {
        const response = await documentService.getAlbums(clubIdParam);
        const albumsList = response.albums || response.data?.albums || [];
        console.log('✅ Fetched albums after creation:', albumsList.length);
        setAlbums(albumsList);
      } catch (fetchErr) {
        console.error('❌ Failed to fetch albums after creation:', fetchErr);
      }
      
      // Set selected album
      console.log('📌 Setting selected album to:', albumName);
      setSelectedAlbum(albumName);
      setUploadAlbum(albumName);
      
      // Open upload modal if action is upload
      if (actionParam === 'upload' && canUpload) {
        setTimeout(() => setShowUploadModal(true), 500); // Small delay for state updates
      }
      
    } catch (err) {
      console.error('❌ Error creating event album:', err);
      alert(`Failed to create event album: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    
    // Check for files larger than 25MB
    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB in bytes
    const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE);
    
    if (oversizedFiles.length > 0) {
      alert(`Some files exceed the 25MB limit. Please select smaller files.`);
      e.target.value = ''; // Clear the file input
      return;
    }
    
    setUploadFiles(files);
  };

  const handleUpload = async () => {
    if (uploadFiles.length === 0) {
      alert('Please select files to upload');
      return;
    }

    if (!uploadClubId) {
      alert('Please select a club');
      return;
    }

    try {
      setUploading(true);
      
      const metadata = {};
      if (uploadAlbum) metadata.album = uploadAlbum;
      if (uploadDescription) metadata.description = uploadDescription;

      if (uploadFiles.length > 1) {
        await documentService.bulkUpload(uploadClubId, uploadFiles, metadata);
      } else {
        await documentService.upload(uploadClubId, uploadFiles, metadata);
      }

      alert('Files uploaded successfully!');
      setShowUploadModal(false);
      setUploadFiles([]);
      setUploadDescription('');
      setUploadAlbum('');
      setEventContext(null); // Clear event context after upload
      
      // Clear URL parameters to prevent event context from being re-set on refresh
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('event');
      newParams.delete('action');
      setSearchParams(newParams);
      
      await Promise.all([
        fetchDocuments(),
        fetchAlbums() // Refresh album list to update counts
      ]);
    } catch (err) {
      console.error('Error uploading files:', err);
      
      // Check if it's a photo limit error
      if (err.response?.data?.code === 'PHOTO_LIMIT_EXCEEDED') {
        const details = err.response.data.details;
        const message = err.response.data.message;
        
        const useDrive = window.confirm(
          `${message}\n\n` +
          `Cloudinary Quota: ${details.current}/${details.limit}\n` +
          `Remaining: ${details.remaining} photos\n\n` +
          `Would you like to add a Google Drive link instead?`
        );
        
        if (useDrive) {
          setShowUploadModal(false);
          setShowDriveLinkModal(true);
        }
      } else {
        alert(err.response?.data?.message || 'Failed to upload files');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleCreateAlbum = async () => {
    if (!newAlbumName) {
      alert('Please enter album name');
      return;
    }

    if (!uploadClubId) {
      alert('Please select a club first');
      return;
    }

    // ✅ Check if album already exists
    const existingAlbum = albums.find(a => a.name.toLowerCase() === newAlbumName.trim().toLowerCase());
    if (existingAlbum) {
      alert(`Album "${newAlbumName}" already exists. Please use a different name or select it from the dropdown.`);
      return;
    }

    try {
      await documentService.createAlbum(uploadClubId, {
        name: newAlbumName,
        description: newAlbumDescription
      });

      alert('Album created successfully!');
      setShowAlbumModal(false);
      setNewAlbumName('');
      setNewAlbumDescription('');
      fetchAlbums();
    } catch (err) {
      console.error('Error creating album:', err);
      
      // ✅ Show specific error message for duplicate albums
      if (err.response?.status === 409 || err.response?.data?.message?.includes('already exists')) {
        alert(`Album "${newAlbumName}" already exists. Please use a different name or select it from the dropdown.`);
      } else {
        alert('Failed to create album: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const handleAddDriveLink = async () => {
    if (!driveUrl) {
      alert('Please enter a Google Drive URL');
      return;
    }

    if (!uploadClubId) {
      alert('Please select a club first');
      return;
    }

    if (!uploadAlbum) {
      alert('Please select or enter an album name');
      return;
    }

    try {
      setUploading(true);
      
      await documentService.addDriveLink(uploadClubId, {
        album: uploadAlbum,
        driveUrl,
        folderName: driveFolderName || uploadAlbum,
        photoCount: parseInt(drivePhotoCount) || 0,
        description: driveDescription
      });

      alert(`Drive link added successfully! ${drivePhotoCount || 0} photos linked to ${uploadAlbum}`);
      setShowDriveLinkModal(false);
      setDriveUrl('');
      setDriveFolderName('');
      setDrivePhotoCount('');
      setDriveDescription('');
      setUploadAlbum('');
      setEventContext(null);
      
      await Promise.all([
        fetchDocuments(),
        fetchAlbums(),
        fetchPhotoQuota()
      ]);
    } catch (err) {
      console.error('Error adding Drive link:', err);
      alert(err.response?.data?.message || 'Failed to add Drive link');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    // Find the document in current list to verify club ownership
    const doc = documents.find(d => d._id === docId);
    if (doc) {
      const docClubId = (doc.club?._id || doc.club)?.toString();
      const currentClubId = uploadClubId?.toString();
      
      console.log('=== DELETE DEBUG ===');
      console.log('Document ID:', docId);
      console.log('Document club:', docClubId);
      console.log('Selected club:', currentClubId);
      console.log('Match:', docClubId === currentClubId);
      
      if (docClubId && currentClubId && docClubId !== currentClubId) {
        alert(
          `⚠️ Club Mismatch!\n\n` +
          `This item belongs to a different club.\n` +
          `Please switch to the correct club to delete it.\n\n` +
          `Document Club ID: ${docClubId}\n` +
          `Selected Club ID: ${currentClubId}`
        );
        return;
      }
    }

    if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }

    if (!uploadClubId || loading) return;

    try {
      setLoading(true);
      await documentService.delete(uploadClubId, docId);
      alert('Item deleted successfully!');
      await Promise.all([
        fetchDocuments(),
        fetchAlbums(),
        fetchPhotoQuota()
      ]);
    } catch (err) {
      console.error('Error deleting item:', err);
      
      // Handle 404 - item already deleted
      if (err.response?.status === 404) {
        alert('This item was already deleted. Refreshing gallery...');
        await Promise.all([
          fetchDocuments(),
          fetchAlbums(),
          fetchPhotoQuota()
        ]);
      } else {
        alert(err.response?.data?.message || 'Failed to delete item');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (doc) => {
    if (!uploadClubId) return;

    try {
      const response = await documentService.download(uploadClubId, doc._id);
      const filename = doc.metadata?.filename || doc.album || 'image.jpg';
      documentService.downloadBlob(response.data, filename);
    } catch (err) {
      console.error('Error downloading image:', err);
      alert('Failed to download image');
    }
  };

  return (
    <Layout>
      <div className="gallery-page">
        <div className="gallery-header">
          <div className="header-left">
            <FaImage className="page-icon" />
            <h1>Media Gallery</h1>
          </div>
          <div className="header-actions">
            {eventContext && (
              <div className="event-context-badge">
                <span>📸 Uploading for: {eventContext.title}</span>
                <button 
                  className="badge-close"
                  onClick={() => {
                    setEventContext(null);
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete('event');
                    newParams.delete('action');
                    setSearchParams(newParams);
                  }}
                  title="Clear event context"
                >
                  <FaTimes />
                </button>
              </div>
            )}
            {photoQuota && uploadClubId && (
              <div className="quota-display" title={`${photoQuota.cloudinary.used}/${photoQuota.cloudinary.limit} Cloudinary photos used`}>
                <span className={`quota-badge ${photoQuota.cloudinary.percentage >= 100 ? 'quota-full' : photoQuota.cloudinary.percentage >= 80 ? 'quota-warning' : ''}`}>
                  📊 {photoQuota.cloudinary.used}/{photoQuota.cloudinary.limit} photos
                  {photoQuota.drive.linkCount > 0 && ` + ${photoQuota.drive.estimatedPhotos} on Drive`}
                </span>
              </div>
            )}
            {canUpload ? (
              <>
                <button className="btn btn-secondary" onClick={() => setShowAlbumModal(true)}>
                  <FaFolderPlus /> New Album
                </button>
                <button className="btn btn-secondary" onClick={() => setShowDriveLinkModal(true)}>
                  <FaImage /> Add Drive Link
                </button>
                <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
                  <FaUpload /> Upload Images
                </button>
              </>
            ) : uploadClubId ? (
              <div className="upload-restricted-message">
                <span>ℹ️ Only club core members can upload photos</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="gallery-filters">
          <div className="club-selector">
            <label>Select Club:</label>
            <select
              value={uploadClubId}
              onChange={(e) => {
                setUploadClubId(e.target.value);
                setSelectedAlbum('all');
                setPage(1);
              }}
            >
              <option value="">-- Select a Club --</option>
              {clubs.map(club => (
                <option key={club._id} value={club._id}>{club.name}</option>
              ))}
            </select>
          </div>

          <div className="search-box">
            <FaSearch />
            <input
              type="text"
              placeholder="Search images..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={!uploadClubId}
            />
          </div>

          <div className="album-filter">
            <select
              value={selectedAlbum}
              onChange={(e) => {
                setSelectedAlbum(e.target.value);
                setPage(1);
              }}
              disabled={!uploadClubId}
            >
              <option value="all">All Albums</option>
              {albums.map(album => (
                <option key={album.name} value={album.name}>
                  {album.name} ({album.count || 0})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Gallery Grid */}
        {!uploadClubId ? (
          <div className="empty-state">
            <FaImage className="empty-icon" />
            <h3>Select a Club</h3>
            <p>Please select a club from the dropdown above to view its gallery</p>
          </div>
        ) : loading ? (
          <div className="loading">Loading images...</div>
        ) : documents.length === 0 ? (
          <div className="empty-state">
            <FaImage className="empty-icon" />
            <h3>No Images Found</h3>
            <p>Upload some images to get started!</p>
          </div>
        ) : (
          <>
            <div className="gallery-grid">
              {documents.map(doc => (
                doc.storageType === 'drive' ? (
                  // Drive Link Card
                  <div key={doc._id} className="gallery-item drive-link-card">
                    <div className="drive-card-content">
                      <div className="drive-icon">
                        <FaImage size={48} />
                      </div>
                      <h4>{doc.driveMetadata?.folderName || doc.album || 'Google Drive Folder'}</h4>
                      <p className="photo-count">
                        {doc.driveMetadata?.photoCount || 0} photos
                      </p>
                      {doc.driveMetadata?.description && (
                        <p className="drive-description">{doc.driveMetadata.description}</p>
                      )}
                      <div className="drive-actions">
                        <a 
                          href={doc.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn btn-primary btn-sm"
                        >
                          <FaImage /> Open in Drive
                        </a>
                        <button 
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(doc._id)}
                        >
                          <FaTrash /> Remove Link
                        </button>
                      </div>
                    </div>
                    <div className="image-info">
                      <p className="image-meta">
                        {doc.club?.name || 'Unknown Club'} • {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ) : (
                  // Regular Cloudinary Image
                  <div key={doc._id} className="gallery-item">
                    <div className="image-wrapper" onClick={() => {
                      setSelectedImage(doc);
                      setShowImageModal(true);
                    }}>
                      <img 
                        src={doc.url || doc.cloudinaryUrl} 
                        alt={doc.description || doc.filename}
                      />
                      <div className="image-overlay">
                        <button 
                          className="overlay-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(doc);
                          }}
                        >
                          <FaDownload />
                        </button>
                        <button 
                          className="overlay-btn delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(doc._id);
                          }}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                    <div className="image-info">
                      <p className="image-title">{doc.metadata?.filename || doc.album || 'Untitled'}</p>
                      <p className="image-meta">
                        {doc.club?.name || 'Unknown Club'} • {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn btn-secondary"
                >
                  Previous
                </button>
                <span>Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn btn-secondary"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Upload Images</h2>
                <button className="close-btn" onClick={() => setShowUploadModal(false)}>
                  <FaTimes />
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Select Club *</label>
                  <select value={uploadClubId} onChange={(e) => setUploadClubId(e.target.value)}>
                    <option value="">-- Select Club --</option>
                    {clubs.map(club => (
                      <option key={club._id} value={club._id}>{club.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Album (Optional)</label>
                  <select value={uploadAlbum} onChange={(e) => setUploadAlbum(e.target.value)}>
                    <option value="">-- No Album --</option>
                    {albums.map(album => (
                      <option key={album.name} value={album.name}>{album.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Description (Optional)</label>
                  <textarea
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    placeholder="Add a description..."
                    rows="3"
                  />
                </div>

                <div className="form-group">
                  <label>Select Files * (Max 10 images, 25MB each)</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleFileSelect}
                  />
                  {uploadFiles.length > 0 && (
                    <p className="file-count">{uploadFiles.length} file(s) selected</p>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowUploadModal(false)}>
                  Cancel
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={handleUpload}
                  disabled={uploading || uploadFiles.length === 0}
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Album Modal */}
        {showAlbumModal && (
          <div className="modal-overlay" onClick={() => setShowAlbumModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Create New Album</h2>
                <button className="close-btn" onClick={() => setShowAlbumModal(false)}>
                  <FaTimes />
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Album Name *</label>
                  <input
                    type="text"
                    value={newAlbumName}
                    onChange={(e) => setNewAlbumName(e.target.value)}
                    placeholder="Enter album name"
                  />
                </div>
                <div className="form-group">
                  <label>Description (Optional)</label>
                  <textarea
                    value={newAlbumDescription}
                    onChange={(e) => setNewAlbumDescription(e.target.value)}
                    placeholder="Describe this album..."
                    rows="3"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowAlbumModal(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleCreateAlbum}>
                  Create Album
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Google Drive Link Modal */}
        {showDriveLinkModal && (
          <div className="modal-overlay" onClick={() => setShowDriveLinkModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Add Google Drive Link</h2>
                <button className="close-btn" onClick={() => setShowDriveLinkModal(false)}>
                  <FaTimes />
                </button>
              </div>
              <div className="modal-body">
                <div className="info-box">
                  <p>📊 <strong>Cloudinary Limit:</strong> You've reached the 10 photo limit for direct uploads.</p>
                  <p>💡 <strong>Solution:</strong> Add a Google Drive folder link to share unlimited additional photos!</p>
                </div>

                {photoQuota && (
                  <div className="quota-info">
                    <p>Current: {photoQuota.cloudinary.used}/{photoQuota.cloudinary.limit} Cloudinary photos</p>
                    {photoQuota.drive.linkCount > 0 && (
                      <p>+ {photoQuota.drive.estimatedPhotos} photos via {photoQuota.drive.linkCount} Drive link(s)</p>
                    )}
                  </div>
                )}

                <div className="form-group">
                  <label>Select Club *</label>
                  <select value={uploadClubId} onChange={(e) => setUploadClubId(e.target.value)}>
                    <option value="">-- Select Club --</option>
                    {clubs.map(club => (
                      <option key={club._id} value={club._id}>{club.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Album *</label>
                  <select value={uploadAlbum} onChange={(e) => setUploadAlbum(e.target.value)}>
                    <option value="">-- Select Album --</option>
                    {albums.map(album => (
                      <option key={album.name} value={album.name}>{album.name}</option>
                    ))}
                  </select>
                  <small>Select the album these photos belong to</small>
                </div>

                <div className="form-group">
                  <label>Google Drive Folder URL *</label>
                  <input
                    type="url"
                    value={driveUrl}
                    onChange={(e) => setDriveUrl(e.target.value)}
                    placeholder="https://drive.google.com/drive/folders/..."
                  />
                  <small>Right-click folder → Get link → Share with "Anyone with the link"</small>
                </div>

                <div className="form-group">
                  <label>Folder Name (Optional)</label>
                  <input
                    type="text"
                    value={driveFolderName}
                    onChange={(e) => setDriveFolderName(e.target.value)}
                    placeholder="e.g., Additional Event Photos"
                  />
                </div>

                <div className="form-group">
                  <label>Estimated Photo Count</label>
                  <input
                    type="number"
                    value={drivePhotoCount}
                    onChange={(e) => setDrivePhotoCount(e.target.value)}
                    placeholder="e.g., 35"
                    min="0"
                  />
                  <small>Approximately how many photos are in this folder?</small>
                </div>

                <div className="form-group">
                  <label>Description (Optional)</label>
                  <textarea
                    value={driveDescription}
                    onChange={(e) => setDriveDescription(e.target.value)}
                    placeholder="Additional details about these photos..."
                    rows="3"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowDriveLinkModal(false)}>
                  Cancel
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={handleAddDriveLink}
                  disabled={uploading || !driveUrl || !uploadAlbum}
                >
                  {uploading ? 'Adding...' : 'Add Drive Link'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Image View Modal */}
        {showImageModal && selectedImage && (
          <div className="modal-overlay large" onClick={() => setShowImageModal(false)}>
            <div className="modal-content image-modal" onClick={(e) => e.stopPropagation()}>
              <button className="close-btn" onClick={() => setShowImageModal(false)}>
                <FaTimes />
              </button>
              <img 
                src={selectedImage.url || selectedImage.cloudinaryUrl} 
                alt={selectedImage.description}
              />
              <div className="image-modal-info">
                <h3>{selectedImage.description || selectedImage.filename}</h3>
                <p>{selectedImage.club?.name} • {new Date(selectedImage.uploadedAt).toLocaleDateString()}</p>
                <div className="image-actions">
                  <button className="btn btn-secondary" onClick={() => handleDownload(selectedImage)}>
                    <FaDownload /> Download
                  </button>
                  <button className="btn btn-danger" onClick={() => {
                    setShowImageModal(false);
                    handleDelete(selectedImage._id);
                  }}>
                    <FaTrash /> Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default GalleryPage;
