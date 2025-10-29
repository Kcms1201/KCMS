// src/modules/event/eventRegistration.service.js
const mongoose = require('mongoose');
const { EventRegistration } = require('./eventRegistration.model');
const { Event } = require('./event.model');
const { Membership } = require('../club/membership.model');
const { User } = require('../auth/user.model');
const { Attendance } = require('./attendance.model');
const notificationService = require('../notification/notification.service');
const auditService = require('../audit/audit.service');

class EventRegistrationService {
  /**
   * Register for an event (as performer or audience)
   */
  async register(eventId, data, userContext) {
    // Verify event exists and is published
    const event = await Event.findById(eventId).populate('participatingClubs');
    if (!event || event.status !== 'published') {
      const err = new Error('Event not found or not published');
      err.statusCode = 404;
      throw err;
    }

    // Check if already registered for this specific club
    // Allow multiple registrations for different clubs (e.g., Dance for Club A, Singing for Club B)
    if (data.registrationType === 'performer' && data.representingClub) {
      const existing = await EventRegistration.findOne({ 
        event: eventId, 
        user: userContext.id,
        representingClub: data.representingClub
      });
      if (existing) {
        const err = new Error('Already registered for this event with this club');
        err.statusCode = 400;
        throw err;
      }
    } else if (data.registrationType === 'audience') {
      // For audience, check if already registered as audience
      const existing = await EventRegistration.findOne({ 
        event: eventId, 
        user: userContext.id,
        registrationType: 'audience'
      });
      if (existing) {
        const err = new Error('Already registered as audience for this event');
        err.statusCode = 400;
        throw err;
      }
    }

    // Validate performer registration
    if (data.registrationType === 'performer') {
      if (!event.allowPerformerRegistrations) {
        const err = new Error('Performer registrations not allowed for this event');
        err.statusCode = 400;
        throw err;
      }

      if (!data.representingClub) {
        const err = new Error('Club selection is required for performer registration');
        err.statusCode = 400;
        throw err;
      }

      // Verify club is participating in event (primary or participating)
      const allClubIds = [event.club.toString(), ...event.participatingClubs.map(c => c._id.toString())];
      if (!allClubIds.includes(data.representingClub)) {
        const err = new Error('Selected club is not involved in this event');
        err.statusCode = 400;
        throw err;
      }
    }

    // ✅ SIMPLIFIED: No audition flow - performers go directly to pending approval
    // Core members will manually call for auditions if needed, then approve/reject
    const registration = new EventRegistration({
      event: eventId,
      user: userContext.id,
      registrationType: data.registrationType,
      representingClub: data.representingClub,
      performanceType: data.performanceType,
      performanceDescription: data.performanceDescription,
      notes: data.notes,
      auditionStatus: 'not_required', // ✅ Always not_required (manual audition scheduling)
      status: data.registrationType === 'performer' ? 'pending' : 'approved' // Performers need approval
    });

    await registration.save();

    // ✅ NOTE: We do NOT create attendance records for registrations!
    // Attendance is ONLY for club members (organizers/volunteers) - created when event is created/published
    // Registrations are separate - they track who wants to attend/perform
    
    if (registration.registrationType === 'performer') {
      // Notify club presidents about performer registration
      const clubMembers = await Membership.find({
        club: data.representingClub,
        role: { $in: ['president', 'vicePresident'] },
        status: 'approved'
      }).distinct('user');

      await Promise.all(clubMembers.map(userId =>
        notificationService.create({
          user: userId,
          type: 'performer_registration',
          title: '🎭 New Performance Registration',
          message: `A student wants to perform ${data.performanceType} at "${event.title}". Please review and approve.`,
          payload: {
            eventId,
            eventTitle: event.title,
            userId: userContext.id,
            performanceType: data.performanceType,
            registrationId: registration._id
          },
          priority: 'MEDIUM'
        })
      ));
    }

    // Audit log
    await auditService.log({
      user: userContext.id,
      action: 'EVENT_REGISTER',
      target: `Event:${eventId}`,
      newValue: { type: registration.registrationType, representingClub: data.representingClub },
      ip: userContext.ip,
      userAgent: userContext.userAgent
    });

    return registration.populate('representingClub user');
  }

