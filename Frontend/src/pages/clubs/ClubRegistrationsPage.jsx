import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import registrationService from '../../services/registrationService';
import '../../styles/Tables.css';

const ClubRegistrationsPage = () => {
  const { clubId } = useParams();
  const navigate = useNavigate();
  
  const [registrations, setRegistrations] = useState([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [eventFilter, setEventFilter] = useState('all');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [rejectModal, setRejectModal] = useState({ show: false, registration: null });

  useEffect(() => {
    fetchRegistrations();
  }, [clubId]);

  useEffect(() => {
    applyFilters();
  }, [filter, eventFilter, registrations]);

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const response = await registrationService.getClubPendingRegistrations(clubId);
      
      // Backend returns: { status: 'success', data: [array], message: '...' }
      const data = response.data?.data || [];
      
      // Ensure data is an array
      const registrationsArray = Array.isArray(data) ? data : [];
      setRegistrations(registrationsArray);
      
      // Extract unique events
      const uniqueEvents = [...new Set(registrationsArray.map(r => r.event?.title))].filter(Boolean);
      setEvents(uniqueEvents);
      
      setError('');
    } catch (err) {
      console.error('Error fetching registrations:', err);
      setError('Failed to load registrations');
      setRegistrations([]); // Ensure registrations is always an array
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    // Ensure registrations is always an array
    let filtered = Array.isArray(registrations) ? registrations : [];

    // Filter by status
    if (filter !== 'all') {
      filtered = filtered.filter(r => r.status === filter);
    }

    // Filter by event
    if (eventFilter !== 'all') {
      filtered = filtered.filter(r => r.event?.title === eventFilter);
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
      fetchRegistrations();
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
      fetchRegistrations();
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


  const stats = {
    pending: Array.isArray(registrations) ? registrations.filter(r => r.status === 'pending').length : 0,
    approved: Array.isArray(registrations) ? registrations.filter(r => r.status === 'approved').length : 0,
    rejected: Array.isArray(registrations) ? registrations.filter(r => r.status === 'rejected').length : 0,
    total: Array.isArray(registrations) ? registrations.length : 0
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
          <h1>🎭 Event Performer Registrations</h1>
          <p>Review and approve performer registrations for your club's events</p>
        </div>

        {/* Stats Overview */}
        <div className="stats-grid">
          <div className="stat-card warning">
            <h3>{stats.pending}</h3>
            <p>Pending Approval</p>
          </div>
          <div className="stat-card success">
            <h3>{stats.approved}</h3>
            <p>Approved</p>
          </div>
          <div className="stat-card danger">
            <h3>{stats.rejected}</h3>
            <p>Rejected</p>
          </div>
          <div className="stat-card info">
            <h3>{stats.total}</h3>
            <p>Total Registrations</p>
          </div>
        </div>

        {/* Filters */}
        <div className="filter-section">
          <div className="filter-group">
            <label>Status:</label>
            <div className="button-group">
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
              <button 
                onClick={() => setFilter('all')}
                className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              >
                📋 All ({stats.total})
              </button>
            </div>
          </div>

          {events.length > 0 && (
            <div className="filter-group">
              <label htmlFor="eventFilter">Filter by Event:</label>
              <select 
                id="eventFilter"
                value={eventFilter}
                onChange={(e) => setEventFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Events</option>
                {events.map(event => (
                  <option key={event} value={event}>{event}</option>
                ))}
              </select>
            </div>
          )}
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
                  <th>Event</th>
                  <th>Performance Type</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Registered</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRegistrations.map(registration => (
                  <tr key={registration._id}>
                    <td>
                      <div className="user-cell">
                        <strong>{registration.user?.name || 'Unknown'}</strong>
                        <small>{registration.user?.email}</small>
                        <small>{registration.user?.rollNumber}</small>
                      </div>
                    </td>
                    <td>{registration.event?.title || 'Unknown Event'}</td>
                    <td>
                      <span className="badge badge-info">
                        {registration.performanceType || 'Not specified'}
                      </span>
                    </td>
                    <td>
                      <div className="description-cell">
                        {registration.performanceDescription || 'No description'}
                      </div>
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
                        {registration.status === 'pending' && (
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
                        {registration.status === 'approved' && (
                          <span className="text-success">✅ Approved</span>
                        )}
                        {registration.status === 'rejected' && (
                          <span className="text-danger">❌ Rejected</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
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
              <p><strong>Performance:</strong> {rejectModal.registration.performanceType}</p>
              
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

export default ClubRegistrationsPage;
