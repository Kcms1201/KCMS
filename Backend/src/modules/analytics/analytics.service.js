// src/modules/analytics/analytics.service.js
const { Attendance } = require('../event/attendance.model');
const { Event } = require('../event/event.model');
const { User } = require('../auth/user.model');
const { Membership } = require('../club/membership.model');

class AnalyticsService {
  /**
   * Get member analytics for a club
   * Returns all members with their event participation stats
   */
  async getClubMemberAnalytics(clubId, filters = {}) {
    const { status, minEvents, role } = filters;
    
    // Get all approved club members
    const membershipQuery = {
      club: clubId,
      status: 'approved'
    };
    
    if (role) {
      membershipQuery.role = role;
    }
    
    const memberships = await Membership.find(membershipQuery)
      .populate('user', 'profile.name email rollNumber')
      .lean();
    
    // Get all club events
    const events = await Event.find({ club: clubId }).select('_id title dateTime status').lean();
    const eventIds = events.map(e => e._id);
    
    // Get all attendance records for these events
    const attendanceRecords = await Attendance.find({
      event: { $in: eventIds },
      type: { $in: ['organizer', 'volunteer'] }
    }).lean();
    
    // Build member stats
    const memberStats = await Promise.all(memberships.map(async (membership) => {
      const userId = membership.user._id;
      
      // Get user's attendance records
      const userAttendance = attendanceRecords.filter(
        att => att.user.toString() === userId.toString()
      );
      
      const totalEvents = userAttendance.length;
      const presentEvents = userAttendance.filter(att => att.status === 'present').length;
      const organizerEvents = userAttendance.filter(att => att.type === 'organizer').length;
      const volunteerEvents = userAttendance.filter(att => att.type === 'volunteer').length;
      
      // Calculate participation rate
      const participationRate = totalEvents > 0 ? (presentEvents / totalEvents) * 100 : 0;
      
      // Determine activity status
      let activityStatus = 'inactive';
      if (presentEvents >= 5) activityStatus = 'very_active';
      else if (presentEvents >= 3) activityStatus = 'active';
      else if (presentEvents >= 1) activityStatus = 'moderate';
      
      const memberData = {
        userId: userId,
        name: membership.user.profile?.name || 'Unknown',
        email: membership.user.email,
        rollNumber: membership.user.rollNumber,
        clubRole: membership.role,
        joinedAt: membership.joinedAt,
        stats: {
          totalEvents,
          presentEvents,
          absentEvents: totalEvents - presentEvents,
          organizerEvents,
          volunteerEvents,
          participationRate: Math.round(participationRate * 10) / 10,
          activityStatus
        }
      };
      
      // Apply filters
      if (status && status !== activityStatus) return null;
      if (minEvents && presentEvents < parseInt(minEvents)) return null;
      
      return memberData;
    }));
    
    // Filter out nulls and sort
    return memberStats.filter(m => m !== null).sort((a, b) => {
      return b.stats.presentEvents - a.stats.presentEvents;
    });
  }
  
  /**
   * Get detailed activity for a specific member
   */
  async getMemberActivity(clubId, userId) {
    // Verify membership
    const membership = await Membership.findOne({
      club: clubId,
      user: userId,
      status: 'approved'
    }).populate('user', 'profile.name email rollNumber');
    
    if (!membership) {
      const err = new Error('Member not found in this club');
      err.statusCode = 404;
      throw err;
    }
    
    // Get all club events
    const events = await Event.find({ club: clubId })
      .select('_id title dateTime venue status')
      .lean();
    const eventIds = events.map(e => e._id);
    
    // Get member's attendance records
    const attendanceRecords = await Attendance.find({
      event: { $in: eventIds },
      user: userId,
      type: { $in: ['organizer', 'volunteer'] }
    }).lean();
    
    // Build event list with attendance
    const eventHistory = events
      .map(event => {
        const attendance = attendanceRecords.find(
          att => att.event.toString() === event._id.toString()
        );
        
        if (!attendance) return null; // Not assigned to this event
        
        return {
          eventId: event._id,
          title: event.title,
          date: event.dateTime,
          venue: event.venue,
          status: event.status,
          role: attendance.type,
          attended: attendance.status === 'present',
          attendanceStatus: attendance.status
        };
      })
      .filter(e => e !== null)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Calculate stats
    const totalEvents = eventHistory.length;
    const presentEvents = eventHistory.filter(e => e.attended).length;
    const organizerEvents = eventHistory.filter(e => e.role === 'organizer').length;
    const volunteerEvents = eventHistory.filter(e => e.role === 'volunteer').length;
    const participationRate = totalEvents > 0 ? (presentEvents / totalEvents) * 100 : 0;
    
    let activityStatus = 'inactive';
    if (presentEvents >= 5) activityStatus = 'very_active';
    else if (presentEvents >= 3) activityStatus = 'active';
    else if (presentEvents >= 1) activityStatus = 'moderate';
    
    return {
      member: {
        userId: userId,
        name: membership.user.profile?.name || 'Unknown',
        email: membership.user.email,
        rollNumber: membership.user.rollNumber,
        clubRole: membership.role,
        joinedAt: membership.joinedAt
      },
      stats: {
        totalEvents,
        presentEvents,
        absentEvents: totalEvents - presentEvents,
        organizerEvents,
        volunteerEvents,
        participationRate: Math.round(participationRate * 10) / 10,
        activityStatus
      },
      eventHistory
    };
  }
  
  /**
   * Get club analytics summary
   */
  async getClubAnalyticsSummary(clubId) {
    const members = await this.getClubMemberAnalytics(clubId);
    
    const totalMembers = members.length;
    const activeMembers = members.filter(m => 
      m.stats.activityStatus === 'active' || m.stats.activityStatus === 'very_active'
    ).length;
    const inactiveMembers = members.filter(m => 
      m.stats.activityStatus === 'inactive'
    ).length;
    
    const avgParticipation = totalMembers > 0
      ? members.reduce((sum, m) => sum + m.stats.participationRate, 0) / totalMembers
      : 0;
    
    return {
      totalMembers,
      activeMembers,
      inactiveMembers,
      moderateMembers: totalMembers - activeMembers - inactiveMembers,
      avgParticipationRate: Math.round(avgParticipation * 10) / 10,
      topPerformers: members.slice(0, 5).map(m => ({
        name: m.name,
        presentEvents: m.stats.presentEvents,
        participationRate: m.stats.participationRate
      }))
    };
  }
  
  /**
   * Export member analytics as CSV
   */
  async exportMemberAnalytics(clubId) {
    const members = await this.getClubMemberAnalytics(clubId);
    
    // Build CSV
    const headers = [
      'Name', 'Email', 'Roll Number', 'Club Role', 'Total Events',
      'Present', 'Absent', 'As Organizer', 'As Volunteer',
      'Participation Rate (%)', 'Activity Status'
    ];
    
    const rows = members.map(m => [
      m.name,
      m.email,
      m.rollNumber || '',
      m.clubRole,
      m.stats.totalEvents,
      m.stats.presentEvents,
      m.stats.absentEvents,
      m.stats.organizerEvents,
      m.stats.volunteerEvents,
      m.stats.participationRate,
      m.stats.activityStatus
    ]);
    
    // Convert to CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => 
        typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
      ).join(','))
    ].join('\n');
    
    return csvContent;
  }
}

module.exports = new AnalyticsService();
