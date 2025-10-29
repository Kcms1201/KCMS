import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import eventService from '../../services/eventService';
import documentService from '../../services/documentService';
import '../../styles/CompletionChecklist.css';

const CompletionChecklist = ({ event, onUploadComplete, canManage }) => {
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [uploadingType, setUploadingType] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Calculate days remaining
  const getDaysRemaining = () => {
    if (!event.completionDeadline) return null;
    const deadline = new Date(event.completionDeadline);
    const now = new Date();
    const diffTime = deadline - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysRemaining = getDaysRemaining();

  // Get urgency level for styling
  const getUrgencyLevel = () => {
    if (daysRemaining === null) return 'normal';
    if (daysRemaining <= 2) return 'urgent';
    if (daysRemaining <= 4) return 'warning';
    return 'normal';
  };

  const urgencyLevel = getUrgencyLevel();

  // Checklist items
  const checklistItems = [
    {
      id: 'photos',
      label: 'Event Photos',
      required: 'Minimum 5 photos',
      completed: event.completionChecklist?.photosUploaded || false,
      count: event.photoCount || 0,
      requiredCount: 5,
      uploadType: 'photos'
    },
    {
      id: 'report',
      label: 'Event Report',
      required: 'PDF/DOC format',
      completed: event.completionChecklist?.reportUploaded || false,
      uploadType: 'report'
    },
    {
      id: 'attendance',
      label: 'Attendance Sheet',
      required: 'Excel/CSV format',
      completed: event.completionChecklist?.attendanceUploaded || false,
      uploadType: 'attendance'
    }
  ];

  // Add bills if budget exists
  if (event.budget > 0) {
    checklistItems.push({
      id: 'bills',
      label: 'Bills/Receipts',
      required: 'PDF/Image format',
      completed: event.completionChecklist?.billsUploaded || false,
      count: event.billsUrls?.length || 0,
      uploadType: 'bills'
    });
  }

  // Calculate progress
  const completedCount = checklistItems.filter(item => item.completed).length;
  const totalCount = checklistItems.length;
  const progressPercentage = Math.round((completedCount / totalCount) * 100);

  // Handle navigation to Gallery for photo uploads
  const handleNavigateToGallery = () => {
    const clubId = event.club?._id || event.club;
    navigate(`/gallery?event=${event._id}&clubId=${clubId}&action=upload`);
  };

  // Handle refresh photo count - links unlinked photos to event
  const handleRefreshPhotoCount = async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    try {
      const clubId = event.club?._id || event.club;
      const result = await documentService.linkPhotosToEvents(clubId);
      
      alert(`✅ Photo count refreshed! ${result.data?.totalLinked || 0} photos linked to events.`);
      
      // Trigger reload
      if (onUploadComplete) {
        onUploadComplete('photos');
      }
    } catch (err) {
      console.error('Refresh error:', err);
      alert(`❌ Refresh failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  // Handle upload for non-photo items (report, attendance, bills)
  const handleUpload = async (uploadType) => {
    if (uploading) return;
    
    // For photos, navigate to gallery instead
    if (uploadType === 'photos') {
      handleNavigateToGallery();
      return;
    }
    
    // ✅ SIMPLE SOLUTION: Navigate to event detail page with upload type
    // This shows a clean upload section on the event page
    navigate(`/events/${event._id}?upload=${uploadType}`);
  };

  // ✅ Show checklist for: pending_completion (initial upload) OR completed (allow re-uploads)
  if (event.status !== 'pending_completion' && event.status !== 'completed') {
    return null; // Only show for pending_completion or completed status
  }

  return (
    <div className={`completion-checklist ${urgencyLevel}`}>
      {/* Header */}
      <div className="checklist-header">
        <h3>⏰ Complete Your Event</h3>
            {daysRemaining !== null && (
              <p className={`deadline-text ${urgencyLevel}`}>
                {daysRemaining > 0 ? (
                  <>
                    <strong>{daysRemaining}</strong> day{daysRemaining !== 1 ? 's' : ''} remaining
                  </>
                ) : daysRemaining === 0 ? (
                  <strong className="urgent">⚠️ Due today!</strong>
                ) : (
                  <strong className="urgent">⚠️ Overdue!</strong>
                )}
              </p>
            )}
      </div>

      {/* Progress Bar */}
      <div className="progress-container">
        <div className="progress-bar">
          <div 
            className={`progress-fill ${urgencyLevel}`}
            style={{ width: `${progressPercentage}%` }}
          >
            <span className="progress-text">{progressPercentage}%</span>
          </div>
        </div>
        <p className="progress-label">
          {completedCount} of {totalCount} items completed
        </p>
      </div>

      {/* Checklist Items */}
      <div className="checklist-items">
        {checklistItems.map(item => (
          <div key={item.id} className={`checklist-item ${item.completed ? 'completed' : 'pending'}`}>
            <div className="item-status">
              {item.completed ? (
                <span className="status-icon completed">✅</span>
              ) : (
                <span className="status-icon pending">⏳</span>
              )}
            </div>
            
            <div className="item-details">
              <h4>{item.label}</h4>
              <p className="item-requirement">{item.required}</p>
              {item.count !== undefined && (
                <p className="item-count">
                  {item.completed ? (
                    <span className="success">✓ {item.count} uploaded</span>
                  ) : (
                    <span className="pending">
                      {item.count}/{item.requiredCount || 1} uploaded
                    </span>
                  )}
                </p>
              )}
            </div>

            {canManage && (
              <div className="item-action">
                {!item.completed ? (
                  <>
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={() => handleUpload(item.uploadType)}
                      disabled={uploading}
                    >
                      {uploading && uploadingType === item.uploadType ? '⏳ Uploading...' : 
                       item.uploadType === 'photos' ? '📸 Upload in Gallery' : '📤 Upload'}
                    </button>
                    {item.uploadType === 'photos' && item.count > 0 && (
                      <button 
                        className="btn btn-sm btn-secondary"
                        onClick={handleRefreshPhotoCount}
                        disabled={refreshing}
                        style={{ marginLeft: '8px' }}
                        title="If you uploaded photos but count is wrong, click to refresh"
                      >
                        {refreshing ? '⏳ Refreshing...' : '🔄 Refresh Count'}
                      </button>
                    )}
                  </>
                ) : item.uploadType === 'photos' ? (
                  <>
                    <button 
                      className="btn btn-sm btn-outline"
                      onClick={handleNavigateToGallery}
                    >
                      👁️ View in Gallery
                    </button>
                    {/* ✅ Show refresh button even if marked complete, but count is wrong */}
                    {item.count > 0 && item.count < (item.requiredCount || 999) && (
                      <button 
                        className="btn btn-sm btn-secondary"
                        onClick={handleRefreshPhotoCount}
                        disabled={refreshing}
                        style={{ marginLeft: '8px' }}
                        title="Photo count seems incorrect. Click to refresh and relink photos."
                      >
                        {refreshing ? '⏳ Refreshing...' : '🔄 Refresh Count'}
                      </button>
                    )}
                  </>
                ) : null}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action Buttons - Removed bulk upload, users upload individually */}

      {/* Success Message */}
      {completedCount === totalCount && (
        <div className="checklist-success">
          <p>🎉 All materials uploaded! Your event will be marked as completed shortly.</p>
        </div>
      )}
    </div>
  );
};

export default CompletionChecklist;
