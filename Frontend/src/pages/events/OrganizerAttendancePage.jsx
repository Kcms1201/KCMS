import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import eventService from '../../services/eventService';
import Layout from '../../components/Layout';
import './OrganizerAttendancePage.css';

const OrganizerAttendancePage = () => {
  const { id: eventId } = useParams();
  const navigate = useNavigate();
  
  const [event, setEvent] = useState(null);
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch event details
      const eventResponse = await eventService.getById(eventId);
      const eventData = eventResponse.data?.data?.event || eventResponse.data?.event;
      setEvent(eventData);
      
      // ✅ FIX: Fetch organizers from separate endpoint
      const organizersResponse = await eventService.getEventOrganizers(eventId);
      const organizersData = organizersResponse.data?.data?.organizers || [];
      
      // Flatten the grouped structure into a single array
      const allOrganizers = [];
      organizersData.forEach(group => {
        group.members.forEach(member => {
          allOrganizers.push({
            user: {
              _id: member.userId,
              name: member.name,
              email: member.email,
              rollNumber: member.rollNumber
            },
            clubName: group.clubName,
            attendance: {
              status: member.attendanceStatus
            }
          });
        });
      });
      
      setOrganizers(allOrganizers);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAttendance = async (userId, status) => {
    try {
      await eventService.markAttendance(eventId, { userId, status });
      await fetchData(); // Refresh
    } catch (err) {
      alert('Failed to mark attendance: ' + (err.response?.data?.message || err.message));
    }
  };

  const filteredOrganizers = organizers.filter(org => {
    const name = org.user?.name || org.name || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <Layout>
        <div className="loading">Loading organizers...</div>
      </Layout>
    );
  }

  if (!event) {
    return (
      <Layout>
        <div className="error">Event not found</div>
      </Layout>
    );
  }

  const presentCount = organizers.filter(o => o.attendance?.status === 'present').length;
  const totalCount = organizers.length;
  const attendanceRate = totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(1) : 0;

  return (
    <Layout>
      <div className="organizer-attendance-page">
        <div className="attendance-header">
          <button onClick={() => navigate(`/events/${eventId}`)} className="back-btn">
            ← Back to Event
          </button>
          <h1>👥 Organizer Attendance</h1>
          <p className="event-name">{event.title}</p>
          <p className="event-date">
            {new Date(event.dateTime).toLocaleString('en-US', {
              dateStyle: 'full',
              timeStyle: 'short'
            })}
          </p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <p className="stat-label">Total Organizers</p>
              <p className="stat-value">{totalCount}</p>
            </div>
          </div>
          
          <div className="stat-card success">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <p className="stat-label">Present</p>
              <p className="stat-value">{presentCount}</p>
            </div>
          </div>
          
          <div className="stat-card warning">
            <div className="stat-icon">❌</div>
            <div className="stat-content">
              <p className="stat-label">Absent</p>
              <p className="stat-value">{totalCount - presentCount}</p>
            </div>
          </div>
          
          <div className="stat-card info">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <p className="stat-label">Attendance Rate</p>
              <p className="stat-value">{attendanceRate}%</p>
            </div>
          </div>
        </div>

        <div className="controls-section">
          <div className="search-filter">
            <input
              type="text"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {filteredOrganizers.length === 0 ? (
          <div className="no-data">
            <p>No organizers assigned to this event</p>
            <button onClick={() => navigate(`/events/${eventId}/edit`)}>
              Edit Event to Add Organizers
            </button>
          </div>
        ) : (
          <div className="organizer-table-container">
            <table className="organizer-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrganizers.map((organizer) => {
                  const user = organizer.user || organizer;
                  const isPresent = organizer.attendance?.status === 'present';
                  
                  return (
                    <tr key={organizer._id || user._id} className={isPresent ? 'present-row' : ''}>
                      <td>
                        <div className="member-info">
                          <p className="member-name">{user.name}</p>
                          <p className="member-roll">{user.rollNumber}</p>
                        </div>
                      </td>
                      <td>
                        <span className="role-badge">{user.clubRole || 'Member'}</span>
                      </td>
                      <td>
                        <span className={`type-badge type-${organizer.type}`}>
                          {organizer.type === 'organizer' ? '🎯 Organizer' : '🤝 Volunteer'}
                        </span>
                      </td>
                      <td>
                        {isPresent ? (
                          <span className="status-badge present">✅ Present</span>
                        ) : organizer.attendance?.status === 'absent' ? (
                          <span className="status-badge absent">❌ Absent</span>
                        ) : (
                          <span className="status-badge pending">⏳ Pending</span>
                        )}
                      </td>
                      <td>
                        <div className="action-buttons">
                          {!isPresent && (
                            <button
                              onClick={() => markAttendance(user._id, 'present')}
                              className="btn-mark-present"
                            >
                              ✓ Mark Present
                            </button>
                          )}
                          {isPresent && (
                            <button
                              onClick={() => markAttendance(user._id, 'absent')}
                              className="btn-mark-absent"
                            >
                              ✗ Mark Absent
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default OrganizerAttendancePage;
