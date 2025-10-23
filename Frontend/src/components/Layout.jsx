import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import notificationService from '../services/notificationService';
import '../styles/Layout.css';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [seenNotifications, setSeenNotifications] = useState(new Set());
  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);
  const fetchingRef = useRef(false); // Prevent concurrent fetches
  const lastFetchRef = useRef(0); // Track last fetch time

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000); // Poll every 60s
    return () => clearInterval(interval);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUnreadCount = async () => {
    // Debounce: Prevent fetching if already fetching or fetched recently (within 5 seconds)
    const now = Date.now();
    if (fetchingRef.current || (now - lastFetchRef.current) < 5000) {
      return;
    }

    fetchingRef.current = true;
    lastFetchRef.current = now;

    try {
      const response = await notificationService.countUnread();
      setUnreadCount(response.data.count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    } finally {
      fetchingRef.current = false;
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await notificationService.list({ limit: 10 });
      const newNotifications = response.data.items || response.data.notifications || [];
      
      // Filter out already seen notifications to prevent duplicates
      const unseenNotifications = newNotifications.filter(
        notif => !seenNotifications.has(notif._id)
      );
      
      // Add new notification IDs to seen set
      const newSeenIds = new Set(seenNotifications);
      unseenNotifications.forEach(notif => newSeenIds.add(notif._id));
      setSeenNotifications(newSeenIds);
      
      setNotifications(newNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleNotificationClick = async () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      await fetchNotifications();
    }
  };

  const handleNotificationItemClick = async (notif) => {
    // Mark as read if unread
    if (!notif.isRead && !notif.read) {
      try {
        await notificationService.markRead(notif._id, true);
        setNotifications(notifications.map(n => 
          n._id === notif._id ? { ...n, isRead: true, read: true } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
    
    setShowNotifications(false);
    
    // Navigate based on notification type
    const payload = notif.payload || {};
    if (payload.eventId) {
      navigate(`/events/${payload.eventId}`);
    } else if (payload.recruitmentId) {
      navigate(`/recruitments/${payload.recruitmentId}`);
    } else if (payload.clubId) {
      navigate(`/clubs/${payload.clubId}`);
    }
  };

  const handleDismissNotification = async (e, notifId) => {
    e.stopPropagation();
    try {
      await notificationService.markRead(notifId, true);
      setNotifications(notifications.filter(n => n._id !== notifId));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getDashboardLink = () => {
    if (user?.roles?.global === 'admin') return '/admin/dashboard';
    if (user?.roles?.global === 'coordinator') return '/coordinator/dashboard';
    // ✅ All students (including those with club roles) go to StudentDashboard
    // They can access individual club dashboards from "My Clubs" section
    return '/dashboard';
  };

  return (
    <div className="layout">
      <nav className="navbar-dashboard">
        <div className="navbar-content">
          <div className="navbar-left">
            <Link to={getDashboardLink()} className="logo">
              KMIT Clubs Hub
            </Link>
            <div className="nav-links">
              <Link to="/clubs" className="nav-link">Clubs</Link>
              <Link to="/events" className="nav-link">Events</Link>
              <Link to="/recruitments" className="nav-link">Recruitments</Link>
              <Link to="/gallery" className="nav-link">Gallery</Link>
              {(user?.roles?.global === 'admin' || user?.roles?.global === 'coordinator') && (
                <Link to="/reports" className="nav-link">Reports</Link>
              )}
              {user?.roles?.global === 'admin' && (
                <Link to="/admin/users" className="nav-link">Users</Link>
              )}
            </div>
          </div>

          <div className="navbar-right">
            {/* Notifications */}
            <div className="notification-wrapper" ref={notificationRef}>
              <button className="icon-btn" onClick={handleNotificationClick}>
                <svg className="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
              </button>

              {showNotifications && (
                <div className="notification-dropdown">
                  <div className="notification-header">
                    <h3>Notifications</h3>
                    <button className="close-btn" onClick={() => setShowNotifications(false)}>✕</button>
                  </div>
                  <div className="notification-list">
                    {notifications.length > 0 ? (
                      notifications.map((notif) => (
                        <div 
                          key={notif._id} 
                          className={`notification-item ${(notif.isRead || notif.read) ? 'read' : 'unread'}`}
                          onClick={() => handleNotificationItemClick(notif)}
                        >
                          <div className="notification-content">
                            <div className="notification-title-row">
                              <p className="notification-title">{notif.title || 'New Notification'}</p>
                              {!(notif.isRead || notif.read) && <span className="unread-dot">●</span>}
                            </div>
                            <p className="notification-message">{notif.message}</p>
                            <span className="notification-time">
                              {formatTimeAgo(new Date(notif.createdAt))}
                            </span>
                          </div>
                          <button 
                            className="dismiss-btn"
                            onClick={(e) => handleDismissNotification(e, notif._id)}
                            title="Dismiss"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="no-notifications">
                        <svg className="no-notif-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                        <p>No notifications</p>
                        <small>You're all caught up!</small>
                      </div>
                    )}
                  </div>
                  <div className="notification-footer">
                    <Link to="/notifications" onClick={() => setShowNotifications(false)}>
                      View All Notifications →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Search Icon */}
            <Link to="/search" className="icon-btn">
              <svg className="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
            </Link>

            {/* User Menu */}
            <div className="user-menu-wrapper" ref={userMenuRef}>
              <button className="user-btn" onClick={() => setShowUserMenu(!showUserMenu)}>
                <span className="user-avatar">{user?.name?.charAt(0) || 'U'}</span>
                <span className="user-name">{user?.name}</span>
              </button>

              {showUserMenu && (
                <div className="user-dropdown">
                  <div className="user-info">
                    <p className="user-name-full">{user?.name}</p>
                    <p className="user-email">{user?.email}</p>
                    <span className="user-role">
                      {user?.roles?.global || 'Student'}
                    </span>
                  </div>
                  <div className="user-menu-divider"></div>
                  <Link to="/profile" className="user-menu-item" onClick={() => setShowUserMenu(false)}>
                    Profile
                  </Link>
                  <Link to={getDashboardLink()} className="user-menu-item" onClick={() => setShowUserMenu(false)}>
                    Dashboard
                  </Link>
                  <div className="user-menu-divider"></div>
                  <button onClick={handleLogout} className="user-menu-item logout">
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="main-content">{children}</main>

      <footer className="footer-dashboard">
        <p>&copy; 2024 KMIT Clubs Hub. All rights reserved.</p>
      </footer>
    </div>
  );
};

// Helper function to format time ago
function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export default Layout;