  /**
   * Approve/reject performer registration (club president)
   */
  async reviewRegistration(registrationId, decision, userContext) {
    const registration = await EventRegistration.findById(registrationId)
      .populate('event representingClub user');

    if (!registration) {
      const err = new Error('Registration not found');
      err.statusCode = 404;
      throw err;
    }

    if (registration.registrationType !== 'performer') {
      const err = new Error('Only performer registrations need approval');
      err.statusCode = 400;
      throw err;
    }

    if (registration.status !== 'pending') {
      const err = new Error('Registration already reviewed');
      err.statusCode = 400;
      throw err;
    }

    // Check if user has permission (club president/vicePresident/core or admin)
    // ✅ CORRECT LOGIC: Check if user is a leader of the REPRESENTING club
    // Example: Dance Club student performs at Music Club event
    // -> Dance Club leaders approve their own performers
    const user = await User.findById(userContext.id);
    const isAdmin = user.roles?.global === 'admin';
    
    const membership = await Membership.findOne({
      club: registration.representingClub._id,  // ✅ Check representing club (performer's club)
      user: userContext.id,
      role: { $in: ['president', 'vicePresident', 'core'] },
      status: 'approved'
    });

    if (!isAdmin && !membership) {
      const err = new Error('Forbidden: Only representing club leaders can review their performers');
      err.statusCode = 403;
      throw err;
    }

    // Update registration
    registration.status = decision.status; // 'approved' or 'rejected'
    registration.approvedBy = userContext.id;
    registration.approvedAt = new Date();
    if (decision.rejectionReason) {
      registration.rejectionReason = decision.rejectionReason;
    }

    await registration.save();

    // ✅ NOTE: We do NOT create attendance records for approved performers!
    // Attendance is ONLY for club members (organizers) who are working at the event
    // Performer registrations are tracked separately in EventRegistration collection

    // Notify student
    const notifType = decision.status === 'approved' 
      ? 'performer_approved' 
      : 'performer_rejected';
    
    const title = decision.status === 'approved'
      ? '✅ Performance Approved!'
      : '❌ Performance Declined';
    
    const message = decision.status === 'approved'
      ? `Your ${registration.performanceType} performance for "${registration.event.title}" has been approved by ${registration.representingClub.name}!`
      : `Your ${registration.performanceType} performance for "${registration.event.title}" was not approved. ${decision.rejectionReason ? `Reason: ${decision.rejectionReason}` : ''}`;
    
    await notificationService.create({
      user: registration.user._id,
      type: notifType,
      title,
      message,
      payload: {
        eventId: registration.event._id,
        eventTitle: registration.event.title,
        club: registration.representingClub.name,
        performanceType: registration.performanceType,
        rejectionReason: decision.rejectionReason
      },
      priority: decision.status === 'approved' ? 'HIGH' : 'MEDIUM'
    });

    // Audit log
    await auditService.log({
      user: userContext.id,
      action: `PERFORMER_${decision.status.toUpperCase()}`,
      target: `EventRegistration:${registrationId}`,
      ip: userContext.ip,
      userAgent: userContext.userAgent
    });

    return registration;
  }

  /**
   * List registrations for an event
   */
  async listEventRegistrations(eventId, filters = {}) {
    const query = { event: eventId };
    
    if (filters.registrationType) {
      query.registrationType = filters.registrationType;
    }
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.representingClub) {
      query.representingClub = filters.representingClub;
    }

    const registrations = await EventRegistration.find(query)
      .populate('user representingClub approvedBy')
      .sort({ createdAt: -1 });

