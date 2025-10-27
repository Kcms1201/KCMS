import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Auth Pages (OLD STRUCTURE - REVERTED)
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import VerifyOtpPage from './pages/auth/VerifyOtpPage';
import CompleteProfilePage from './pages/auth/CompleteProfilePage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Club Pages (OLD STRUCTURE)
import ClubsPage from './pages/clubs/ClubsPage';
import ClubDetailPage from './pages/clubs/ClubDetailPage';
import ClubDashboard from './pages/clubs/ClubDashboard';
import ClubRegistrationsPage from './pages/clubs/ClubRegistrationsPage';
import CreateClubPage from './pages/clubs/CreateClubPage';
import EditClubPage from './pages/clubs/EditClubPage';
import MemberAnalyticsPage from './pages/clubs/MemberAnalyticsPage';
import MemberActivityDetailPage from './pages/clubs/MemberActivityDetailPage';
import ClubMeetingsPage from './pages/clubs/ClubMeetingsPage';

// Event Pages (OLD STRUCTURE)
import EventsPage from './pages/events/EventsPage';
import EventDetailPage from './pages/events/EventDetailPage';
import EventRegistrationPage from './pages/events/EventRegistrationPage';
import CreateEventPage from './pages/events/CreateEventPage';
import EditEventPage from './pages/events/EditEventPage';
import OrganizerAttendancePage from './pages/events/OrganizerAttendancePage';

// Recruitment Pages (OLD STRUCTURE)
import RecruitmentsPage from './pages/recruitments/RecruitmentsPage';
import RecruitmentDetailPage from './pages/recruitments/RecruitmentDetailPage';
import CreateRecruitmentPage from './pages/recruitments/CreateRecruitmentPage';
import EditRecruitmentPage from './pages/recruitments/EditRecruitmentPage';
import ApplicationsPage from './pages/recruitments/ApplicationsPage';

// User Pages (OLD STRUCTURE)
import ProfilePage from './pages/user/ProfilePage';
import UsersManagementPage from './pages/user/UsersManagementPage';
import SessionsPage from './pages/user/SessionsPage';
import NotificationPreferencesPage from './pages/user/NotificationPreferencesPage';

// Admin Pages (OLD STRUCTURE)
import MaintenanceModePage from './pages/admin/MaintenanceModePage';
import SystemSettings from './pages/admin/SystemSettings';
import AuditLogs from './pages/admin/AuditLogs';
import ArchivedClubsPage from './pages/admin/ArchivedClubsPage';

// Dashboard Pages (OLD STRUCTURE)
import HomePage from './pages/public/HomePage';
import StudentDashboard from './pages/dashboards/StudentDashboard';
import AdminDashboard from './pages/dashboards/AdminDashboard';
import CoordinatorDashboard from './pages/dashboards/CoordinatorDashboard';

// Other Pages (OLD STRUCTURE)
import NotificationsPage from './pages/notifications/NotificationsPage';
import EmailUnsubscribePage from './pages/notifications/EmailUnsubscribePage';
import ReportsPage from './pages/reports/ReportsPage';
import GalleryPage from './pages/media/GalleryPage';
import SearchPage from './pages/search/SearchPage';
import CreateNotificationPage from './pages/admin/CreateNotificationPage';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import NotFound from './pages/NotFound';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-otp" element={<VerifyOtpPage />} />
          <Route path="/complete-profile" element={<CompleteProfilePage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected Routes - Dashboards */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coordinator/dashboard"
            element={
              <ProtectedRoute requiredRole="coordinator">
                <CoordinatorDashboard />
              </ProtectedRoute>
            }
          />
          {/* /core/dashboard route removed - club roles are not global roles */}
          {/* Users with club roles (president, core, etc.) should use StudentDashboard */}
          {/* StudentDashboard will show "My Clubs" section with their clubMemberships */}

          {/* Club Routes */}
          <Route
            path="/clubs"
            element={
              <ProtectedRoute>
                <ClubsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clubs/:clubId"
            element={
              <ProtectedRoute>
                <ClubDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clubs/:clubId/dashboard"
            element={
              <ProtectedRoute>
                <ClubDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clubs/:clubId/registrations"
            element={
              <ProtectedRoute>
                <ClubRegistrationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clubs/:clubId/member-analytics"
            element={
              <ProtectedRoute>
                <MemberAnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clubs/:clubId/members/:memberId/activity"
            element={
              <ProtectedRoute>
                <MemberActivityDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clubs/create"
            element={
              <ProtectedRoute requiredRole="admin">
                <CreateClubPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clubs/:clubId/edit"
            element={
              <ProtectedRoute>
                <EditClubPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clubs/:clubId/meetings"
            element={
              <ProtectedRoute>
                <ClubMeetingsPage />
              </ProtectedRoute>
            }
          />

          {/* Recruitment Routes */}
          <Route
            path="/recruitments"
            element={
              <ProtectedRoute>
                <RecruitmentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recruitments/:id"
            element={
              <ProtectedRoute>
                <RecruitmentDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recruitments/create"
            element={
              <ProtectedRoute>
                <CreateRecruitmentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recruitments/:id/edit"
            element={
              <ProtectedRoute>
                <EditRecruitmentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recruitments/:id/applications"
            element={
              <ProtectedRoute>
                <ApplicationsPage />
              </ProtectedRoute>
            }
          />

          {/* Event Routes */}
          <Route
            path="/events"
            element={
              <ProtectedRoute>
                <EventsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/:id"
            element={
              <ProtectedRoute>
                <EventDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/:id/register"
            element={
              <ProtectedRoute>
                <EventRegistrationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/create"
            element={
              <ProtectedRoute>
                <CreateEventPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/:id/edit"
            element={
              <ProtectedRoute>
                <EditEventPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/:id/organizer-attendance"
            element={
              <ProtectedRoute>
                <OrganizerAttendancePage />
              </ProtectedRoute>
            }
          />

          {/* User Routes */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/sessions"
            element={
              <ProtectedRoute>
                <SessionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/preferences"
            element={
              <ProtectedRoute>
                <NotificationPreferencesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute requiredRole="admin">
                <UsersManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/system"
            element={
              <ProtectedRoute requiredRole="admin">
                <MaintenanceModePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute requiredRole="admin">
                <SystemSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <ProtectedRoute requiredRole="admin">
                <AuditLogs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/archived-clubs"
            element={
              <ProtectedRoute requiredRole="admin">
                <ArchivedClubsPage />
              </ProtectedRoute>
            }
          />

          {/* Notification Routes */}
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />

          {/* Reports Routes */}
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <ReportsPage />
              </ProtectedRoute>
            }
          />

          {/* Media/Gallery Routes */}
          <Route
            path="/gallery"
            element={
              <ProtectedRoute>
                <GalleryPage />
              </ProtectedRoute>
            }
          />

          {/* Search Routes */}
          <Route
            path="/search"
            element={
              <ProtectedRoute>
                <SearchPage />
              </ProtectedRoute>
            }
          />

          {/* Email Unsubscribe (Public - uses token authentication) */}
          <Route path="/unsubscribe/:token" element={<EmailUnsubscribePage />} />

          {/* Admin: Create Notification */}
          <Route
            path="/admin/notifications/create"
            element={
              <ProtectedRoute requiredRole="admin">
                <CreateNotificationPage />
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
