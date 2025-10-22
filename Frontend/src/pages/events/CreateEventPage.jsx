import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import clubService from '../../services/clubService';
import eventService from '../../services/eventService';
import { CORE_AND_LEADERSHIP } from '../../utils/roleConstants';
import '../../styles/Forms.css';

const CreateEventPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clubIdFromUrl = searchParams.get('clubId'); // ✅ Read clubId from URL
  const { user, clubMemberships } = useAuth();
  const [myClubs, setMyClubs] = useState([]);
  const [allClubs, setAllClubs] = useState([]); // For participating clubs selection
  const [clubsLoading, setClubsLoading] = useState(true);
  const [selectedParticipatingClubs, setSelectedParticipatingClubs] = useState([]);
  const [formData, setFormData] = useState({
    clubId: clubIdFromUrl || '', // ✅ Pre-fill with URL clubId if available
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMyClubs();
  }, []);

  const fetchMyClubs = async () => {
    try {
      setClubsLoading(true);
      const response = await clubService.listClubs();
      // ✅ FIX: Backend returns { status, data: { clubs } }, service returns response.data
      // So we access: response.data?.clubs (NOT response.data?.data?.clubs)
      const allClubs = response.data?.clubs || [];
      
      // Store all clubs for participating clubs dropdown
      setAllClubs(allClubs);
      
      // ✅ Admins and Coordinators can see ALL clubs
      if (user?.roles?.global === 'admin' || user?.roles?.global === 'coordinator') {
        setMyClubs(allClubs);
      } else {
        // ✅ Students see only clubs where they have management role
        const managedClubIds = (clubMemberships || [])
          .filter(membership => CORE_AND_LEADERSHIP.includes(membership.role))
          .map(membership => membership.club?._id?.toString() || membership.club?.toString());
        
        const managedClubs = allClubs.filter(club => 
          managedClubIds.includes(club._id?.toString())
        );
        setMyClubs(managedClubs);
      }
    } catch (error) {
      console.error('Error fetching clubs:', error);
      setError('Failed to load clubs. Please refresh the page.');
    } finally {
      setClubsLoading(false);
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
    
    // ✅ Validate clubId before submitting
    if (!formData.clubId) {
      setError('Please select a club before creating an event.');
      return;
    }
    
    // ✅ If coming from URL, verify user has permission for this club
    if (clubIdFromUrl && !myClubs.find(c => c._id === clubIdFromUrl)) {
      setError('You do not have permission to create events for this club.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const formDataToSend = new FormData();
      
      // Combine date and time
      const dateTime = new Date(`${formData.date}T${formData.time}`);
      // ✅ FIX: Use correct backend field names
      formDataToSend.append('club', formData.clubId);        // Backend expects 'club' not 'clubId'
      formDataToSend.append('title', formData.name);         // Backend expects 'title' not 'name'
      formDataToSend.append('description', formData.description);
      formDataToSend.append('objectives', formData.objectives);
      formDataToSend.append('dateTime', dateTime.toISOString()); // Backend expects 'dateTime' not 'date'
      formDataToSend.append('duration', formData.duration);
      formDataToSend.append('venue', formData.venue);
      formDataToSend.append('capacity', formData.capacity);
      formDataToSend.append('expectedAttendees', formData.expectedAttendees);
      formDataToSend.append('isPublic', formData.isPublic);
      
      if (formData.budget) formDataToSend.append('budget', formData.budget);
      if (formData.guestSpeakers) {
        const speakers = formData.guestSpeakers.split(',').map(s => s.trim());
        formDataToSend.append('guestSpeakers', JSON.stringify(speakers));
      }

      // Append participating clubs
      if (selectedParticipatingClubs.length > 0) {
        formDataToSend.append('participatingClubs', JSON.stringify(selectedParticipatingClubs));
      }
      
      // Append audition and registration settings
      formDataToSend.append('requiresAudition', formData.requiresAudition);
      formDataToSend.append('allowPerformerRegistrations', formData.allowPerformerRegistrations);

      // Append files
      if (files.proposal) formDataToSend.append('proposal', files.proposal);
      if (files.budgetBreakdown) formDataToSend.append('budgetBreakdown', files.budgetBreakdown);
      if (files.venuePermission) formDataToSend.append('venuePermission', files.venuePermission);

      const response = await eventService.create(formDataToSend);
      alert('Event created successfully!');
      navigate(`/events/${response.data.event._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="form-page">
        <div className="form-container">
          <div className="form-header">
            <h1>Create Event</h1>
            <p>Organize a new event for your club</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit} className="form">
            {/* ✅ Only show dropdown if NOT coming from a specific club */}
            {!clubIdFromUrl ? (
              <div className="form-group">
                <label htmlFor="clubId">Select Club *</label>
                <select
                  id="clubId"
                  name="clubId"
                  value={formData.clubId}
                  onChange={handleChange}
                  required
                  disabled={clubsLoading}
                >
                  <option value="">
                    {clubsLoading ? 'Loading clubs...' : 'Choose a club'}
                  </option>
                  {myClubs.map((club) => (
                    <option key={club._id} value={club._id}>
                      {club.name}
                    </option>
                  ))}
                </select>
                <small className="form-hint">Select which club is organizing this event</small>
              </div>
            ) : clubsLoading ? (
              <div className="form-group">
                <label>Club</label>
                <div className="readonly-field">
                  <span className="loading-text">⏳ Loading club details...</span>
                </div>
                <small className="form-hint">Please wait...</small>
              </div>
            ) : (
              <div className="form-group">
                <label>Club</label>
                {myClubs.find(c => c._id === clubIdFromUrl) ? (
                  <div className="readonly-field">
                    {myClubs.find(c => c._id === clubIdFromUrl).name}
                  </div>
                ) : (
                  <div className="readonly-field" style={{ backgroundColor: '#fee2e2', borderColor: '#f87171' }}>
                    ⚠️ Club not accessible
                  </div>
                )}
                <small className="form-hint" style={!myClubs.find(c => c._id === clubIdFromUrl) ? { color: '#dc2626' } : {}}>
                  {myClubs.find(c => c._id === clubIdFromUrl) 
                    ? 'Event will be created for this club' 
                    : 'You do not have permission to create events for this club. Check browser console (F12) for details.'}
                </small>
              </div>
            )}

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
                    console.log('✅ CreateEvent - Selected clubs:', values);
                    console.log('📊 CreateEvent - Number selected:', values.length);
                    setSelectedParticipatingClubs(values);
                  }}
                  className="multi-select"
                  size="5"
                >
                  {allClubs
                    .filter(club => club._id !== formData.clubId) // Don't show primary club
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
              <label htmlFor="proposal">Event Proposal (PDF)</label>
              <input
                type="file"
                id="proposal"
                name="proposal"
                accept=".pdf"
                onChange={handleFileChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="budgetBreakdown">Budget Breakdown (PDF)</label>
              <input
                type="file"
                id="budgetBreakdown"
                name="budgetBreakdown"
                accept=".pdf"
                onChange={handleFileChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="venuePermission">Venue Permission (PDF)</label>
              <input
                type="file"
                id="venuePermission"
                name="venuePermission"
                accept=".pdf"
                onChange={handleFileChange}
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => navigate('/events')}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Creating...' : 'Create Event'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default CreateEventPage;
