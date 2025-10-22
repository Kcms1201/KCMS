const Meeting = require('./meeting.model');
const { Membership } = require('./membership.model');
const { successResponse } = require('../../utils/response');

/**
 * Create meeting (Core members only)
 */
exports.createMeeting = async (req, res, next) => {
  try {
    const { clubId } = req.params;
    const { title, agenda, date, time, duration, venue, type, meetingLink, notes } = req.body;
    
    // Verify user is core member or leadership
    const membership = await Membership.findOne({
      club: clubId,
      user: req.user.id,
      status: 'approved'
    });
    
    if (!membership) {
      const err = new Error('You are not a member of this club');
      err.statusCode = 403;
      throw err;
    }
    
    const isCoreOrLeader = ['president', 'vicePresident', 'secretary', 'treasurer', 'core'].includes(membership.role);
    
    if (!isCoreOrLeader) {
      const err = new Error('Only core members and leadership can schedule meetings');
      err.statusCode = 403;
      throw err;
    }
    
    const meeting = await Meeting.create({
      club: clubId,
      title,
      agenda,
      date,
      time,
      duration: duration || 60,
      venue,
      type: type || 'in-person',
      meetingLink,
      notes,
      createdBy: req.user.id
    });
    
    await meeting.populate('createdBy', 'profile.name email');
    
    successResponse(res, { meeting }, 'Meeting scheduled successfully', 201);
  } catch (err) {
    next(err);
  }
};

/**
 * List meetings for a club
 */
exports.listMeetings = async (req, res, next) => {
  try {
    const { clubId } = req.params;
    const { status, upcoming, limit = 50 } = req.query;
    
    const query = { club: clubId };
    
    if (status) {
      query.status = status;
    }
    
    // Filter by upcoming/past
    if (upcoming === 'true') {
      query.date = { $gte: new Date() };
      query.status = 'scheduled';
    } else if (upcoming === 'false') {
      query.$or = [
        { date: { $lt: new Date() } },
        { status: { $in: ['completed', 'cancelled'] } }
      ];
    }
    
    const meetings = await Meeting.find(query)
      .populate('createdBy', 'profile.name email')
      .populate('attendees.user', 'profile.name email rollNumber')
      .populate('attendees.markedBy', 'profile.name')
      .sort({ date: -1, time: -1 })
      .limit(parseInt(limit));
    
    successResponse(res, { meetings, total: meetings.length });
  } catch (err) {
    next(err);
  }
};

/**
 * Get single meeting details
 */
exports.getMeeting = async (req, res, next) => {
  try {
    const { meetingId } = req.params;
    
    const meeting = await Meeting.findById(meetingId)
      .populate('club', 'name')
      .populate('createdBy', 'profile.name email')
      .populate('attendees.user', 'profile.name email rollNumber')
      .populate('attendees.markedBy', 'profile.name');
    
    if (!meeting) {
      const err = new Error('Meeting not found');
      err.statusCode = 404;
      throw err;
    }
    
    successResponse(res, { meeting });
  } catch (err) {
    next(err);
  }
};

/**
 * Mark attendance (President or VicePresident ONLY)
 */
