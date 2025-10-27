import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import recruitmentService from '../../services/recruitmentService';
import '../../styles/Forms.css';

const EditRecruitmentPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    eligibility: '',
  });
  const [customQuestions, setCustomQuestions] = useState(['']);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRecruitment();
  }, [id]);

  const fetchRecruitment = async () => {
    try {
      const response = await recruitmentService.getById(id);
      const recruitment = response.data?.data?.recruitment || response.data?.recruitment;
      
      // Format dates for input[type="date"]
      const startDate = new Date(recruitment.startDate).toISOString().split('T')[0];
      const endDate = new Date(recruitment.endDate).toISOString().split('T')[0];
      
      setFormData({
        title: recruitment.title || '',
        description: recruitment.description || '',
        startDate: startDate,
        endDate: endDate,
        eligibility: recruitment.eligibility || '',
      });
      
      setCustomQuestions(recruitment.customQuestions && recruitment.customQuestions.length > 0 
        ? recruitment.customQuestions 
        : ['']
      );
      
      // Check if can edit (only draft or scheduled)
      if (recruitment.status !== 'draft' && recruitment.status !== 'scheduled') {
        setError('Can only edit recruitments in Draft or Scheduled status');
      }
      
    } catch (err) {
      setError('Failed to load recruitment details');
    } finally {
      setLoading(false);
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
    setSaving(true);
    setError('');

    // Validate recruitment duration (max 14 days)
    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);
    const durationDays = (endDate - startDate) / (1000 * 60 * 60 * 24);

    if (durationDays > 14) {
      setError('Recruitment duration cannot exceed 14 days (Workplan requirement)');
      setSaving(false);
      return;
    }

    if (durationDays < 1) {
      setError('End date must be at least 1 day after start date');
      setSaving(false);
      return;
    }

    try {
      const dataToSend = {
        title: formData.title,
        description: formData.description,
        startDate: formData.startDate,
        endDate: formData.endDate,
        customQuestions: customQuestions.filter(q => q.trim() !== ''),
      };

      if (formData.eligibility && formData.eligibility.trim() !== '') {
        dataToSend.eligibility = formData.eligibility;
      }

      await recruitmentService.update(id, dataToSend);
      
      alert('Recruitment updated successfully!');
      navigate(`/recruitments/${id}`);
    } catch (err) {
      const errorMessage = err.response?.data?.message 
        || err.response?.data?.error 
        || err.message 
        || 'Failed to update recruitment. Please try again.';
      
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading recruitment...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="form-page">
        <div className="form-container">
          <div className="form-header">
            <h1>Edit Recruitment</h1>
            <p>Update recruitment details (dates, description, questions)</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit} className="form">
            <div className="form-group">
              <label htmlFor="title">Recruitment Title *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Tech Club Recruitment 2024"
                maxLength="100"
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
                rows="5"
                maxLength="1000"
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
                  min={formData.startDate}
                  required
                />
                <small className="form-hint">
                  Max 14 days from start date
                </small>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="eligibility">Eligibility Criteria</label>
              <input
                type="text"
                id="eligibility"
                name="eligibility"
                value={formData.eligibility}
                onChange={handleChange}
                placeholder="e.g., Open to all students except 1st years"
                maxLength="500"
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
                    maxLength="200"
                  />
                  {customQuestions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuestion(index)}
                      className="btn-remove"
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
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: '10px' }}
                >
                  + Add Question
                </button>
              )}
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => navigate(`/recruitments/${id}`)}
                className="btn btn-secondary"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default EditRecruitmentPage;
