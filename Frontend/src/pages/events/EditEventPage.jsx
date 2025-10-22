import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import eventService from '../../services/eventService';
import clubService from '../../services/clubService';
import '../../styles/Forms.css';

const EditEventPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [allClubs, setAllClubs] = useState([]);
  const [selectedParticipatingClubs, setSelectedParticipatingClubs] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    objectives: '',
    date: '',
    time: '',
    duration: '',
    venue: '',
    capacity: '',
    expectedAttendees: '',
    isPublic: true,
    budget: '',
    guestSpeakers: '',
    requiresAudition: false,
    allowPerformerRegistrations: true,
  });
  const [files, setFiles] = useState({
    proposal: null,
    budgetBreakdown: null,
    venuePermission: null,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchEventData();
    fetchAllClubs();
  }, [id]);

  const fetchAllClubs = async () => {
    try {
      const response = await clubService.listClubs();
      const clubs = response.data?.clubs || [];
      setAllClubs(clubs);
    } catch (error) {
      console.error('Error fetching clubs:', error);
    }
  };

  const fetchEventData = async () => {
    try {
      setLoading(true);
      const response = await eventService.getById(id);
      const eventData = response.data?.data?.event || response.data?.event;
      
      if (!eventData) {
        setError('Event not found');
        return;
      }

      // ✅ Only draft events can be edited
      if (eventData.status !== 'draft') {
        setError(`Cannot edit event with status '${eventData.status}'. Only draft events can be edited.`);
        setEvent(eventData);
        setLoading(false);
        return;
      }

      setEvent(eventData);

      // Pre-fill form with existing data
      const eventDate = eventData.dateTime ? new Date(eventData.dateTime) : null;
      setFormData({
        name: eventData.title || '',
        description: eventData.description || '',
        objectives: eventData.objectives || '',
        date: eventDate ? eventDate.toISOString().split('T')[0] : '',
        time: eventDate ? eventDate.toTimeString().slice(0, 5) : '',
        duration: eventData.duration || '',
        venue: eventData.venue || '',
        capacity: eventData.capacity || '',
        expectedAttendees: eventData.expectedAttendees || '',
        isPublic: eventData.isPublic !== undefined ? eventData.isPublic : true,
        budget: eventData.budget || '',
        guestSpeakers: eventData.guestSpeakers ? eventData.guestSpeakers.join(', ') : '',
        requiresAudition: eventData.requiresAudition || false,
        allowPerformerRegistrations: eventData.allowPerformerRegistrations !== undefined ? eventData.allowPerformerRegistrations : true,
      });

      // Pre-fill participating clubs
      if (eventData.participatingClubs && Array.isArray(eventData.participatingClubs)) {
        const clubIds = eventData.participatingClubs.map(club => 
          club._id || club
        );
        setSelectedParticipatingClubs(clubIds);
      }
    } catch (err) {
      console.error('Error fetching event:', err);
      setError(err.response?.data?.message || 'Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
    setError('');
  };

  const handleFileChange = (e) => {
    setFiles({
      ...files,
      [e.target.name]: e.target.files[0],
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const formDataToSend = new FormData();
      
      // Combine date and time
      const dateTime = new Date(`${formData.date}T${formData.time}`);
      
      // Append updated fields
      formDataToSend.append('title', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('objectives', formData.objectives);
      formDataToSend.append('dateTime', dateTime.toISOString());
      formDataToSend.append('duration', formData.duration);
      formDataToSend.append('venue', formData.venue);
      formDataToSend.append('capacity', formData.capacity);
      formDataToSend.append('expectedAttendees', formData.expectedAttendees);
      formDataToSend.append('isPublic', formData.isPublic);
      
      if (formData.budget) formDataToSend.append('budget', formData.budget);
      if (formData.guestSpeakers) {
        const speakers = formData.guestSpeakers.split(',').map(s => s.trim()).filter(s => s);
        if (speakers.length > 0) {
          formDataToSend.append('guestSpeakers', JSON.stringify(speakers));
        }
      }

      // Append participating clubs
      console.log('🚀 BEFORE SUBMIT - Selected clubs:', selectedParticipatingClubs);
      console.log('🚀 BEFORE SUBMIT - Number of clubs:', selectedParticipatingClubs.length);
      
      if (selectedParticipatingClubs.length > 0) {
        const clubsJSON = JSON.stringify(selectedParticipatingClubs);
        console.log('📤 Sending participatingClubs:', clubsJSON);
        formDataToSend.append('participatingClubs', clubsJSON);
      } else {
        console.warn('⚠️ No clubs selected, not sending participatingClubs field');
      }

      // Append audition and registration settings
      formDataToSend.append('requiresAudition', formData.requiresAudition);
      formDataToSend.append('allowPerformerRegistrations', formData.allowPerformerRegistrations);

      // Append new files (if uploaded)
      if (files.proposal) formDataToSend.append('proposal', files.proposal);
      if (files.budgetBreakdown) formDataToSend.append('budgetBreakdown', files.budgetBreakdown);
      if (files.venuePermission) formDataToSend.append('venuePermission', files.venuePermission);

      // Debug: Log all FormData entries
      console.log('📋 FormData contents:');
      for (let [key, value] of formDataToSend.entries()) {
        console.log(`  ${key}:`, value);
      }

      console.log('🚀 Calling eventService.update...');
      await eventService.update(id, formDataToSend);
      console.log('✅ Update successful!');
      alert('✅ Event updated successfully! Status remains as DRAFT. You can submit it for approval when ready.');
      navigate(`/events/${id}`);
    } catch (err) {
      console.error('Update error:', err);
      setError(err.response?.data?.message || 'Failed to update event. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="form-page">
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading event details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error && !event) {
    return (
      <Layout>
        <div className="form-page">
          <div className="form-container">
            <div className="error-container">
              <h2>❌ {error}</h2>
              <button onClick={() => navigate('/events')} className="btn btn-primary">
                Back to Events
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (event && event.status !== 'draft') {
    return (
      <Layout>
        <div className="form-page">
          <div className="form-container">
            <div className="error-container" style={{ 
              background: '#fee2e2', 
              border: '2px solid #dc2626',
              padding: '2rem'
            }}>
              <h2 style={{ color: '#991b1b', marginBottom: '1rem' }}>
                ⚠️ Cannot Edit Event
              </h2>
              <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
                This event has status: <strong>{event.status.toUpperCase()}</strong>
              </p>
              <p style={{ marginBottom: '1.5rem' }}>
                Only <strong>DRAFT</strong> events can be edited. Events that have been submitted or approved cannot be modified.
              </p>
              <button onClick={() => navigate(`/events/${id}`)} className="btn btn-primary">
                ← Back to Event Details
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="form-page">
        <div className="form-container">
          <div className="form-header">
            <h1>✏️ Edit Event</h1>
            <p>Update event details (Status will remain as <strong>DRAFT</strong>)</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <div className="alert alert-info" style={{ marginBottom: '1.5rem' }}>
            <strong>📝 Note:</strong> After editing, the event will remain in <strong>DRAFT</strong> status. 
            You can submit it for approval after saving changes.
          </div>

          <form onSubmit={handleSubmit} className="form">
            <div className="form-group">
              <label>Club</label>
              <div className="readonly-field">
                {event?.club?.name || 'Unknown Club'}
              </div>
              <small className="form-hint">Club cannot be changed after event creation</small>
            </div>

            <div className="form-group">
              <label htmlFor="name">Event Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter event name"
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
                placeholder="Describe the event"
                rows="3"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="objectives">Objectives *</label>
              <textarea
                id="objectives"
                name="objectives"
                value={formData.objectives}
                onChange={handleChange}
                placeholder="What are the objectives of this event?"
                rows="2"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="date">Date *</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="time">Time *</label>
                <input
                  type="time"
                  id="time"
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="duration">Duration (hours) *</label>
                <input
                  type="number"
                  id="duration"
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  placeholder="e.g., 2"
                  min="0.5"
                  step="0.5"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="venue">Venue *</label>
                <input
                  type="text"
                  id="venue"
                  name="venue"
                  value={formData.venue}
                  onChange={handleChange}
                  placeholder="e.g., Auditorium"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="capacity">Venue Capacity *</label>
                <input
                  type="number"
                  id="capacity"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleChange}
                  placeholder="e.g., 200"
                  min="1"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="expectedAttendees">Expected Attendees *</label>
                <input
                  type="number"
                  id="expectedAttendees"
                  name="expectedAttendees"
                  value={formData.expectedAttendees}
                  onChange={handleChange}
                  placeholder="e.g., 150"
                  min="1"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  name="isPublic"
                  checked={formData.isPublic}
                  onChange={handleChange}
                />
                <span>Open to all students (uncheck for members only)</span>
              </label>
            </div>

            <div className="form-group">
              <label htmlFor="budget">Budget (₹)</label>
              <input
                type="number"
                id="budget"
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                placeholder="Enter budget if required"
                min="0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="guestSpeakers">Guest Speakers (comma-separated)</label>
              <input
                type="text"
                id="guestSpeakers"
                name="guestSpeakers"
                value={formData.guestSpeakers}
                onChange={handleChange}
                placeholder="e.g., Dr. John Doe, Prof. Jane Smith"
              />
            </div>

            {/* Club Collaboration Section */}
            <div className="form-section">
              <h3>🤝 Club Collaboration</h3>
              <p className="section-description">
                Select additional clubs participating in this event.
                <br/><strong>Note:</strong> All members from selected clubs will be automatically tracked for attendance.
              </p>
              
              <div className="form-group">
                <label htmlFor="participatingClubs">Participating Clubs (Optional)</label>
                <select 
                  multiple 
                  id="participatingClubs"
                  value={selectedParticipatingClubs}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => option.value);
                    console.log('✅ Selected clubs:', values);
                    console.log('📊 Number of clubs selected:', values.length);
                    setSelectedParticipatingClubs(values);
                  }}
                  className="multi-select"
                  size="5"
                >
                  {allClubs
                    .filter(club => club._id !== event?.club?._id) // Don't show primary club
                    .map(club => (
                      <option key={club._id} value={club._id}>
                        {club.name}
                      </option>
                    ))}
                </select>
                <small className="form-hint">
                  Hold Ctrl (Cmd on Mac) to select multiple. Selected: {selectedParticipatingClubs.length} clubs
                </small>
              </div>
            </div>

            {/* Registration Settings */}
            <div className="form-section">
              <h3>📝 Registration Settings</h3>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    name="allowPerformerRegistrations"
                    checked={formData.allowPerformerRegistrations}
                    onChange={handleChange}
                  />
                  <span>Allow student performer registrations</span>
                </label>
                <small className="form-hint">Students can register to perform in this event</small>
              </div>

              {formData.allowPerformerRegistrations && (
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      name="requiresAudition"
                      checked={formData.requiresAudition}
                      onChange={handleChange}
                    />
                    <span>Requires audition for performers</span>
                  </label>
                  <small className="form-hint">Performers must pass audition to be approved</small>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="proposal">Event Proposal (PDF) - Upload new to replace</label>
              <input
                type="file"
                id="proposal"
                name="proposal"
                accept=".pdf"
                onChange={handleFileChange}
              />
              {event?.attachments?.proposalUrl && (
                <small className="form-hint">
                  Current file: <a href={event.attachments.proposalUrl} target="_blank" rel="noopener noreferrer">View</a>
                </small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="budgetBreakdown">Budget Breakdown (PDF) - Upload new to replace</label>
              <input
                type="file"
                id="budgetBreakdown"
                name="budgetBreakdown"
                accept=".pdf"
                onChange={handleFileChange}
              />
              {event?.attachments?.budgetBreakdownUrl && (
                <small className="form-hint">
                  Current file: <a href={event.attachments.budgetBreakdownUrl} target="_blank" rel="noopener noreferrer">View</a>
                </small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="venuePermission">Venue Permission (PDF) - Upload new to replace</label>
              <input
                type="file"
                id="venuePermission"
                name="venuePermission"
                accept=".pdf"
                onChange={handleFileChange}
              />
              {event?.attachments?.venuePermissionUrl && (
                <small className="form-hint">
                  Current file: <a href={event.attachments.venuePermissionUrl} target="_blank" rel="noopener noreferrer">View</a>
                </small>
              )}
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => navigate(`/events/${id}`)}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default EditEventPage;
