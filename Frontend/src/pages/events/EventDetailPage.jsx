import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import CompletionChecklist from '../../components/event/CompletionChecklist';
import eventService from '../../services/eventService';
import { ROLE_DISPLAY_NAMES, hasCoreMemberRole, CORE_AND_LEADERSHIP } from '../../utils/roleConstants';
import '../../styles/Events.css';

const EventDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, clubMemberships } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rsvpLoading, setRsvpLoading] = useState(false);

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      const response = await eventService.getById(id);
      
      // ✅ FIX: Axios returns full response object
      // Structure: response.data = { status, data: { event } }
      const eventData = response.data?.data?.event || response.data?.event;
      
      console.log('📋 EventDetailPage - Event data:', eventData);
      console.log('🤝 EventDetailPage - Participating clubs:', eventData?.participatingClubs);
      
      if (!eventData) {
        setEvent(null);
      } else {
        setEvent(eventData);
      }
    } catch (error) {
      console.error('❌ Error fetching event details:', error);
      console.error('Error response:', error.response);
      setEvent(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRSVP = async () => {
    // Prevent multiple clicks
    if (rsvpLoading) return;
    
    setRsvpLoading(true);
    try {
      await eventService.rsvp(id);
      alert('RSVP successful!');
      await fetchEventDetails();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to RSVP');
    } finally {
      setRsvpLoading(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!window.confirm('Submit this event for coordinator approval?')) return;
    
    try {
      await eventService.changeStatus(id, 'submit');
      alert('Event submitted for approval!');
      fetchEventDetails();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to submit event');
    }
  };

  const handleApproveEvent = async () => {
    if (!window.confirm('Approve this event?')) return;
    
    try {
      await eventService.changeStatus(id, 'approve');
      alert('Event approved successfully!');
      fetchEventDetails();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to approve event');
    }
  };

  const handleAdminApprove = async () => {
    if (!window.confirm('Approve this event as Admin?')) return;
    
    try {
      await eventService.changeStatus(id, 'approve'); // ✅ Use 'approve' not 'approveAdmin'
      alert('Event approved by Admin successfully!');
      fetchEventDetails();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to approve event');
    }
  };

  const handleEdit = () => {
    navigate(`/events/${id}/edit`);
  };

  const handleDelete = async () => {
    // ✅ Prevent deletion of non-draft events
    if (event?.status !== 'draft') {
      alert(`Cannot delete event with status '${event?.status}'. Only draft events can be deleted.`);
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${event?.title}"?\n\nThis action cannot be undone.`)) {
      return;
    }
    
    setLoading(true);
    try {
      await eventService.delete(id);
      alert('✅ Event deleted successfully!');
      navigate('/events');
    } catch (error) {
      console.error('Delete error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to delete event';
      alert(`❌ ${errorMsg}`);
      setLoading(false);
    }
  };

  // Financial Override Handler (NEW - Coordinator only)
  const handleFinancialOverride = async () => {
    const reason = prompt('Enter reason for financial override:');
    if (!reason || reason.trim() === '') {
      alert('Override reason is required');
      return;
    }

    if (!window.confirm(`Apply financial override for this event?\n\nReason: ${reason}\n\nThis will override budget restrictions.`)) {
      return;
    }

    try {
      await eventService.financialOverride(id, { 
        reason: reason.trim(),
        approved: true 
      });
      alert('✅ Financial override applied successfully!');
      fetchEventDetails();
    } catch (error) {
      console.error('Financial override error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to apply financial override';
      alert(`❌ ${errorMsg}`);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading event details...</p>
        </div>
      </Layout>
    );
  }

  if (!event) {
    return (
      <Layout>
        <div className="error-container">
          <h2>Event not found</h2>
          <button onClick={() => navigate('/events')} className="btn btn-primary">
            Back to Events
          </button>
        </div>
      </Layout>
    );
  }

  // ✅ Multi-layered permission check
  // Check 1: Backend-provided canManage flag
  const backendCanManage = event?.canManage || false;
  
  // Check 2: Is coordinator assigned to THIS event's club
  const coordinatorId = event?.club?.coordinator?._id || event?.club?.coordinator;
  const userId = user?._id?.toString() || user?._id;
  const isCoordinatorForClub = user?.roles?.global === 'coordinator' && 
                                coordinatorId?.toString() === userId;
  
  // Check 3: Is admin
  const isAdmin = user?.roles?.global === 'admin';
  
  // Check 4: Has club management role (president, vicePresident, core team)
  const clubId = event?.club?._id?.toString() || event?.club?.toString();
  const hasClubManagementRole = clubMemberships ? 
    clubMemberships.some(membership => {
      const memberClubId = membership.club?._id?.toString() || membership.club?.toString();
      return memberClubId === clubId && CORE_AND_LEADERSHIP.includes(membership.role);
    }) : false;
  
  // ✅ FINAL PERMISSION: User can manage if ANY of these conditions are true
  const canManage = backendCanManage || isCoordinatorForClub || isAdmin || hasClubManagementRole;

  const isPublished = event?.status === 'published';
  
  // ✅ Check if user has already RSVP'd
  const hasRSVPd = event?.attendees?.some(attendee => {
    const attendeeId = attendee?._id?.toString() || attendee?.toString();
    const currentUserId = user?._id?.toString();
    return attendeeId === currentUserId;
  }) || false;

  return (
    <Layout>
      <div className="event-detail-page">
        <div className="event-detail-header">
          <div className="event-date-large">
            <span className="day">{event?.dateTime ? new Date(event.dateTime).getDate() : '--'}</span>
            <span className="month">
              {event?.dateTime ? new Date(event.dateTime).toLocaleString('default', { month: 'short' }) : '--'}
            </span>
            <span className="year">{event?.dateTime ? new Date(event.dateTime).getFullYear() : '--'}</span>
          </div>

          <div className="event-header-info">
            <div className="event-title-row">
              <h1>{event?.title || 'Event Details'}</h1>
              <span className={`badge badge-lg badge-${
                event?.status === 'draft' ? 'secondary' :
                event?.status === 'pending_coordinator' ? 'warning' :
                event?.status === 'pending_admin' ? 'warning' :
                event?.status === 'approved' ? 'info' :
                event?.status === 'published' ? 'success' : 
                event?.status === 'ongoing' ? 'info' : 
                event?.status === 'pending_completion' ? 'warning' :  // ✅ NEW
                event?.status === 'completed' ? 'success' :            // ✅ Changed to success
                event?.status === 'incomplete' ? 'danger' :            // ✅ NEW
                event?.status === 'cancelled' ? 'danger' : 'warning'
              }`}>
                {event?.status === 'pending_completion' ? '⏳ PENDING COMPLETION' :
                 event?.status === 'incomplete' ? '❌ INCOMPLETE' :
                 event?.status?.replace('_', ' ').toUpperCase() || 'N/A'}
              </span>
            </div>
            <p className="event-club-large">
              Organized by <strong>{event?.club?.name || 'Unknown Club'}</strong>
              {event?.participatingClubs && event.participatingClubs.length > 0 && (
                <span className="participating-clubs">
                  {' '}in collaboration with{' '}
                  <strong>{event.participatingClubs.map(c => c.name).join(', ')}</strong>
                </span>
              )}
            </p>
            <p className="event-description-large">{event?.description || 'No description available'}</p>

            <div className="event-meta-large">
              <div className="meta-item">
                <span className="meta-icon">📍</span>
                <span>{event?.venue || 'TBD'} (Capacity: {event?.capacity || 'N/A'})</span>
              </div>
              <div className="meta-item">
                <span className="meta-icon">🕐</span>
                <span>
                  {event?.dateTime ? new Date(event.dateTime).toLocaleString('en-US', { 
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'Date TBD'}
                </span>
              </div>
              <div className="meta-item">
                <span className="meta-icon">⏱️</span>
                <span>Duration: {event?.duration || 'TBD'} hours</span>
              </div>
              <div className="meta-item">
                <span className="meta-icon">👥</span>
                <span>{event?.expectedAttendees || 'N/A'} expected attendees</span>
              </div>
              {canManage && (
                <div className="meta-item">
                  <span className="meta-icon">✅</span>
                  <span><strong>{event?.attendees?.length || 0} RSVPs received</strong></span>
                </div>
              )}
            </div>

            <div className="event-actions">
              {/* ✅ NEW: Event Registration for all users (students including club members) */}
              {isPublished && (
                <button 
                  onClick={() => navigate(`/events/${id}/register`)}
                  className="btn btn-primary"
                >
                  📝 Register for Event
                </button>
              )}
              
              {/* Club Core/President actions */}
              {canManage && event?.status === 'draft' && (
                <>
                  <button 
                    onClick={handleEdit}
                    className="btn btn-secondary"
                  >
                    ✏️ Edit Event
                  </button>
                  <button 
                    onClick={handleDelete}
                    className="btn btn-danger"
                  >
                    🗑️ Delete Event
                  </button>
                  <button 
                    onClick={handleSubmitForApproval}
                    className="btn btn-primary"
                  >
                    Submit for Approval
                  </button>
                </>
              )}
              
              {/* Coordinator approval button */}
              {isCoordinatorForClub && event?.status === 'pending_coordinator' && (
                <button 
                  onClick={handleApproveEvent}
                  className="btn btn-success"
                >
                  ✓ Approve Event
                </button>
              )}

              {/* Coordinator Financial Override (NEW) - Only in pending_coordinator status */}
              {isCoordinatorForClub && event?.status === 'pending_coordinator' && (
                <button 
                  onClick={handleFinancialOverride}
                  className="btn btn-warning"
                  title="Override budget restrictions (allows events >5000 or with guest speakers)"
                >
                  💰 Financial Override
                </button>
              )}
              
              
              {user?.roles?.global === 'admin' && event?.status === 'pending_admin' && (
                <button 
                  onClick={handleAdminApprove}
                  className="btn btn-success"
                >
                  ✓ Approve as Admin
                </button>
              )}
              
              {/* Status transition buttons for ongoing events */}
              {canManage && event?.status === 'published' && (
                <button 
                  onClick={async () => {
                    try {
                      await eventService.changeStatus(id, 'start');
                      alert('Event started!');
                      fetchEventDetails();
                    } catch (err) {
                      alert(err.response?.data?.message || 'Failed to start event');
                    }
                  }}
                  className="btn btn-primary"
                >
                  Start Event
                </button>
              )}
              
              {canManage && event?.status === 'ongoing' && (
                <button 
                  onClick={async () => {
                    try {
                      await eventService.changeStatus(id, 'complete');
                      alert('Event completed!');
                      fetchEventDetails();
                    } catch (err) {
                      alert(err.response?.data?.message || 'Failed to complete event');
                    }
                  }}
                  className="btn btn-success"
                >
                  Complete Event
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Completion Checklist - Shows for pending_completion and incomplete events */}
        {(event?.status === 'pending_completion' || event?.status === 'incomplete') && (
          <CompletionChecklist 
            event={event} 
            canManage={canManage}
            onUploadComplete={() => fetchEventDetails()}
          />
        )}

        {/* ✅ Club Member Attendance Section - For Ongoing and Published Events */}
        {canManage && (event?.status === 'ongoing' || event?.status === 'published') && (
          <div className="attendance-section">
            <div className="section-header">
              <h2>👥 Club Member Attendance</h2>
              <p className="section-subtitle">Track attendance of all club members from participating clubs</p>
            </div>
            
            <div className="attendance-info">
              <p>All members from <strong>{event?.club?.name}</strong>
              {event?.participatingClubs && event.participatingClubs.length > 0 && (
                <span> and {event.participatingClubs.map(c => c.name).join(', ')}</span>
              )} are automatically tracked for attendance.</p>
            </div>
            
            <div className="attendance-actions">
              <button 
                onClick={() => navigate(`/events/${id}/organizer-attendance`)}
                className="btn btn-primary"
              >
                📝 Manage Club Member Attendance
              </button>
            </div>
          </div>
        )}

        {/* Completed Event Reports */}
        {canManage && event?.status === 'completed' && (
          <div className="completed-event-section">
            <h2>📊 Event Reports & Analytics</h2>
            <div className="report-actions">
              <button 
                onClick={() => navigate(`/events/${id}/organizer-attendance`)}
                className="btn btn-secondary"
              >
                📋 View Organizer Attendance
              </button>
              <button 
                onClick={() => alert('Event summary report feature coming soon')}
                className="btn btn-outline"
              >
                📄 Download Event Report
              </button>
            </div>
          </div>
        )}

        <div className="event-detail-content">
          <div className="info-card">
            <h3>Event Objectives</h3>
            <p>{event?.objectives || 'No objectives specified'}</p>
          </div>

          {event?.isPublic !== undefined && (
            <div className="info-card">
              <h3>Audience</h3>
              <p>{event?.isPublic ? 'Open to all students' : 'Members only'}</p>
            </div>
          )}

          {event?.budget && (
            <div className="info-card">
              <h3>Budget</h3>
              <p>₹{event?.budget}</p>
            </div>
          )}

          {event?.guestSpeakers && event?.guestSpeakers.length > 0 && (
            <div className="info-card">
              <h3>Guest Speakers</h3>
              <ul>
                {event.guestSpeakers.map((speaker, index) => (
                  <li key={index}>{speaker}</li>
                ))}
              </ul>
            </div>
          )}

          {canManage && event?.attendees && event.attendees.length > 0 && (
            <div className="info-card">
              <h3>RSVPs / Attendees ({event.attendees.length})</h3>
              <div className="attendees-list">
                {event.attendees.map((attendee, index) => (
                  <div key={attendee._id || index} className="attendee-item">
                    <span className="attendee-number">{index + 1}.</span>
                    <div className="attendee-info">
                      <strong>{attendee.profile?.name || attendee.email || 'Unknown'}</strong>
                      {attendee.rollNumber && (
                        <span className="attendee-roll"> - {attendee.rollNumber}</span>
                      )}
                      {attendee.profile?.department && (
                        <span className="attendee-dept"> ({attendee.profile.department})</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
};

export default EventDetailPage;
