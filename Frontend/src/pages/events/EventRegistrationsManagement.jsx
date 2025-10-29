import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import registrationService from '../../services/registrationService';
import eventService from '../../services/eventService';
import '../../styles/Tables.css';

const EventRegistrationsManagement = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [event, setEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState([]);
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected
  const [clubFilter, setClubFilter] = useState('my'); // my, all
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [rejectModal, setRejectModal] = useState({ show: false, registration: null });

  // Get user's clubs
  const [userClubs, setUserClubs] = useState([]);

  useEffect(() => {
    fetchData();
  }, [eventId]);

  useEffect(() => {
    applyFilters();
  }, [filter, clubFilter, registrations]);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('📋 Fetching event registrations for event:', eventId);
      
      // Fetch event details
      const eventResponse = await eventService.getById(eventId);
      const eventData = eventResponse.data?.data?.event || eventResponse.data?.event;
      setEvent(eventData);
      
      // Get user's clubs from event (primary + participating)
      const allEventClubIds = [
        eventData.club._id,
        ...(eventData.participatingClubs || []).map(c => c._id)
      ];
      
      // Filter to clubs where user has management role
      const userManagedClubs = allEventClubIds.filter(clubId => {
        // Check if user is admin or coordinator
        if (user.roles?.global === 'admin' || user.roles?.global === 'coordinator') {
          return true;
        }
        // Check if user has role in this club (would need membership check)
        return true; // For now, assume canManage check already passed
      });
      
      setUserClubs(userManagedClubs);
      
      // Fetch all registrations for this event
      const response = await registrationService.getEventRegistrations(eventId, {
        _t: Date.now() // Cache-busting
      });
      
      const data = response.data?.data || [];
      const registrationsArray = Array.isArray(data) ? data : [];
      
      console.log(`✅ Fetched ${registrationsArray.length} registrations for event:`, {
        pending: registrationsArray.filter(r => r.status === 'pending').length,
        approved: registrationsArray.filter(r => r.status === 'approved').length,
        rejected: registrationsArray.filter(r => r.status === 'rejected').length
      });
      
      setRegistrations(registrationsArray);
      setError('');
    } catch (err) {
      console.error('❌ Error fetching data:', err);
      setError('Failed to load registrations');
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = Array.isArray(registrations) ? registrations : [];

    // Filter by status
    if (filter !== 'all') {
      filtered = filtered.filter(r => r.status === filter);
    }

    // Filter by club (my clubs vs all clubs)
    if (clubFilter === 'my') {
      // Show only registrations where representingClub is one of user's clubs
      filtered = filtered.filter(r => 
        userClubs.includes(r.representingClub?._id || r.representingClub)
      );
    }

    setFilteredRegistrations(filtered);
  };

  const handleApprove = async (registrationId) => {
    if (!window.confirm('Approve this registration?')) return;

    try {
      await registrationService.reviewRegistration(registrationId, {
        status: 'approved'
      });
      alert('✅ Registration approved!');
      fetchData();
    } catch (err) {
      alert('Failed to approve: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleReject = (registration) => {
    setRejectModal({ show: true, registration });
  };

  const confirmReject = async (reason) => {
    if (!reason || reason.trim().length < 10) {
      alert('Please provide a detailed reason (minimum 10 characters)');
      return;
    }

    try {
      await registrationService.reviewRegistration(rejectModal.registration._id, {
        status: 'rejected',
        rejectionReason: reason
      });
      alert('❌ Registration rejected');
      setRejectModal({ show: false, registration: null });
      fetchData();
    } catch (err) {
      alert('Failed to reject: ' + (err.response?.data?.message || err.message));
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: '⏳ Pending',
      approved: '✅ Approved',
      rejected: '❌ Rejected',
      waitlisted: '⏸️ Waitlisted'
    };
    return badges[status] || status;
  };

  // Calculate stats
  const stats = {
    total: Array.isArray(registrations) ? registrations.length : 0,
    pending: Array.isArray(registrations) ? registrations.filter(r => r.status === 'pending').length : 0,
    approved: Array.isArray(registrations) ? registrations.filter(r => r.status === 'approved').length : 0,
    rejected: Array.isArray(registrations) ? registrations.filter(r => r.status === 'rejected').length : 0,
    // My club stats (pending for MY clubs only)
    myPending: Array.isArray(registrations) ? registrations.filter(r => 
      r.status === 'pending' && 
      userClubs.includes(r.representingClub?._id || r.representingClub)
    ).length : 0
  };

  if (loading) {
    return (
      <Layout>
        <div className="page-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading registrations...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-container">
        <div className="page-header">
          <button onClick={() => navigate(`/events/${eventId}`)} className="btn btn-secondary">
            ← Back to Event
          </button>
          <h1>📝 Event Registrations</h1>
          <p>{event?.title}</p>
          <p className="section-subtitle">
            Organized by <strong>{event?.club?.name}</strong>
            {event?.participatingClubs && event.participatingClubs.length > 0 && (
              <span> in collaboration with <strong>{event.participatingClubs.map(c => c.name).join(', ')}</strong></span>
            )}
          </p>
        </div>

        {/* Stats Overview */}
        <div className="stats-grid">
          <div className="stat-card info">
            <h3>{stats.total}</h3>
            <p>Total Registrations</p>
            <small>(All Clubs)</small>
          </div>
          <div className="stat-card warning">
            <h3>{stats.myPending}</h3>
            <p>Pending for My Clubs</p>
            <small>(Needs your approval)</small>
          </div>
          <div className="stat-card success">
            <h3>{stats.approved}</h3>
            <p>Approved</p>
            <small>(All Clubs)</small>
          </div>
          <div className="stat-card danger">
            <h3>{stats.rejected}</h3>
            <p>Rejected</p>
            <small>(All Clubs)</small>
          </div>
        </div>

        {/* Filters */}
        <div className="filter-section">
          <div className="filter-group">
            <label>Status:</label>
            <div className="button-group">
              <button 
                onClick={() => setFilter('all')}
                className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              >
                📋 All ({stats.total})
              </button>
              <button 
                onClick={() => setFilter('pending')}
                className={`btn ${filter === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
              >
                ⏳ Pending ({stats.pending})
              </button>
              <button 
                onClick={() => setFilter('approved')}
                className={`btn ${filter === 'approved' ? 'btn-primary' : 'btn-secondary'}`}
              >
                ✅ Approved ({stats.approved})
              </button>
              <button 
                onClick={() => setFilter('rejected')}
                className={`btn ${filter === 'rejected' ? 'btn-primary' : 'btn-secondary'}`}
              >
                ❌ Rejected ({stats.rejected})
              </button>
            </div>
          </div>

          <div className="filter-group">
            <label>Show:</label>
            <div className="button-group">
              <button 
                onClick={() => setClubFilter('my')}
                className={`btn ${clubFilter === 'my' ? 'btn-primary' : 'btn-secondary'}`}
              >
                🎯 My Clubs Only
              </button>
              <button 
                onClick={() => setClubFilter('all')}
                className={`btn ${clubFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              >
                🌐 All Clubs
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="alert alert-error">
            ❌ {error}
          </div>
        )}

        {/* Registrations Table */}
        {filteredRegistrations.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Representing Club</th>
                  <th>Type</th>
                  <th>Performance Details</th>
                  <th>Status</th>
                  <th>Registered</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRegistrations.map(registration => {
                  const isMyClub = userClubs.includes(registration.representingClub?._id || registration.representingClub);
                  
                  return (
                    <tr key={registration._id} style={{ 
                      background: isMyClub ? '#f0fdf4' : 'transparent' 
                    }}>
                      <td>
                        <div className="user-cell">
                          <strong>{registration.user?.name || 'Unknown'}</strong>
                          <small>{registration.user?.email}</small>
                          <small>{registration.user?.rollNumber}</small>
                        </div>
                      </td>
                      <td>
                        <strong>{registration.representingClub?.name || 'Unknown Club'}</strong>
                        {isMyClub && <span className="badge badge-success" style={{ marginLeft: '0.5rem' }}>Your Club</span>}
                      </td>
                      <td>
                        <span className="badge badge-info">
                          {registration.registrationType}
                        </span>
                      </td>
                      <td>
                        {registration.registrationType === 'performer' ? (
                          <div>
                            <strong>{registration.performanceType || 'Not specified'}</strong>
                            <br />
                            <small>{registration.performanceDescription || 'No description'}</small>
                          </div>
                        ) : (
                          <span>—</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge badge-${
                          registration.status === 'approved' ? 'success' :
                          registration.status === 'rejected' ? 'danger' :
                          registration.status === 'pending' ? 'warning' :
                          'secondary'
                        }`}>
                          {getStatusBadge(registration.status)}
                        </span>
                      </td>
                      <td>
                        {new Date(registration.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <div className="action-buttons">
                          {registration.status === 'pending' && isMyClub && (
                            <>
                              <button
                                onClick={() => handleApprove(registration._id)}
                                className="btn btn-sm btn-success"
                                title="Approve"
                              >
                                ✅
                              </button>
                              <button
                                onClick={() => handleReject(registration)}
                                className="btn btn-sm btn-danger"
                                title="Reject"
                              >
                                ❌
                              </button>
                            </>
                          )}
                          {registration.status === 'pending' && !isMyClub && (
                            <span className="text-muted" style={{ fontSize: '0.875rem' }}>
                              (Other club's approval)
                            </span>
                          )}
                          {registration.status === 'approved' && (
                            <span className="text-success">✅ Approved</span>
                          )}
                          {registration.status === 'rejected' && (
                            <span className="text-danger">❌ Rejected</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p>📭 No registrations found matching your filters</p>
          </div>
        )}

        {/* Reject Modal */}
        {rejectModal.show && (
          <div className="modal-overlay" onClick={() => setRejectModal({ show: false, registration: null })}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>❌ Reject Registration</h3>
              <p><strong>Student:</strong> {rejectModal.registration.user?.name}</p>
              <p><strong>Club:</strong> {rejectModal.registration.representingClub?.name}</p>
              {rejectModal.registration.performanceType && (
                <p><strong>Performance:</strong> {rejectModal.registration.performanceType}</p>
              )}
              
              <div className="form-group">
                <label>Rejection Reason: *</label>
                <textarea 
                  id="rejectionReason"
                  rows="4"
                  placeholder="Please provide a detailed reason for rejection (minimum 10 characters)..."
                  className="form-control"
                  required
                ></textarea>
              </div>

              <div className="modal-actions">
                <button
                  onClick={() => {
                    const reason = document.getElementById('rejectionReason').value;
                    confirmReject(reason);
                  }}
                  className="btn btn-danger"
                >
                  Confirm Reject
                </button>
                <button
                  onClick={() => setRejectModal({ show: false, registration: null })}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default EventRegistrationsManagement;