exports.markAttendance = async (req, res, next) => {
  try {
    const { meetingId } = req.params;
    const { attendees } = req.body;  // Array of { userId, status: 'present'|'absent' }
    
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      const err = new Error('Meeting not found');
      err.statusCode = 404;
      throw err;
    }
    
    // ✅ CRITICAL: Only President or VicePresident can mark attendance
    const membership = await Membership.findOne({
      club: meeting.club,
      user: req.user.id,
      status: 'approved'
    });
    
    if (!membership || !['president', 'vicePresident'].includes(membership.role)) {
      const err = new Error('Only President or Vice President can mark attendance');
      err.statusCode = 403;
      throw err;
    }
    
    // Validate attendees array
    if (!Array.isArray(attendees) || attendees.length === 0) {
      const err = new Error('Invalid attendees data');
      err.statusCode = 400;
      throw err;
    }
    
    // Update attendance for each user
    attendees.forEach(({ userId, status }) => {
      const existingIdx = meeting.attendees.findIndex(
        a => a.user.toString() === userId
      );
      
      if (existingIdx >= 0) {
        // Update existing record
        meeting.attendees[existingIdx].status = status;
        meeting.attendees[existingIdx].markedAt = new Date();
        meeting.attendees[existingIdx].markedBy = req.user.id;
      } else {
        // Add new record
        meeting.attendees.push({
          user: userId,
          status,
          markedAt: new Date(),
          markedBy: req.user.id
        });
      }
    });
    
    await meeting.save();
    await meeting.populate('attendees.user', 'profile.name email rollNumber');
    await meeting.populate('attendees.markedBy', 'profile.name');
    
    successResponse(res, { meeting }, 'Attendance marked successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * Complete meeting
 */
exports.completeMeeting = async (req, res, next) => {
  try {
    const { meetingId } = req.params;
    const { notes } = req.body;
    
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      const err = new Error('Meeting not found');
      err.statusCode = 404;
      throw err;
    }
    
    // Verify user has permission (core members can complete)
    const membership = await Membership.findOne({
      club: meeting.club,
      user: req.user.id,
      status: 'approved'
    });
    
    const isCoreOrLeader = membership && 
      ['president', 'vicePresident', 'secretary', 'treasurer', 'core'].includes(membership.role);
    
    if (!isCoreOrLeader) {
      const err = new Error('Only core members can complete meetings');
      err.statusCode = 403;
      throw err;
    }
    
    meeting.status = 'completed';
    if (notes) {
      meeting.notes = notes;
    }
    await meeting.save();
    
    successResponse(res, { meeting }, 'Meeting marked as completed');
  } catch (err) {
    next(err);
  }
};

/**
 * Cancel meeting
 */
exports.cancelMeeting = async (req, res, next) => {
  try {
    const { meetingId } = req.params;
    
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      const err = new Error('Meeting not found');
      err.statusCode = 404;
      throw err;
    }
    
    // Verify user created the meeting or is president
    const membership = await Membership.findOne({
      club: meeting.club,
      user: req.user.id,
      status: 'approved'
    });
    
    const canCancel = 
      meeting.createdBy.toString() === req.user.id ||
      (membership && ['president', 'vicePresident'].includes(membership.role));
    
    if (!canCancel) {
      const err = new Error('You do not have permission to cancel this meeting');
      err.statusCode = 403;
      throw err;
    }
    
    meeting.status = 'cancelled';
    await meeting.save();
    
    successResponse(res, { meeting }, 'Meeting cancelled');
  } catch (err) {
    next(err);
  }
};

/**
 * Update meeting
 */
exports.updateMeeting = async (req, res, next) => {
  try {
    const { meetingId } = req.params;
    const updates = req.body;
    
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      const err = new Error('Meeting not found');
      err.statusCode = 404;
      throw err;
    }
    
    // Verify user created the meeting or is core member
    const membership = await Membership.findOne({
      club: meeting.club,
      user: req.user.id,
      status: 'approved'
    });
    
    const canUpdate = 
      meeting.createdBy.toString() === req.user.id ||
      (membership && ['president', 'vicePresident', 'secretary', 'core'].includes(membership.role));
    
    if (!canUpdate) {
      const err = new Error('You do not have permission to update this meeting');
      err.statusCode = 403;
      throw err;
    }
    
    // Update allowed fields
    const allowedFields = ['title', 'agenda', 'date', 'time', 'duration', 'venue', 'type', 'meetingLink', 'notes'];
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        meeting[field] = updates[field];
      }
    });
    
    await meeting.save();
    await meeting.populate('createdBy', 'profile.name email');
    
    successResponse(res, { meeting }, 'Meeting updated successfully');
  } catch (err) {
    next(err);
  }
};
