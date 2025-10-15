import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import clubService from '../../services/clubService';
import eventService from '../../services/eventService';
import userService from '../../services/userService';
import '../../styles/Dashboard.css';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalClubs: 0,
    totalEvents: 0,
    totalUsers: 0,
    pendingApprovals: 0,
    activeClubs: 0,
    publishedEvents: 0,
  });
  const [recentClubs, setRecentClubs] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleApproveEvent = async (eventId) => {
    try {
      await eventService.changeStatus(eventId, 'approve'); // ✅ Use 'approve' not 'approveAdmin'
      alert('Event approved successfully!');
      fetchDashboardData(); // Refresh dashboard
    } catch (error) {
      console.error('Failed to approve event:', error);
      alert('Failed to approve event: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleRejectEvent = async (eventId) => {
    const reason = prompt('Please provide a reason for rejection (minimum 10 characters):');
    if (!reason || reason.length < 10) {
      alert('Rejection reason must be at least 10 characters');
      return;
    }

    try {
      await eventService.changeStatus(eventId, 'reject', { reason });
      alert('Event rejected successfully');
      fetchDashboardData(); // Refresh dashboard
    } catch (error) {
      console.error('Failed to reject event:', error);
      alert('Failed to reject event: ' + (error.response?.data?.message || error.message));
    }
  };

  const fetchDashboardData = async () => {
    try {
      // Add timestamp to bypass stale cache
      const timestamp = Date.now();
      const [clubsRes, eventsRes, usersRes, allClubsRes, allEventsRes] = await Promise.all([
        clubService.listClubs({ limit: 5, _t: timestamp }),
        eventService.list({ limit: 5 }),
        userService.listUsers({ limit: 10 }),
        clubService.listClubs({ limit: 100, _t: timestamp }), // Get all clubs for counts (max 100)
        eventService.list({ limit: 100 }), // Get all events for counts (max 100)
      ]);

      // Backend: successResponse(res, { clubs, total }) → { status, data: { clubs, total } }
      setRecentClubs(clubsRes.data?.clubs || []);
      setRecentEvents(eventsRes.data?.events || []);

      const allClubs = allClubsRes.data?.clubs || [];
      const allEvents = allEventsRes.data?.events || [];
      const activeClubsCount = allClubs.filter(c => c.status === 'active').length;
      const publishedEventsCount = allEvents.filter(e => e.status === 'published').length;
      
      // ✅ Admin pending approvals = Events with status 'pending_admin'
      // (Events with budget > 5000 or guest speakers require admin approval)
      const pendingAdminEvents = allEvents.filter(e => e.status === 'pending_admin');
      const pendingAdminApprovals = pendingAdminEvents.length;
      
      setPendingEvents(pendingAdminEvents);

      const calculatedStats = {
        totalClubs: allClubsRes.data?.total || allClubs.length,
        totalEvents: allEventsRes.data?.total || allEvents.length,
        totalUsers: usersRes.data?.total || 0,
        pendingApprovals: pendingAdminApprovals,
        activeClubs: activeClubsCount,
        publishedEvents: publishedEventsCount,
      };

      setStats(calculatedStats);
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      console.error('Error details:', error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="dashboard">
        <div className="dashboard-header">
          <div>
            <h1>Admin Dashboard 👨‍💼</h1>
            <p>Manage clubs, events, and users</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card stat-primary">
            <div className="stat-icon">🏢</div>
            <div className="stat-content">
              <h3>{stats.totalClubs}</h3>
              <p>Total Clubs</p>
            </div>
          </div>
          <div className="stat-card stat-success">
            <div className="stat-icon">📅</div>
            <div className="stat-content">
              <h3>{stats.totalEvents}</h3>
              <p>Total Events</p>
            </div>
          </div>
          <div className="stat-card stat-info">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <h3>{stats.totalUsers}</h3>
              <p>Total Users</p>
            </div>
          </div>
          <div className="stat-card stat-warning">
            <div className="stat-icon">⏳</div>
            <div className="stat-content">
              <h3>{stats.pendingApprovals}</h3>
              <p>Pending Approvals</p>
            </div>
          </div>
        </div>

        {/* Admin Actions */}
        <div className="quick-actions">
          <h2>Admin Actions</h2>
          <div className="actions-grid">
            <Link to="/clubs/create" className="action-card action-primary">
              <span className="action-icon">➕</span>
              <h3>Create Club</h3>
              <p>Add a new club to the system</p>
            </Link>
            <Link to="/admin/users" className="action-card action-info">
              <span className="action-icon">👥</span>
              <h3>Manage Users</h3>
              <p>View and manage all users</p>
            </Link>
            <Link to="/clubs" className="action-card action-success">
              <span className="action-icon">🏢</span>
              <h3>Manage Clubs</h3>
              <p>View and approve clubs</p>
            </Link>
            <Link to="/events" className="action-card action-warning">
              <span className="action-icon">📅</span>
              <h3>Manage Events</h3>
              <p>Approve and monitor events</p>
            </Link>
            <Link to="/admin/settings" className="action-card action-primary">
              <span className="action-icon">⚙️</span>
              <h3>System Settings</h3>
              <p>Configure global parameters</p>
            </Link>
            <Link to="/admin/audit-logs" className="action-card action-info">
              <span className="action-icon">📋</span>
              <h3>Audit Logs</h3>
              <p>View system activity logs</p>
            </Link>
            <Link to="/reports" className="action-card action-success">
              <span className="action-icon">📊</span>
              <h3>Reports</h3>
              <p>Generate NAAC/NBA reports</p>
            </Link>
            <Link to="/admin/archived-clubs" className="action-card action-warning">
              <span className="action-icon">🗄️</span>
              <h3>Archived Clubs</h3>
              <p>View and restore archived clubs</p>
            </Link>
          </div>
        </div>

        {/* Pending Admin Approvals */}
        {pendingEvents.length > 0 && (
          <div className="dashboard-section">
            <div className="section-header">
              <h2>⏳ Pending Admin Approvals</h2>
              <Link to="/events" className="view-all">View All →</Link>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Event Name</th>
                    <th>Club</th>
                    <th>Date</th>
                    <th>Budget</th>
                    <th>Reason</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingEvents.map((event) => {
                    const eventDate = new Date(event.dateTime || event.date);
                    const isValidDate = !isNaN(eventDate.getTime());
                    const reason = event.budget > 5000 
                      ? `Budget: ₹${event.budget}` 
                      : event.guestSpeakers?.length > 0 
                        ? 'Guest Speakers' 
                        : 'Requires Approval';
                    return (
                      <tr key={event._id}>
                        <td>{event.title || event.name}</td>
                        <td>{event.club?.name || 'N/A'}</td>
                        <td>{isValidDate ? eventDate.toLocaleDateString() : 'Date TBA'}</td>
                        <td>₹{event.budget || 0}</td>
                        <td><span className="badge badge-warning">{reason}</span></td>
                        <td>
                          <div className="action-buttons">
                            <Link to={`/events/${event._id}`} className="btn btn-sm btn-outline">
                              View
                            </Link>
                            <button 
                              onClick={() => handleApproveEvent(event._id)}
                              className="btn btn-sm btn-success"
                            >
                              ✓ Approve
                            </button>
                            <button 
                              onClick={() => handleRejectEvent(event._id)}
                              className="btn btn-sm btn-danger"
                            >
                              ✗ Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent Clubs */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>🏢 Recent Clubs</h2>
            <Link to="/clubs" className="view-all">View All →</Link>
          </div>
          {loading ? (
            <div className="loading">Loading...</div>
          ) : recentClubs.length > 0 ? (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Club Name</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Members</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentClubs.map((club) => (
                    <tr key={club._id}>
                      <td>
                        <div className="table-cell-with-icon">
                          {club.logo ? (
                            <img src={club.logo} alt={club.name} className="table-icon" />
                          ) : (
                            <div className="table-icon-placeholder">{club.name.charAt(0)}</div>
                          )}
                          <span>{club.name}</span>
                        </div>
                      </td>
                      <td><span className="badge badge-info">{club.category}</span></td>
                      <td>
                        <span className={`badge badge-${club.status === 'active' ? 'success' : 'warning'}`}>
                          {club.status}
                        </span>
                      </td>
                      <td>{club.memberCount || 0}</td>
                      <td>
                        <Link to={`/clubs/${club._id}`} className="btn btn-sm btn-outline">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="no-data">No clubs found</p>
          )}
        </div>

        {/* Recent Events */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>📅 Recent Events</h2>
            <Link to="/events" className="view-all">View All →</Link>
          </div>
          {loading ? (
            <div className="loading">Loading...</div>
          ) : recentEvents.length > 0 ? (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Event Name</th>
                    <th>Date</th>
                    <th>Venue</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEvents.map((event) => {
                    const eventDate = new Date(event.dateTime || event.date);
                    const isValidDate = !isNaN(eventDate.getTime());
                    return (
                    <tr key={event._id}>
                      <td>{event.title || event.name}</td>
                      <td>{isValidDate ? eventDate.toLocaleDateString() : 'Date TBA'}</td>
                      <td>{event.venue || 'TBA'}</td>
                      <td>
                        <span className={`badge badge-${
                          event.status === 'published' ? 'success' : 
                          event.status === 'pending_coordinator' ? 'warning' : 'info'
                        }`}>
                          {event.status}
                        </span>
                      </td>
                      <td>
                        <Link to={`/events/${event._id}`} className="btn btn-sm btn-outline">
                          View
                        </Link>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="no-data">No events found</p>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;