    return registrations;
  }

  /**
   * Get my registration for an event
   */
  async getMyRegistration(eventId, userId) {
    const registration = await EventRegistration.findOne({ 
      event: eventId, 
      user: userId 
    }).populate('representingClub approvedBy');

    return registration;
  }

  /**
   * Get ALL performer registrations for a club (pending, approved, rejected)
   */
  async listClubRegistrations(clubId, eventId = null) {
    const query = {
      representingClub: clubId,
      registrationType: 'performer'
      // ✅ NO status filter - get all (pending, approved, rejected)
    };

    if (eventId) {
      query.event = eventId;
    }

    console.log('🔍 Query for club registrations:', query);

    const registrations = await EventRegistration.find(query)
      .populate('event user')
      .sort({ createdAt: -1 });

    console.log(`📊 Found ${registrations.length} registrations:`, {
      pending: registrations.filter(r => r.status === 'pending').length,
      approved: registrations.filter(r => r.status === 'approved').length,
      rejected: registrations.filter(r => r.status === 'rejected').length
    });

    return registrations;
  }

  /**
   * Get pending performer registrations for a club
   */
  async listClubPendingRegistrations(clubId, eventId = null) {
    const query = {
      representingClub: clubId,
      registrationType: 'performer',
      status: 'pending'
    };

    if (eventId) {
      query.event = eventId;
    }

    const registrations = await EventRegistration.find(query)
      .populate('event user')
      .sort({ createdAt: -1 });

    return registrations;
  }

  /**
   * Get registration statistics for an event
   */
  async getEventStats(eventId) {
    const stats = await EventRegistration.aggregate([
      { $match: { event: new mongoose.Types.ObjectId(eventId) } },
      {
        $group: {
          _id: {
            type: '$registrationType',
            status: '$status'
          },
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      audience: 0,
      performers: {
        pending: 0,
        approved: 0,
        rejected: 0
      },
      total: 0
    };

    stats.forEach(s => {
      if (s._id.type === 'audience') {
        result.audience = s.count;
      } else if (s._id.type === 'performer') {
        result.performers[s._id.status] = s.count;
      }
      result.total += s.count;
    });

    return result;
  }

  /**
   * Cancel registration
   */
  async cancelRegistration(registrationId, userContext) {
    const registration = await EventRegistration.findById(registrationId);

    if (!registration) {
      const err = new Error('Registration not found');
      err.statusCode = 404;
      throw err;
    }

    if (registration.user.toString() !== userContext.id) {
      const err = new Error('Forbidden: Can only cancel your own registration');
      err.statusCode = 403;
      throw err;
    }

    // Remove attendance if exists
    await Attendance.deleteOne({
      event: registration.event,
      user: registration.user
    });

    await registration.deleteOne();

    // Audit log
    await auditService.log({
      user: userContext.id,
      action: 'EVENT_REGISTRATION_CANCELLED',
      target: `Event:${registration.event}`,
      ip: userContext.ip,
      userAgent: userContext.userAgent
    });

    return { message: 'Registration cancelled successfully' };
  }

  /**
   * Update audition status (for club core members)
   * After conducting auditions, mark students as passed/failed
   */
  async updateAuditionStatus(registrationId, auditionData, userContext) {
    const registration = await EventRegistration.findById(registrationId)
      .populate('event representingClub user');

    if (!registration) {
      const err = new Error('Registration not found');
      err.statusCode = 404;
      throw err;
    }

    if (registration.auditionStatus === 'not_required') {
      const err = new Error('This registration does not require audition');
      err.statusCode = 400;
      throw err;
    }

    // Check permission - user must be core member of REPRESENTING club
    // ✅ CORRECT: Representing club leaders conduct auditions for their own performers
    const membership = await Membership.findOne({
      club: registration.representingClub._id,  // ✅ Check representing club
      user: userContext.id,
      role: { $in: ['president', 'vicePresident', 'core', 'secretary', 'treasurer'] },
      status: 'approved'
    });

    if (!membership && userContext.roles?.global !== 'admin') {
      const err = new Error('Forbidden: Only representing club members can update audition status');
      err.statusCode = 403;
      throw err;
    }

    // Update audition status
    registration.auditionStatus = auditionData.auditionStatus; // 'audition_passed' or 'audition_failed'
    registration.auditionDate = auditionData.auditionDate || new Date();
    registration.auditionNotes = auditionData.auditionNotes;

    // If audition passed, auto-approve the registration
    if (auditionData.auditionStatus === 'audition_passed') {
      registration.status = 'approved';
      registration.approvedBy = userContext.id;
      registration.approvedAt = new Date();
    } else if (auditionData.auditionStatus === 'audition_failed') {
      registration.status = 'rejected';
      registration.rejectionReason = 'Did not pass audition';
    }

    await registration.save();

    // Send notification to student
    const notificationType = auditionData.auditionStatus === 'audition_passed' 
      ? 'audition_passed' 
      : 'audition_failed';
      
    await notificationService.create({
      user: registration.user._id,
      type: notificationType,
      payload: {
        eventId: registration.event._id,
        eventTitle: registration.event.title,
        clubName: registration.representingClub.name,
        auditionNotes: auditionData.auditionNotes,
        status: auditionData.auditionStatus
      },
      priority: 'HIGH'
    });

    // If approved, create performer attendance
    if (auditionData.auditionStatus === 'audition_passed') {
      await Attendance.findOneAndUpdate(
        {
          event: registration.event._id,
          user: registration.user._id
        },
        {
          event: registration.event._id,
          user: registration.user._id,
          status: 'rsvp',
          type: 'performer',
          club: registration.representingClub._id,
          timestamp: new Date()
        },
        { upsert: true }
      );
    }

    // Audit log
    await auditService.log({
      user: userContext.id,
      action: 'AUDITION_STATUS_UPDATE',
      target: `EventRegistration:${registrationId}`,
      newValue: { auditionStatus: auditionData.auditionStatus },
      ip: userContext.ip,
      userAgent: userContext.userAgent
    });

    return registration;
  }

  /**
   * Get registrations pending audition for a club
   */
  async listPendingAuditions(clubId, eventId = null) {
    const query = {
      representingClub: clubId,
      registrationType: 'performer',
      auditionStatus: 'pending_audition'
    };

    if (eventId) {
      query.event = eventId;
    }

    const registrations = await EventRegistration.find(query)
      .populate('event user')
      .sort({ createdAt: -1 });

    return registrations;
  }
}

module.exports = new EventRegistrationService();
