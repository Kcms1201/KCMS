import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import recruitmentService from '../../services/recruitmentService';
import '../../styles/Applications.css';

const ApplicationsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [recruitment, setRecruitment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedApps, setSelectedApps] = useState([]);

  useEffect(() => {
    fetchApplications();
  }, [id, filter]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const [appsRes, recruitRes] = await Promise.all([
        recruitmentService.listApplications(id, filter !== 'all' ? { status: filter } : {}),
        recruitmentService.getById(id),
      ]);
      // Backend returns { items, total } not { applications }
      setApplications(appsRes.data?.items || []);
      setRecruitment(recruitRes.data?.data?.recruitment || recruitRes.data?.recruitment);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (appId, status) => {
    try {
      await recruitmentService.review(id, appId, { status });
      alert(`Application ${status} successfully!`);
      fetchApplications();
    } catch (error) {
      alert('Failed to update application status');
    }
  };

  const handleBulkReview = async (status) => {
    if (selectedApps.length === 0) {
      alert('Please select applications first');
      return;
    }

    try {
      await recruitmentService.bulkReview(id, {
        applicationIds: selectedApps,
        status,
      });
      alert(`${selectedApps.length} applications ${status} successfully!`);
      setSelectedApps([]);
      fetchApplications();
    } catch (error) {
      alert('Failed to update applications');
    }
  };

  const toggleSelection = (appId) => {
    setSelectedApps(prev =>
      prev.includes(appId)
        ? prev.filter(id => id !== appId)
        : [...prev, appId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedApps.length === applications.length) {
      setSelectedApps([]);
    } else {
      setSelectedApps(applications.map(app => app._id));
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'selected': return 'badge-success';
      case 'rejected': return 'badge-error';
      case 'waitlisted': return 'badge-warning';
      default: return 'badge-info';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading applications...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="applications-page">
        <div className="page-header">
          <div>
            <h1>Applications</h1>
            <p>{recruitment?.title || 'Recruitment'}</p>
          </div>
          <button onClick={() => navigate(`/recruitments/${id}`)} className="btn btn-outline">
            Back to Recruitment
          </button>
        </div>

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-box">
            <h3>{applications.length}</h3>
            <p>Total Applications</p>
          </div>
          <div className="stat-box">
            <h3>{applications.filter(a => a.status === 'submitted').length}</h3>
            <p>Pending Review</p>
          </div>
          <div className="stat-box">
            <h3>{applications.filter(a => a.status === 'selected').length}</h3>
            <p>Selected</p>
          </div>
          <div className="stat-box">
            <h3>{applications.filter(a => a.status === 'rejected').length}</h3>
            <p>Rejected</p>
          </div>
        </div>

        {/* Filters and Bulk Actions */}
        <div className="actions-bar">
          <div className="filter-buttons">
            <button
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              className={`filter-btn ${filter === 'submitted' ? 'active' : ''}`}
              onClick={() => setFilter('submitted')}
            >
              Pending
            </button>
            <button
              className={`filter-btn ${filter === 'selected' ? 'active' : ''}`}
              onClick={() => setFilter('selected')}
            >
              Selected
            </button>
            <button
              className={`filter-btn ${filter === 'rejected' ? 'active' : ''}`}
              onClick={() => setFilter('rejected')}
            >
              Rejected
            </button>
          </div>

          {selectedApps.length > 0 && (
            <div className="bulk-actions">
              <span>{selectedApps.length} selected</span>
              <button onClick={() => handleBulkReview('selected')} className="btn btn-success btn-sm">
                Select All
              </button>
              <button onClick={() => handleBulkReview('waitlisted')} className="btn btn-warning btn-sm">
                Waitlist All
              </button>
              <button onClick={() => handleBulkReview('rejected')} className="btn btn-danger btn-sm">
                Reject All
              </button>
            </div>
          )}
        </div>

        {/* Applications List */}
        {applications.length > 0 ? (
          <div className="applications-list">
            <div className="applications-header">
              <input
                type="checkbox"
                checked={selectedApps.length === applications.length}
                onChange={toggleSelectAll}
              />
              <span>Select All</span>
            </div>

            {applications.map((app) => (
              <div key={app._id} className="application-card">
                <div className="application-select">
                  <input
                    type="checkbox"
                    checked={selectedApps.includes(app._id)}
                    onChange={() => toggleSelection(app._id)}
                  />
                </div>

                <div className="application-content">
                  <div className="application-header">
                    <div>
                      <h3>{app.user?.profile?.name || app.user?.email || 'Unknown'}</h3>
                      <p className="application-meta">
                        {app.user?.email} • Applied: {new Date(app.appliedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`badge ${getStatusBadgeClass(app.status)}`}>
                      {app.status}
                    </span>
                  </div>

                  <div className="application-body">
                    {app.answers && app.answers.length > 0 ? (
                      app.answers.map((item, index) => (
                        <div key={index} className="application-section">
                          <h4>{item.question}</h4>
                          <p>{item.answer}</p>
                        </div>
                      ))
                    ) : (
                      <p className="no-data">No answers provided</p>
                    )}
                  </div>

                  {app.status === 'submitted' && (
                    <div className="application-actions">
                      <button
                        onClick={() => handleReview(app._id, 'selected')}
                        className="btn btn-success btn-sm"
                      >
                        Select
                      </button>
                      <button
                        onClick={() => handleReview(app._id, 'waitlisted')}
                        className="btn btn-warning btn-sm"
                      >
                        Waitlist
                      </button>
                      <button
                        onClick={() => handleReview(app._id, 'rejected')}
                        className="btn btn-danger btn-sm"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-results">
            <p>No applications found</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ApplicationsPage;
