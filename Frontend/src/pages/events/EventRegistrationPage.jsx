import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import eventService from '../../services/eventService';
import registrationService from '../../services/registrationService';
import '../../styles/Forms.css';

const EventRegistrationPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    registrationType: 'audience',
    representingClub: '',
    performanceType: '',
    performanceDescription: '',
    notes: ''
  });

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      const response = await eventService.getById(id);
      const eventData = response.data?.data?.event || response.data?.event;
      console.log('📋 Event data received:', eventData);
      console.log('🤝 Participating clubs:', eventData?.participatingClubs);
      setEvent(eventData);
    } catch (error) {
      console.error('Error fetching event:', error);
      setError('Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      // Validate performer registration
      if (formData.registrationType === 'performer') {
        if (!formData.representingClub) {
          setError('Please select which club you are representing');
          setSubmitting(false);
          return;
        }
        if (!formData.performanceType) {
          setError('Please specify your performance type');
          setSubmitting(false);
          return;
        }
      }

      await registrationService.register(id, formData);
      alert('Registration successful! ');
      
      // Show appropriate message based on audition requirement
      if (formData.registrationType === 'performer') {
        if (event.requiresAudition) {
          alert('You will be notified about audition details soon.');
        } else {
          alert('Your registration is pending approval from the club.');
        }
      }
      
      navigate(`/events/${id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading event details...</p>
        </div>
      </Layout>
    );
  }

  if (!event) {
    return (
      <Layout>
        <div className="error-container">
          <h2>Event not found</h2>
          <button onClick={() => navigate('/events')} className="btn btn-primary">
            Back to Events
          </button>
        </div>
      </Layout>
    );
  }

  // Get all involved clubs (primary + participating)
  const allClubs = [];
  
  // Add primary club
  if (event.club) {
    allClubs.push({
      _id: event.club._id || event.club,
      name: event.club.name || 'Primary Club'
    });
  }
  
  // Add participating clubs
  if (event.participatingClubs && Array.isArray(event.participatingClubs)) {
    event.participatingClubs.forEach(club => {
      if (club) {
        allClubs.push({
          _id: club._id || club,
          name: club.name || 'Participating Club'
        });
      }
    });
  }
  
  console.log('✅ All clubs for dropdown:', allClubs);

  return (
    <Layout>
      <div className="form-page">
        <div className="form-container">
          <div className="form-header">
            <h1>Register for Event</h1>
            <p>Register for: <strong>{event.title}</strong></p>
            <p className="event-date">
              {new Date(event.dateTime).toLocaleString('en-US', { 
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {event.requiresAudition && (
            <div className="alert alert-info">
              <strong>Note:</strong> This event requires auditions for performers. 
              You will be notified about audition details after registration.
            </div>
          )}

          <form onSubmit={handleSubmit} className="form">
            <div className="form-section">
              <h3>Registration Type</h3>
              
              <div className="form-group">
                <label>
                  <input
                    type="radio"
                    name="registrationType"
                    value="audience"
                    checked={formData.registrationType === 'audience'}
                    onChange={handleChange}
                  />
                  <span>Register as Audience</span>
                </label>
                <small className="form-hint">Attend the event as a spectator</small>
              </div>

              {event.allowPerformerRegistrations && (
                <div className="form-group">
                  <label>
                    <input
                      type="radio"
                      name="registrationType"
                      value="performer"
                      checked={formData.registrationType === 'performer'}
                      onChange={handleChange}
                    />
                    <span>Register as Performer</span>
                  </label>
                  <small className="form-hint">
                    Participate as a performer in the event
                    {event.requiresAudition && ' (Audition required)'}
                  </small>
                </div>
              )}
            </div>

            {formData.registrationType === 'performer' && (
              <>
                <div className="form-section">
                  <h3>Performance Details</h3>
                  
                  <div className="form-group">
                    <label htmlFor="representingClub">Representing Club *</label>
                    <select
                      id="representingClub"
                      name="representingClub"
                      value={formData.representingClub}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select a club</option>
                      {allClubs.map(club => (
                        <option key={club._id} value={club._id}>
                          {club.name}
                        </option>
                      ))}
                    </select>
                    <small className="form-hint">
                      Which club are you performing for? (You can select any participating club)
                    </small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="performanceType">Performance Type *</label>
                    <input
                      type="text"
                      id="performanceType"
                      name="performanceType"
                      value={formData.performanceType}
                      onChange={handleChange}
                      placeholder="e.g., Classical Dance, Singing, Drama"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="performanceDescription">Performance Description</label>
                    <textarea
                      id="performanceDescription"
                      name="performanceDescription"
                      value={formData.performanceDescription}
                      onChange={handleChange}
                      rows="4"
                      placeholder="Describe what you will be performing..."
                    />
                  </div>
                </div>
              </>
            )}

            <div className="form-group">
              <label htmlFor="notes">Additional Notes (Optional)</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                placeholder="Any special requirements or information..."
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => navigate(`/events/${id}`)}
                className="btn btn-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Registration'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default EventRegistrationPage;
