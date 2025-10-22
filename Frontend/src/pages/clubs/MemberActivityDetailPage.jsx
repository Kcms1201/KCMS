import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import analyticsService from '../../services/analyticsService';
import Layout from '../../components/Layout';
import './MemberActivityDetailPage.css';

const MemberActivityDetailPage = () => {
  const { clubId, memberId } = useParams();
  const navigate = useNavigate();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [clubId, memberId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await analyticsService.getMemberActivity(clubId, memberId);
      setData(response.data?.data || response.data);
    } catch (err) {
      console.error('Failed to fetch member activity:', err);
      alert('Failed to load member activity');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="loading">Loading member activity...</div>
      </Layout>
    );
  }

  if (!data || !data.member) {
    return (
      <Layout>
        <div className="error">Member not found</div>
      </Layout>
    );
  }

  const member = data.member;
  const stats = data.stats || {};
  const events = data.events || [];
  const club = data.club || {};

  return (
    <Layout>
      <div className="member-activity-detail-page">
        <div className="page-header">
          <button onClick={() => navigate(`/clubs/${clubId}/member-analytics`)} className="back-btn">
            ← Back to Analytics
          </button>
          <h1>Member Activity Details</h1>
        </div>

        <div className="member-profile">
          <div className="profile-card">
            <div className="profile-info">
              <h2>{member.name}</h2>
              <p className="roll-number">{member.rollNumber}</p>
              <p className="department">{member.department}</p>
              <p className="club-role">{data.role || 'Member'} at {club.name}</p>
            </div>
          </div>
        </div>

        <div className="activity-summary">
          <div className="summary-card">
            <div className="summary-icon">📊</div>
            <div className="summary-content">
              <p className="summary-label">Total Events</p>
              <p className="summary-value">{stats.total || 0}</p>
            </div>
          </div>
          
          <div className="summary-card">
            <div className="summary-icon">🎯</div>
            <div className="summary-content">
              <p className="summary-label">As Organizer</p>
              <p className="summary-value">{stats.organized || 0}</p>
            </div>
          </div>
          
          <div className="summary-card">
            <div className="summary-icon">🤝</div>
            <div className="summary-content">
              <p className="summary-label">As Volunteer</p>
              <p className="summary-value">{stats.volunteered || 0}</p>
            </div>
          </div>
          
          <div className="summary-card">
            <div className="summary-icon">✅</div>
            <div className="summary-content">
              <p className="summary-label">Attendance Rate</p>
              <p className="summary-value">{stats.attendanceRate || 0}%</p>
            </div>
          </div>
        </div>

        <div className="event-history">
          <div className="history-header">
            <h2>📅 Event History</h2>
            <p className="subtitle">{events.length} events participated</p>
          </div>

          {events.length === 0 ? (
            <div className="no-events">
              <p>No event participation history yet</p>
            </div>
          ) : (
            <div className="events-table-container">
              <table className="events-table">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Date</th>
                    <th>Role</th>
                    <th>Attendance</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((evt) => {
                    const event = evt.event || evt;
                    const attendance = evt.attendance || {};
                    
                    return (
                      <tr key={evt._id || event._id}>
                        <td>
                          <div className="event-cell">
                            <p className="event-title">{event.title}</p>
                            <p className="event-club">{event.club?.name || club.name}</p>
                          </div>
                        </td>
                        <td className="date-cell">
                          {new Date(event.dateTime).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </td>
                        <td>
                          <span className={`role-badge role-${attendance.type || evt.participationType}`}>
                            {attendance.type === 'organizer' || evt.participationType === 'organizer' 
                              ? '🎯 Organizer' 
                              : '🤝 Volunteer'}
                          </span>
                        </td>
                        <td>
                          {attendance.status === 'present' || evt.attended ? (
                            <span className="attendance-badge present">✅ Present</span>
                          ) : attendance.status === 'absent' ? (
                            <span className="attendance-badge absent">❌ Absent</span>
                          ) : (
                            <span className="attendance-badge pending">⏳ Pending</span>
                          )}
                        </td>
                        <td>
                          <span className={`event-status-badge status-${event.status}`}>
                            {event.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="activity-timeline">
          <h2>📈 Activity Timeline</h2>
          {events.length > 0 ? (
            <div className="timeline">
              {events.slice(0, 5).map((evt, index) => {
                const event = evt.event || evt;
                const attendance = evt.attendance || {};
                
                return (
                  <div key={index} className="timeline-item">
                    <div className="timeline-marker">
                      {attendance.status === 'present' || evt.attended ? '✅' : '⏳'}
                    </div>
                    <div className="timeline-content">
                      <p className="timeline-date">
                        {new Date(event.dateTime).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                      <p className="timeline-title">{event.title}</p>
                      <p className="timeline-role">
                        {attendance.type === 'organizer' || evt.participationType === 'organizer'
                          ? 'Organizer'
                          : 'Volunteer'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="no-timeline">
              <p>No activity to display</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default MemberActivityDetailPage;
