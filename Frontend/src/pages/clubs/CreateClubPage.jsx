import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import clubService from '../../services/clubService';
import userService from '../../services/userService';
import '../../styles/Forms.css';

const CreateClubPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    vision: '',
    mission: '',
    coordinator: '',
    president: '',
  });
  const [logo, setLogo] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [coordinators, setCoordinators] = useState([]);
  const [students, setStudents] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const categories = ['technical', 'cultural', 'sports', 'arts', 'social'];

  // Fetch coordinators and students on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      // Fetch coordinators and students separately
      const [coordResponse, studentResponse] = await Promise.all([
        userService.listUsers({ role: 'coordinator', limit: 100 }),
        userService.listUsers({ role: 'student', limit: 100 })
      ]);

      setCoordinators(coordResponse.data?.users || []);
      setStudents(studentResponse.data?.users || []);
      
      console.log('✅ Loaded users:', {
        coordinators: coordResponse.data?.users?.length || 0,
        students: studentResponse.data?.users?.length || 0
      });
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please refresh the page.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Logo size must be less than 2MB');
        return;
      }
      setLogo(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        formDataToSend.append(key, formData[key]);
      });
      if (logo) {
        formDataToSend.append('logo', logo);
      }

      const response = await clubService.createClub(formDataToSend);
      alert('Club created successfully! Redirecting to dashboard...');
      navigate(`/clubs/${response.data.club._id}/dashboard`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create club. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="form-page">
        <div className="form-container">
          <div className="form-header">
            <h1>Create New Club</h1>
            <p>Add a new club to the KMIT Clubs Hub</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit} className="form">
            <div className="form-group">
              <label htmlFor="name">Club Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter club name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="category">Category *</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="description">Description *</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Brief description of the club (50-500 characters)"
                rows="3"
                minLength="50"
                maxLength="500"
                required
              />
              <small className="form-hint">
                {formData.description.length}/500 characters
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="vision">Vision</label>
              <textarea
                id="vision"
                name="vision"
                value={formData.vision}
                onChange={handleChange}
                placeholder="Club's vision statement"
                rows="2"
              />
            </div>

            <div className="form-group">
              <label htmlFor="mission">Mission</label>
              <textarea
                id="mission"
                name="mission"
                value={formData.mission}
                onChange={handleChange}
                placeholder="Club's mission statement"
                rows="2"
              />
            </div>

            <div className="form-group">
              <label htmlFor="coordinator">Faculty Coordinator *</label>
              <select
                id="coordinator"
                name="coordinator"
                value={formData.coordinator}
                onChange={handleChange}
                required
                disabled={loadingUsers}
              >
                <option value="">
                  {loadingUsers ? 'Loading coordinators...' : '-- Select Faculty Coordinator --'}
                </option>
                {coordinators.map((coord) => (
                  <option key={coord._id} value={coord._id}>
                    {coord.profile?.name || 'No Name'} ({coord.email}) - {coord.profile?.department || 'N/A'}
                  </option>
                ))}
              </select>
              <small className="form-hint">
                Faculty member who will oversee this club (must have coordinator role)
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="president">Club President *</label>
              <select
                id="president"
                name="president"
                value={formData.president}
                onChange={handleChange}
                required
                disabled={loadingUsers}
              >
                <option value="">
                  {loadingUsers ? 'Loading students...' : '-- Select Club President --'}
                </option>
                {students.map((student) => (
                  <option key={student._id} value={student._id}>
                    {student.rollNumber} - {student.profile?.name || 'No Name'} ({student.profile?.year || 'N/A'} Year)
                  </option>
                ))}
              </select>
              <small className="form-hint">
                Student who will lead this club (must have student role)
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="logo">Club Logo</label>
              <input
                type="file"
                id="logo"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleLogoChange}
              />
              <small className="form-hint">
                Max 2MB, square image recommended
              </small>
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => navigate('/clubs')}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Creating...' : 'Create Club'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default CreateClubPage;
