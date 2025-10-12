import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { 
  FaFileDownload, 
  FaChartBar, 
  FaHistory,
  FaCalendarAlt,
  FaBuilding,
  FaGraduationCap
} from 'react-icons/fa';
import '../../styles/Reports.css';

function ReportsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardStats, setDashboardStats] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Report generation states
  const [clubActivityYear, setClubActivityYear] = useState(new Date().getFullYear());
  const [selectedClub, setSelectedClub] = useState('');
  const [naacYear, setNaacYear] = useState(new Date().getFullYear());
  const [annualYear, setAnnualYear] = useState(new Date().getFullYear());
  const [clubs, setClubs] = useState([]);

  const isAdminOrCoordinator = user?.roles?.global === 'admin' || user?.roles?.global === 'coordinator';

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardStats();
    } else if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab]);

  useEffect(() => {
    fetchClubs();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/reports/dashboard');
      setDashboardStats(response.data.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/reports/audit-logs', {
        params: { limit: 50, page: 1 }
      });
      setAuditLogs(response.data.data.items || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchClubs = async () => {
    try {
      const response = await api.get('/clubs');
      setClubs(response.data.data.items || []);
    } catch (err) {
      console.error('Error fetching clubs:', err);
    }
  };

  const generateClubActivityReport = async () => {
    if (!selectedClub) {
      alert('Please select a club');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post(
        `/reports/clubs/${selectedClub}/activity/${clubActivityYear}`,
        {},
        { responseType: 'blob' }
      );

      // Download the file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `club-activity-${clubActivityYear}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      alert('Report generated successfully!');
    } catch (err) {
      console.error('Error generating report:', err);
      alert('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const generateNAACReport = async () => {
    try {
      setLoading(true);
      const response = await api.post(
        `/reports/naac/${naacYear}`,
        {},
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `NAAC-Report-${naacYear}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      alert('NAAC Report generated successfully!');
    } catch (err) {
      console.error('Error generating NAAC report:', err);
      alert('Failed to generate NAAC report');
    } finally {
      setLoading(false);
    }
  };

  const generateAnnualReport = async () => {
    try {
      setLoading(true);
      const response = await api.post(
        `/reports/annual/${annualYear}`,
        {},
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Annual-Report-${annualYear}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      alert('Annual Report generated successfully!');
    } catch (err) {
      console.error('Error generating annual report:', err);
      alert('Failed to generate annual report');
    } finally {
      setLoading(false);
    }
  };

  const downloadClubActivityExcel = async () => {
    try {
      setLoading(true);
      const response = await api.get('/reports/club-activity', {
        params: { format: 'excel' },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `club-activity-report.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error downloading Excel:', err);
      alert('Failed to download Excel report');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdminOrCoordinator) {
    return (
      <Layout>
        <div className="unauthorized">
          <h2>Access Denied</h2>
          <p>You don't have permission to view reports.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="reports-page">
        <div className="reports-header">
          <h1><FaChartBar /> Reports & Analytics</h1>
          <p>Generate reports and view system analytics</p>
        </div>

        <div className="reports-tabs">
          <button
            className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <FaChartBar /> Dashboard
          </button>
          <button
            className={`tab-btn ${activeTab === 'generate' ? 'active' : ''}`}
            onClick={() => setActiveTab('generate')}
          >
            <FaFileDownload /> Generate Reports
          </button>
          <button
            className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            <FaHistory /> Audit Logs
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="dashboard-stats">
            {loading ? (
              <div className="loading">Loading statistics...</div>
            ) : dashboardStats ? (
              <>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon">
                      <FaBuilding />
                    </div>
                    <div className="stat-content">
                      <h3>{dashboardStats.totalClubs || 0}</h3>
                      <p>Total Clubs</p>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon">
                      <FaGraduationCap />
                    </div>
                    <div className="stat-content">
                      <h3>{dashboardStats.totalStudents || 0}</h3>
                      <p>Total Students</p>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon">
                      <FaCalendarAlt />
                    </div>
                    <div className="stat-content">
                      <h3>{dashboardStats.totalEvents || 0}</h3>
                      <p>Total Events</p>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon">
                      <FaChartBar />
                    </div>
                    <div className="stat-content">
                      <h3>{dashboardStats.activeRecruitments || 0}</h3>
                      <p>Active Recruitments</p>
                    </div>
                  </div>
                </div>

                <div className="recent-activity">
                  <h2>Recent Activity Overview</h2>
                  <div className="activity-summary">
                    <div className="summary-item">
                      <strong>Pending Approvals:</strong>
                      <span>{dashboardStats.pendingApprovals || 0}</span>
                    </div>
                    <div className="summary-item">
                      <strong>Events This Month:</strong>
                      <span>{dashboardStats.eventsThisMonth || 0}</span>
                    </div>
                    <div className="summary-item">
                      <strong>New Members This Month:</strong>
                      <span>{dashboardStats.newMembersThisMonth || 0}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-state">No dashboard data available</div>
            )}
          </div>
        )}

        {/* Generate Reports Tab */}
        {activeTab === 'generate' && (
          <div className="generate-reports">
            <div className="report-section">
              <h2>Club Activity Report</h2>
              <p>Generate detailed activity report for a specific club and year</p>
              <div className="report-form">
                <div className="form-group">
                  <label>Select Club</label>
                  <select
                    value={selectedClub}
                    onChange={(e) => setSelectedClub(e.target.value)}
                  >
                    <option value="">-- Select Club --</option>
                    {clubs.map(club => (
                      <option key={club._id} value={club._id}>
                        {club.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Year</label>
                  <input
                    type="number"
                    value={clubActivityYear}
                    onChange={(e) => setClubActivityYear(e.target.value)}
                    min="2020"
                    max={new Date().getFullYear()}
                  />
                </div>
                <button
                  className="btn btn-primary"
                  onClick={generateClubActivityReport}
                  disabled={loading || !selectedClub}
                >
                  <FaFileDownload /> Generate PDF
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={downloadClubActivityExcel}
                  disabled={loading}
                >
                  <FaFileDownload /> Download Excel
                </button>
              </div>
            </div>

            {user?.roles?.global === 'admin' && (
              <>
                <div className="report-section">
                  <h2>NAAC/NBA Report</h2>
                  <p>Generate compliance report for accreditation</p>
                  <div className="report-form">
                    <div className="form-group">
                      <label>Academic Year</label>
                      <input
                        type="number"
                        value={naacYear}
                        onChange={(e) => setNaacYear(e.target.value)}
                        min="2020"
                        max={new Date().getFullYear()}
                      />
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={generateNAACReport}
                      disabled={loading}
                    >
                      <FaFileDownload /> Generate NAAC Report
                    </button>
                  </div>
                </div>

                <div className="report-section">
                  <h2>Annual Report</h2>
                  <p>Generate comprehensive annual report for the institution</p>
                  <div className="report-form">
                    <div className="form-group">
                      <label>Year</label>
                      <input
                        type="number"
                        value={annualYear}
                        onChange={(e) => setAnnualYear(e.target.value)}
                        min="2020"
                        max={new Date().getFullYear()}
                      />
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={generateAnnualReport}
                      disabled={loading}
                    >
                      <FaFileDownload /> Generate Annual Report
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Audit Logs Tab */}
        {activeTab === 'audit' && (
          <div className="audit-logs">
            <h2>System Audit Logs</h2>
            {loading ? (
              <div className="loading">Loading audit logs...</div>
            ) : auditLogs.length > 0 ? (
              <div className="audit-table-container">
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>User</th>
                      <th>Action</th>
                      <th>Target</th>
                      <th>IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log._id}>
                        <td>{new Date(log.createdAt).toLocaleString()}</td>
                        <td>{log.user?.profile?.name || log.user?.email || 'System'}</td>
                        <td><span className="action-badge">{log.action}</span></td>
                        <td>{log.target}</td>
                        <td>{log.ip || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">No audit logs available</div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

export default ReportsPage;
