import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import clubService from '../../services/clubService';
import eventService from '../../services/eventService';
import recruitmentService from '../../services/recruitmentService';
import userService from '../../services/userService';
import { getClubLogoUrl, getClubLogoPlaceholder } from '../../utils/imageUtils';
import { ROLE_DISPLAY_NAMES, LEADERSHIP_ROLES } from '../../utils/roleConstants';
import '../../styles/Dashboard.css';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [clubMemberships, setClubMemberships] = useState([]);
  const [membershipLoading, setMembershipLoading] = useState(true);
  const [stats, setStats] = useState({
    myClubsCount: 0,
    activeClubs: 0,
    upcomingEvents: 0,
    openRecruitments: 0,
  });
  const [allClubs, setAllClubs] = useState([]);
  const [myClubsList, setMyClubsList] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [openRecruitments, setOpenRecruitments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Add timestamp to bypass stale cache
      const timestamp = Date.now();
      const [myClubsRes, allClubsRes, eventsRes, recruitmentsRes] = await Promise.all([
        userService.getMyClubs(), // Get student's clubs
        clubService.listClubs({ limit: 8, status: 'active', _t: timestamp }), // Get all active clubs
        eventService.list({ limit: 10, status: 'published', upcoming: true }), // ✅ Only future events
        recruitmentService.list({ limit: 5, status: 'open' }),
      ]);

      // Get club memberships
      const studentClubs = myClubsRes.data?.clubs || [];
      setClubMemberships(studentClubs);
      setMyClubsList(studentClubs);
      
      // Backend: successResponse(res, { total, clubs }) → { data: { total, clubs } }
      const activeClubs = allClubsRes.data?.clubs || [];
      setAllClubs(activeClubs);
      
      // Backend: successResponse(res, { total, events }) → { data: { total, events } }
      setUpcomingEvents(eventsRes.data?.events || []);
      
      // Backend: successResponse(res, { recruitments, total }) → { data: { recruitments, total } }
      setOpenRecruitments(recruitmentsRes.data?.recruitments || []);

      setStats({
        myClubsCount: studentClubs.length,
        activeClubs: allClubsRes.data?.total || 0, // Use total from backend (13), not array length (8)
        upcomingEvents: eventsRes.data?.total || 0,
        openRecruitments: recruitmentsRes.data?.total || 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setMembershipLoading(false);
    }
  };

  return (
    <Layout>
      <div className="dashboard">
        <div className="dashboard-header">
          <div>
            <h1>Welcome back, {user?.name}!</h1>
            <p>Here's what's happening with your clubs and events</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon-wrapper">
              <svg className="stat-icon" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <div className="stat-content">
              <h3 className="stat-title">My Clubs</h3>
              <p className="stat-subtitle">{stats.myClubsCount} / 3 clubs</p>
              <div className="stat-progress-wrapper">
                <div className="stat-progress-info">
                  <span className="stat-progress-label">Progress</span>
                  <span className="stat-progress-value">{Math.round((stats.myClubsCount / 3) * 100)}%</span>
                </div>
                <div className="stat-progress-bar">
                  <div className="stat-progress-fill" style={{ width: `${(stats.myClubsCount / 3) * 100}%` }}></div>
                </div>
              </div>
              <div className="stat-footer">
                <span className="stat-current">{stats.myClubsCount} / 3 clubs</span>
                {stats.myClubsCount >= 3 && <span className="stat-badge">Max reached</span>}
              </div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon-wrapper">
              <svg className="stat-icon" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <div className="stat-content">
              <h3 className="stat-title">Upcoming Events</h3>
              <p className="stat-subtitle">{stats.upcomingEvents} events scheduled</p>
              <div className="stat-progress-wrapper">
                <div className="stat-progress-info">
                  <span className="stat-progress-label">Progress</span>
                  <span className="stat-progress-value">{Math.min(Math.round((stats.upcomingEvents / 15) * 100), 100)}%</span>
                </div>
                <div className="stat-progress-bar">
                  <div className="stat-progress-fill" style={{ width: `${Math.min((stats.upcomingEvents / 15) * 100, 100)}%` }}></div>
                </div>
              </div>
              <div className="stat-footer">
                <span className="stat-current">{stats.upcomingEvents} events</span>
                <span className="stat-badge">{stats.upcomingEvents > 0 ? 'Active' : 'None'}</span>
              </div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon-wrapper">
              <svg className="stat-icon" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8.5" cy="7" r="4"></circle>
                <line x1="20" y1="8" x2="20" y2="14"></line>
                <line x1="23" y1="11" x2="17" y2="11"></line>
              </svg>
            </div>
            <div className="stat-content">
              <h3 className="stat-title">Open Recruitments</h3>
              <p className="stat-subtitle">{stats.openRecruitments} positions available</p>
              <div className="stat-progress-wrapper">
                <div className="stat-progress-info">
                  <span className="stat-progress-label">Progress</span>
                  <span className="stat-progress-value">{Math.min(Math.round((stats.openRecruitments / 10) * 100), 100)}%</span>
                </div>
                <div className="stat-progress-bar">
                  <div className="stat-progress-fill" style={{ width: `${Math.min((stats.openRecruitments / 10) * 100, 100)}%` }}></div>
                </div>
              </div>
              <div className="stat-footer">
                <span className="stat-current">{stats.openRecruitments} open</span>
                <span className="stat-badge">{stats.openRecruitments > 0 ? 'Apply now' : 'None'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            <Link to="/clubs" className="action-card">
              <svg className="action-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                <circle cx="17" cy="8" r="2" opacity="0.6"/>
                <circle cx="7" cy="8" r="2" opacity="0.6"/>
              </svg>
              <div className="action-header">
                <h3>Explore Clubs</h3>
                <span className="action-arrow">→</span>
              </div>
              <p>Discover new clubs to join</p>
            </Link>
            <Link to="/recruitments" className="action-card">
              <svg className="action-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
                <rect x="8" y="12" width="8" height="2" rx="1"/>
                <rect x="8" y="16" width="6" height="2" rx="1"/>
                <circle cx="10" cy="9" r="1.5"/>
              </svg>
              <div className="action-header">
                <h3>Apply to Clubs</h3>
                <span className="action-arrow">→</span>
              </div>
              <p>View open recruitments</p>
            </Link>
            <Link to="/events" className="action-card">
              <svg className="action-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM5 8V6h14v2H5z"/>
                <rect x="7" y="12" width="3" height="3" rx="1"/>
                <rect x="11" y="12" width="3" height="3" rx="1"/>
                <rect x="15" y="12" width="3" height="3" rx="1"/>
              </svg>
              <div className="action-header">
                <h3>Browse Events</h3>
                <span className="action-arrow">→</span>
              </div>
              <p>Find exciting events</p>
            </Link>
            <Link to="/profile" className="action-card">
              <svg className="action-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
              </svg>
              <div className="action-header">
                <h3>My Profile</h3>
                <span className="action-arrow">→</span>
              </div>
              <p>Update your information</p>
            </Link>
          </div>
        </div>

        {/* Open Recruitments */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Open Recruitments</h2>
            <Link to="/recruitments" className="view-all">View All →</Link>
          </div>
          {loading ? (
            <div className="loading">Loading...</div>
          ) : openRecruitments.length > 0 ? (
            <div className="cards-grid">
              {openRecruitments.map((recruitment) => (
                <Link key={recruitment._id} to={`/recruitments/${recruitment._id}`} className="recruitment-card">
                  <div className="recruitment-header">
                    <h3>{recruitment.title}</h3>
                    <span className="recruitment-status">Open</span>
                  </div>
                  <p className="recruitment-description">{recruitment.description?.substring(0, 100)}...</p>
                  <div className="recruitment-footer">
                    <div className="recruitment-deadline">
                      <span className="deadline-label">Closes:</span>
                      <span className="deadline-date">{new Date(recruitment.endDate).toLocaleDateString()}</span>
                    </div>
                    <span className="apply-arrow">Apply →</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="no-data">No open recruitments at the moment</p>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Upcoming Events</h2>
            <Link to="/events" className="view-all">View All →</Link>
          </div>
          {loading ? (
            <div className="loading">Loading...</div>
          ) : upcomingEvents.length > 0 ? (
            <div className="events-list">
              {upcomingEvents.map((event) => (
                <Link key={event._id} to={`/events/${event._id}`} className="event-card">
                  <div className="event-date-badge">
                    <span className="day">{new Date(event.dateTime).getDate()}</span>
                    <span className="month">
                      {new Date(event.dateTime).toLocaleString('default', { month: 'short' })}
                    </span>
                  </div>
                  <div className="event-details">
                    <h3>{event.title}</h3>
                    <div className="event-meta">
                      <span className="event-meta-item">
                        <strong>Venue:</strong> {event.venue}
                      </span>
                      <span className="event-meta-item">
                        <strong>Time:</strong> {new Date(event.dateTime).toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                  </div>
                  <span className="event-arrow">→</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="no-data">No upcoming events</p>
          )}
        </div>

        {/* My Clubs */}
        <div className="my-clubs">
          <div className="my-clubs-header">
            <h2>My Clubs ({myClubsList.length}/3)</h2>
            {myClubsList.length < 3 && (
              <Link to="/recruitments" className="view-all">Join More Clubs →</Link>
            )}
          </div>
          {loading ? (
            <div className="loading">Loading...</div>
          ) : myClubsList.length > 0 ? (
            <div className="clubs-grid">
              {myClubsList.map((membership) => (
                <Link 
                  key={membership.club._id} 
                  to={membership.role === 'member' ? `/clubs/${membership.club._id}` : `/clubs/${membership.club._id}/dashboard`}
                  className="my-club-card"
                >
                  <div className="my-club-header">
                    <div className="club-logo-small">
                      {getClubLogoUrl(membership.club) ? (
                        <img src={getClubLogoUrl(membership.club)} alt={membership.club.name} />
                      ) : (
                        <div className="club-logo-placeholder">{getClubLogoPlaceholder(membership.club)}</div>
                      )}
                    </div>
                    <span className={`role-badge role-${
                      membership.role === 'president' || membership.role === 'vicePresident' ? 'leadership' : 
                      membership.role === 'core' || membership.role.includes('lead') || membership.role === 'secretary' || membership.role === 'treasurer' ? 'core' : 
                      'member'
                    }`}>
                      {ROLE_DISPLAY_NAMES[membership.role] || membership.role}
                    </span>
                  </div>
                  <div className="my-club-body">
                    <h3>{membership.club.name}</h3>
                    <span className="club-category-tag">{membership.club.category}</span>
                  </div>
                  <div className="my-club-footer">
                    <span className="club-action-link">
                      {membership.role === 'member' ? 'View Club' : 'Open Dashboard'} →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="no-data">
              <p>You haven't joined any clubs yet.</p>
              <Link to="/recruitments" className="btn btn-primary">Apply to Clubs</Link>
            </div>
          )}
        </div>

        {/* Explore All Clubs */}
        <div className="explore-clubs">
          <div className="explore-clubs-header">
            <h2>Explore Clubs</h2>
            <Link to="/clubs" className="view-all">View All →</Link>
          </div>
          {loading ? (
            <div className="loading">Loading...</div>
          ) : allClubs.length > 0 ? (
            <div className="clubs-grid">
              {allClubs.map((club) => (
                <Link key={club._id} to={`/clubs/${club._id}`} className="club-card-explore">
                  <div className="club-card-header">
                    <div className="club-logo-small">
                      {getClubLogoUrl(club) ? (
                        <img src={getClubLogoUrl(club)} alt={club.name} />
                      ) : (
                        <div className="club-logo-placeholder">{getClubLogoPlaceholder(club)}</div>
                      )}
                    </div>
                    <span className="club-category-badge">{club.category}</span>
                  </div>
                  <div className="club-card-body">
                    <h3>{club.name}</h3>
                    <p className="club-description">{club.description?.substring(0, 45)}...</p>
                  </div>
                  <div className="club-card-footer">
                    <span className="view-club-link">View Details →</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="no-data">No clubs available</p>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default StudentDashboard;