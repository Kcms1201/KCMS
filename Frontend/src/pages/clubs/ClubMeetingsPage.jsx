import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import meetingService from '../../services/meetingService';
import clubService from '../../services/clubService';
import { FaCalendarPlus, FaMapMarkerAlt, FaClock, FaUsers, FaCheck, FaTimes, FaEdit } from 'react-icons/fa';
import './ClubMeetings.css';

function ClubMeetingsPage() {
  const { clubId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [club, setClub] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [showAttendanceForm, setShowAttendanceForm] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' or 'past'

  const [formData, setFormData] = useState({
    title: '',
    agenda: '',
    date: '',
    time: '',
    duration: 60,
    venue: '',
    type: 'in-person',
    meetingLink: ''
  });

  const [attendanceData, setAttendanceData] = useState([]);
  const [clubMembers, setClubMembers] = useState([]);

  // Check if user is President or VicePresident
  const userRole = club?.userRole;
  const canMarkAttendance = userRole === 'president' || userRole === 'vicePresident';
  const isCoreOrLeader = ['president', 'vicePresident', 'secretary', 'treasurer', 'core'].includes(userRole);

  useEffect(() => {
    fetchClubData();
    fetchMeetings();
  }, [clubId, activeTab]);

  const fetchClubData = async () => {
    try {
      const response = await clubService.getClub(clubId);
      setClub(response.data?.club || response.data);
      
      // Fetch club members for attendance
      const membersResponse = await clubService.getMembers(clubId);
      setClubMembers(membersResponse.data?.members || []);
    } catch (err) {
      console.error('Error fetching club:', err);
    }
  };

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const response = await meetingService.listMeetings(clubId, {
        upcoming: activeTab === 'upcoming' ? 'true' : 'false'
      });
      setMeetings(response.data?.meetings || []);
    } catch (err) {
      console.error('Error fetching meetings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    try {
      await meetingService.createMeeting(clubId, formData);
      alert('Meeting scheduled successfully!');
      setShowCreateForm(false);
      setFormData({
        title: '',
        agenda: '',
        date: '',
        time: '',
        duration: 60,
        venue: '',
        type: 'in-person',
        meetingLink: ''
      });
      fetchMeetings();
    } catch (err) {
      alert('Failed to create meeting: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleOpenAttendance = (meeting) => {
    setSelectedMeeting(meeting);
    
    // Initialize attendance data with existing records
    const initialAttendance = clubMembers.map(member => {
      const existing = meeting.attendees?.find(a => a.user._id === member.user._id);
      return {
        userId: member.user._id,
        name: member.user.profile?.name || member.user.name,
        rollNumber: member.user.rollNumber,
        status: existing?.status || 'absent'
      };
    });
    
    setAttendanceData(initialAttendance);
    setShowAttendanceForm(true);
  };

  const handleMarkAttendance = async () => {
    try {
      const attendees = attendanceData.map(({ userId, status }) => ({ userId, status }));
      await meetingService.markAttendance(selectedMeeting._id, attendees);
      alert('Attendance marked successfully!');
      setShowAttendanceForm(false);
      fetchMeetings();
    } catch (err) {
      alert('Failed to mark attendance: ' + (err.response?.data?.message || err.message));
    }
  };

  const toggleAttendanceStatus = (userId) => {
    setAttendanceData(prev =>
      prev.map(att =>
        att.userId === userId
          ? { ...att, status: att.status === 'present' ? 'absent' : 'present' }
          : att
      )
    );
  };

  const handleCompleteMeeting = async (meetingId) => {
    const notes = prompt('Add meeting notes (optional):');
    try {
      await meetingService.completeMeeting(meetingId, notes);
      alert('Meeting marked as completed!');
      fetchMeetings();
    } catch (err) {
      alert('Failed to complete meeting: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleCancelMeeting = async (meetingId) => {
    if (window.confirm('Are you sure you want to cancel this meeting?')) {
      try {
        await meetingService.cancelMeeting(meetingId);
        alert('Meeting cancelled!');
        fetchMeetings();
      } catch (err) {
        alert('Failed to cancel meeting: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  return (
    <Layout>
      <div className="meetings-page">
        <div className="meetings-header">
          <div>
            <h1>📅 {club?.name} Meetings</h1>
            <p>Schedule and track club meetings</p>
          </div>
          {isCoreOrLeader && (
            <button 
              className="btn btn-primary"
              onClick={() => setShowCreateForm(true)}
            >
              <FaCalendarPlus /> Schedule Meeting
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="meetings-tabs">
          <button
            className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming Meetings
          </button>
          <button
            className={`tab-btn ${activeTab === 'past' ? 'active' : ''}`}
            onClick={() => setActiveTab('past')}
          >
            Past Meetings
          </button>
        </div>

        {/* Create Meeting Form Modal */}
        {showCreateForm && (
          <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Schedule New Meeting</h2>
              <form onSubmit={handleCreateMeeting}>
                <div className="form-group">
                  <label>Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Weekly Planning Meeting"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Agenda</label>
                  <textarea
                    value={formData.agenda}
                    onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
                    placeholder="What will be discussed?"
                    rows="3"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Date *</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Time *</label>
                    <input
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Duration (minutes)</label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    min="15"
                    max="480"
                  />
                </div>

                <div className="form-group">
                  <label>Type</label>
                  <div className="radio-group">
                    <label>
                      <input
                        type="radio"
                        value="in-person"
                        checked={formData.type === 'in-person'}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      />
                      In-Person
                    </label>
                    <label>
                      <input
                        type="radio"
                        value="online"
                        checked={formData.type === 'online'}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      />
                      Online
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>{formData.type === 'online' ? 'Meeting Link *' : 'Venue *'}</label>
                  {formData.type === 'online' ? (
                    <input
                      type="url"
                      value={formData.meetingLink}
                      onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value, venue: e.target.value })}
                      placeholder="https://meet.google.com/..."
                      required
                    />
                  ) : (
                    <input
                      type="text"
                      value={formData.venue}
                      onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                      placeholder="e.g., Room 101, Main Building"
                      required
                    />
                  )}
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Schedule Meeting
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Attendance Form Modal */}
        {showAttendanceForm && (
          <div className="modal-overlay" onClick={() => setShowAttendanceForm(false)}>
            <div className="modal-content attendance-modal" onClick={(e) => e.stopPropagation()}>
              <h2>Mark Attendance</h2>
              <p className="meeting-title">{selectedMeeting?.title}</p>
              
              <div className="attendance-list">
                {attendanceData.map((att) => (
                  <div key={att.userId} className="attendance-item">
                    <div className="member-info">
                      <span className="name">{att.name}</span>
                      <span className="roll">{att.rollNumber}</span>
                    </div>
                    <button
                      type="button"
                      className={`attendance-toggle ${att.status}`}
                      onClick={() => toggleAttendanceStatus(att.userId)}
                    >
                      {att.status === 'present' ? (
                        <><FaCheck /> Present</>
                      ) : (
                        <><FaTimes /> Absent</>
                      )}
                    </button>
                  </div>
                ))}
              </div>

              <div className="form-actions">
                <button className="btn btn-secondary" onClick={() => setShowAttendanceForm(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleMarkAttendance}>
                  Save Attendance
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Meetings List */}
        <div className="meetings-list">
          {loading ? (
            <div className="loading">Loading meetings...</div>
          ) : meetings.length === 0 ? (
            <div className="empty-state">
              <p>No {activeTab} meetings</p>
              {isCoreOrLeader && activeTab === 'upcoming' && (
                <button className="btn btn-primary" onClick={() => setShowCreateForm(true)}>
                  <FaCalendarPlus /> Schedule First Meeting
                </button>
              )}
            </div>
          ) : (
            meetings.map((meeting) => {
              const presentCount = meeting.attendees?.filter(a => a.status === 'present').length || 0;
              const totalMembers = clubMembers.length;
              
              return (
                <div key={meeting._id} className={`meeting-card ${meeting.status}`}>
                  <div className="meeting-header">
                    <h3>{meeting.title}</h3>
                    <span className={`status-badge ${meeting.status}`}>
                      {meeting.status}
                    </span>
                  </div>

                  <div className="meeting-details">
                    <div className="detail-item">
                      <FaCalendarPlus />
                      <span>{new Date(meeting.date).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}</span>
                    </div>

                    <div className="detail-item">
                      <FaClock />
                      <span>{meeting.time} ({meeting.duration} min)</span>
                    </div>

                    <div className="detail-item">
                      <FaMapMarkerAlt />
                      <span>{meeting.venue}</span>
                    </div>

                    {meeting.type === 'online' && meeting.meetingLink && (
                      <div className="detail-item">
                        <a href={meeting.meetingLink} target="_blank" rel="noopener noreferrer" className="meeting-link">
                          Join Online Meeting
                        </a>
                      </div>
                    )}

                    {meeting.agenda && (
                      <div className="agenda">
                        <strong>Agenda:</strong> {meeting.agenda}
                      </div>
                    )}

                    {meeting.attendees && meeting.attendees.length > 0 && (
                      <div className="attendance-summary">
                        <FaUsers />
                        <span>Attendance: {presentCount}/{totalMembers} members</span>
                      </div>
                    )}
                  </div>

                  <div className="meeting-actions">
                    {canMarkAttendance && meeting.status === 'scheduled' && (
                      <button 
                        className="btn btn-sm btn-primary"
                        onClick={() => handleOpenAttendance(meeting)}
                      >
                        <FaCheck /> Mark Attendance
                      </button>
                    )}

                    {isCoreOrLeader && meeting.status === 'scheduled' && (
                      <>
                        <button 
                          className="btn btn-sm btn-success"
                          onClick={() => handleCompleteMeeting(meeting._id)}
                        >
                          Complete
                        </button>
                        <button 
                          className="btn btn-sm btn-danger"
                          onClick={() => handleCancelMeeting(meeting._id)}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
}

export default ClubMeetingsPage;
