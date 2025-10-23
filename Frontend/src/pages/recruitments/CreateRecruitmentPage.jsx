import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import clubService from '../../services/clubService';
import recruitmentService from '../../services/recruitmentService';
import { CORE_AND_LEADERSHIP } from '../../utils/roleConstants';
import '../../styles/Forms.css';

const CreateRecruitmentPage = () => {
  const navigate = useNavigate();
  const { user, clubMemberships } = useAuth();
  const [myClubs, setMyClubs] = useState([]);
  const [formData, setFormData] = useState({
    club: '',
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    positions: '',
    eligibility: '',
  });
  const [customQuestions, setCustomQuestions] = useState(['']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMyClubs();
  }, []);

  const fetchMyClubs = async () => {
    try {
      const response = await clubService.listClubs();
      const allClubs = response.data?.clubs || [];
      
      // Admins and Coordinators can see ALL clubs
      if (user?.roles?.global === 'admin' || user?.roles?.global === 'coordinator') {
        setMyClubs(allClubs);
      } else {
        // Filter clubs where user has management role (president, vicePresident, or core team)
        // Use clubMemberships from AuthContext (SINGLE SOURCE OF TRUTH)
        const managedClubIds = (clubMemberships || [])
          .filter(membership => CORE_AND_LEADERSHIP.includes(membership.role))
          .map(membership => membership.club?._id?.toString() || membership.club?.toString());
        
        const managedClubs = allClubs.filter(club => 
          managedClubIds.includes(club._id?.toString())
        );
        setMyClubs(managedClubs);
        
        // ✅ AUTO-SELECT if user has exactly ONE managed club
        if (managedClubs.length === 1) {
          setFormData(prev => ({
            ...prev,
            club: managedClubs[0]._id
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching clubs:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleQuestionChange = (index, value) => {
    const newQuestions = [...customQuestions];
    newQuestions[index] = value;
    setCustomQuestions(newQuestions);
  };

  const addQuestion = () => {
    if (customQuestions.length < 5) {
      setCustomQuestions([...customQuestions, '']);
    }
  };

  const removeQuestion = (index) => {
    const newQuestions = customQuestions.filter((_, i) => i !== index);
    setCustomQuestions(newQuestions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation: Check if club is selected
    if (!formData.club) {
      setError('Please select a club to create recruitment');
      setLoading(false);
      return;
    }

    try {
      // Prepare data - exclude positions since backend expects array of position names, not count
      const { positions, ...formDataWithoutPositions } = formData;
      
      const dataToSend = {
        ...formDataWithoutPositions,
        customQuestions: customQuestions.filter(q => q.trim() !== ''),
      };

      console.log('Creating recruitment with data:', dataToSend);
      const response = await recruitmentService.create(dataToSend);
      console.log('Recruitment created successfully:', response);
      alert('Recruitment created successfully!');
      navigate(`/recruitments/${response.data.recruitment._id}`);
    } catch (err) {
      console.error('Error creating recruitment:', err);
      setError(err.response?.data?.message || 'Failed to create recruitment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="form-page">
        <div className="form-container">
          <div className="form-header">
            <h1>Create Recruitment</h1>
            <p>Start recruiting new members for your club</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit} className="form">
            <div className="form-group">
              <label htmlFor="club">Select Club *</label>
              <select
                id="club"
                name="club"
                value={formData.club}
                onChange={handleChange}
                required
                disabled={myClubs.length === 1}
              >
                <option value="">Choose a club</option>
                {myClubs.map((club) => (
                  <option key={club._id} value={club._id}>
                    {club.name}
                  </option>
                ))}
              </select>
              {myClubs.length === 1 && (
                <small className="form-hint">
                  ✓ Auto-selected (you manage only one club)
                </small>
              )}
              {myClubs.length === 0 && (
                <small className="form-hint error-text">
                  You don't have permission to create recruitments for any club
                </small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="title">Recruitment Title *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Tech Club Recruitment 2024"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description *</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the recruitment and what you're looking for"
                rows="4"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="startDate">Start Date *</label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="endDate">End Date *</label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  min={formData.startDate || new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="positions">Number of Positions</label>
              <input
                type="number"
                id="positions"
                name="positions"
                value={formData.positions}
                onChange={handleChange}
                placeholder="e.g., 10"
                min="1"
              />
            </div>

            <div className="form-group">
              <label htmlFor="eligibility">Eligibility Criteria</label>
              <textarea
                id="eligibility"
                name="eligibility"
                value={formData.eligibility}
                onChange={handleChange}
                placeholder="e.g., Open to all years, CSE/IT students preferred"
                rows="2"
              />
            </div>

            <div className="form-group">
              <label>Custom Questions (Optional, max 5)</label>
              {customQuestions.map((question, index) => (
                <div key={index} className="question-input-group">
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => handleQuestionChange(index, e.target.value)}
                    placeholder={`Question ${index + 1}`}
                  />
                  {customQuestions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuestion(index)}
                      className="btn-icon btn-danger"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {customQuestions.length < 5 && (
                <button
                  type="button"
                  onClick={addQuestion}
                  className="btn btn-outline btn-sm"
                >
                  + Add Question
                </button>
              )}
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => navigate('/recruitments')}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={loading || myClubs.length === 0}
              >
                {loading ? 'Creating...' : 'Create Recruitment'}
              </button>
            </div>
            {myClubs.length === 0 && (
              <div className="alert alert-warning" style={{ marginTop: '1rem' }}>
                You need to be a core member or leadership of at least one club to create recruitments.
              </div>
            )}
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default CreateRecruitmentPage;
