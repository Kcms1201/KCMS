import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import clubService from '../../services/clubService';
import { getClubLogoUrl, getClubLogoPlaceholder } from '../../utils/imageUtils';
import '../../styles/Clubs.css';

const ClubsPage = () => {
  const { user } = useAuth();
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: '',
    search: '',
    status: 'active',
  });

  const categories = ['technical', 'cultural', 'sports', 'arts', 'social'];

  useEffect(() => {
    fetchClubs();
  }, [filters]);

  const fetchClubs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.category) params.category = filters.category;
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      
      // ✅ If user is coordinator, filter by their assigned clubs only
      if (user?.roles?.global === 'coordinator') {
        params.coordinator = user._id;
      }

      const response = await clubService.listClubs(params);
      // Backend: successResponse(res, { total, clubs }) → { status, data: { total, clubs } }
      setClubs(response.data?.clubs || []);
    } catch (error) {
      console.error('Error fetching clubs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  return (
    <Layout>
      <div className="clubs-page">
        <div className="page-header">
          <div>
            {user?.roles?.global === 'coordinator' ? (
              <h1>My Clubs</h1>
            ) : (
              <>
                <h1>Explore Clubs</h1>
                <p>Discover and join clubs that match your interests</p>
              </>
            )}
          </div>
          {user?.roles?.global === 'admin' && (
            <Link to="/clubs/create" className="btn btn-primary">
              + Create Club
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="filters-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search clubs..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>

          <div className="filter-buttons">
            <button
              className={`filter-btn ${filters.category === '' ? 'active' : ''}`}
              onClick={() => handleFilterChange('category', '')}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category}
                className={`filter-btn ${filters.category === category ? 'active' : ''}`}
                onClick={() => handleFilterChange('category', category)}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Clubs Grid */}
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading clubs...</p>
          </div>
        ) : clubs.length > 0 ? (
          <div className="clubs-grid">
            {clubs.map((club) => (
              <div key={club._id} className="club-card">
                <div className="club-card-header">
                  <div className="club-logo">
                    {getClubLogoUrl(club) ? (
                      <img src={getClubLogoUrl(club)} alt={club.name} />
                    ) : (
                      <div className="club-logo-placeholder">
                        {getClubLogoPlaceholder(club)}
                      </div>
                    )}
                  </div>
                  <span className={`club-status status-${club.status}`}>
                    {club.status}
                  </span>
                </div>

                <div className="club-card-body">
                  <h3>{club.name}</h3>
                  <span className="club-category">
                    {club.category}
                  </span>
                  <p className="club-description">{club.description}</p>

                  <div className="club-stats">
                    <div className="stat">
                      <span className="stat-icon">👥</span>
                      <span>{club.memberCount || 0} members</span>
                    </div>
                    <div className="stat">
                      <span className="stat-icon">📅</span>
                      <span>{club.eventCount || 0} events</span>
                    </div>
                  </div>
                </div>

                <div className="club-card-footer">
                  <Link to={`/clubs/${club._id}`} className="btn btn-primary btn-block">
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-results">
            <p>No clubs found matching your criteria</p>
            <button onClick={() => setFilters({ category: '', search: '', status: 'active' })} className="btn btn-outline">
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ClubsPage;
