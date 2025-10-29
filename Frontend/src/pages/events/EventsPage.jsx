import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import eventService from '../../services/eventService';
import '../../styles/Events.css';

const EventsPage = () => {
  const { user, clubMemberships } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming');
  
  // Check if user has any core/leadership role in any club
  const isClubManager = clubMemberships?.some(m => 
    ['president', 'vicePresident', 'core', 'secretary', 'treasurer', 'leadPR', 'leadTech'].includes(m.role)
  );

  useEffect(() => {
    fetchEvents();
  }, [filter]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = {};
      
      // ✅ Map filter to appropriate params
      if (filter === 'upcoming') {
        params.status = 'published';
        params.upcoming = true; // Only future events
      } else if (filter === 'ongoing') {
        params.status = 'ongoing';
      } else if (filter === 'completed') {
        params.status = 'completed';
      } else if (filter === 'pending_completion') {
        params.status = 'pending_completion';
      } else if (filter === 'draft' || filter === 'pending_coordinator' || filter === 'pending_admin') {
        params.status = filter;
      }
      // 'all' = no status filter

      const response = await eventService.list(params);
      // ✅ Fixed: eventService.list already returns response.data, so we access .data.events (not .data.data.events)
      setEvents(response.data?.events || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'draft': return 'badge-secondary';
      case 'pending': return 'badge-warning';
      case 'pending_coordinator': return 'badge-warning';
      case 'pending_admin': return 'badge-warning';
      case 'approved': return 'badge-info';
      case 'published': return 'badge-success';
      case 'ongoing': return 'badge-info';
      case 'pending_completion': return 'badge-warning';
      case 'completed': return 'badge-success';
      case 'cancelled': return 'badge-danger';
      default: return 'badge-info';
    }
  };

  return (
    <Layout>
      <div className="events-page">
        <div className="page-header">
          <div>
            <h1>Events</h1>
            <p>Discover and participate in exciting club events</p>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-section">
          <div className="filter-buttons">
            <button
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
               All
            </button>
            <button
              className={`filter-btn ${filter === 'upcoming' ? 'active' : ''}`}
              onClick={() => setFilter('upcoming')}
            >
               Upcoming
            </button>
            <button
              className={`filter-btn ${filter === 'ongoing' ? 'active' : ''}`}
              onClick={() => setFilter('ongoing')}
            >
               Ongoing
            </button>
            <button
              className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
              onClick={() => setFilter('completed')}
            >
               Completed
            </button>
            
            {/* Role-based filters - For club managers, coordinators and admins */}
            {(isClubManager || user?.roles?.global === 'coordinator' || user?.roles?.global === 'admin') && (
              <button
                className={`filter-btn ${filter === 'draft' ? 'active' : ''}`}
                onClick={() => setFilter('draft')}
              >
                📝 My Drafts
              </button>
            )}
            
            {user?.roles?.global === 'coordinator' && (
              <button
                className={`filter-btn ${filter === 'pending_coordinator' ? 'active' : ''}`}
                onClick={() => setFilter('pending_coordinator')}
              >
                ⏳ Pending Approval
              </button>
            )}
            
            {user?.roles?.global === 'admin' && (
              <button
                className={`filter-btn ${filter === 'pending_admin' ? 'active' : ''}`}
                onClick={() => setFilter('pending_admin')}
              >
                🔍 Admin Review
              </button>
            )}
            
            {/* Post-event filters - For club managers, coordinators and admins */}
            {(isClubManager || user?.roles?.global === 'coordinator' || user?.roles?.global === 'admin') && (
              <>
                <button
                  className={`filter-btn ${filter === 'pending_completion' ? 'active' : ''}`}
                  onClick={() => setFilter('pending_completion')}
                >
                  ⏳ Pending Completion
                </button>
              </>
            )}
          </div>
        </div>

        {/* Events List */}
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading events...</p>
          </div>
        ) : events.length > 0 ? (
          <div className="events-grid">
            {events.map((event) => {
              const eventDate = new Date(event.dateTime || event.date);
              const isValidDate = !isNaN(eventDate.getTime());
              
              return (
                <div key={event._id} className="event-card">
                  <div className="event-card-header">
                    <div className="event-date-badge">
                      <span className="day">{isValidDate ? eventDate.getDate() : '--'}</span>
                      <span className="month">
                        {isValidDate ? eventDate.toLocaleString('default', { month: 'short' }) : '---'}
                      </span>
                    </div>
                    <span className={`badge ${getStatusBadgeClass(event.status)}`}>
                      {event.status}
                    </span>
                  </div>

                <div className="event-card-body">
                  <h3>{event.title || event.name}</h3>
                  <p className="event-club">{event.club?.name || 'Unknown Club'}</p>
                  <p className="event-description">{event.description}</p>

                  <div className="event-meta">
                    <div className="meta-item">
                      <span className="meta-icon">📍</span>
                      <span>{event.venue || 'TBA'}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-icon">🕐</span>
                      <span>
                        {isValidDate ? eventDate.toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        }) : 'Time TBA'}
                      </span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-icon">👥</span>
                      <span>{event.expectedAttendees || event.capacity || 0} expected</span>
                    </div>
                  </div>
                </div>

                <div className="event-card-footer">
                  <Link to={`/events/${event._id}`} className="btn btn-outline btn-block">
                    View Details
                  </Link>
                </div>
              </div>
            );
            })}
          </div>
        ) : (
          <div className="no-results">
            <p>No events found</p>
            {filter !== 'all' && (
              <button onClick={() => setFilter('all')} className="btn btn-outline">
                View All Events
              </button>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default EventsPage;
