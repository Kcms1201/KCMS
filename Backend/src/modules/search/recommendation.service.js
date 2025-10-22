/**
 * Recommendation Service
 * Workplan Lines 523-535: Club recommendations for students
 * - Department-based clubs
 * - Similar clubs to joined ones
 * - Trending clubs
 * - Friends' clubs
 */

const { Club } = require('../club/club.model');
const { Membership } = require('../club/membership.model');
const { User } = require('../auth/user.model');
const { Event } = require('../event/event.model');

class RecommendationService {
  /**
   * Get personalized club recommendations for a student
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Recommendations object
   */
  async getClubRecommendations(userId) {
    const user = await User.findById(userId).lean();
    if (!user) {
      throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }

    const [
      departmentBased,
      similarClubs,
      trendingClubs,
      friendsClubs
    ] = await Promise.all([
      this.getDepartmentBasedRecommendations(user),
      this.getSimilarClubsRecommendations(userId),
      this.getTrendingClubs(),
      this.getFriendsClubsRecommendations(userId)
    ]);

    return {
      departmentBased,
      similarClubs,
      trendingClubs,
      friendsClubs,
      timestamp: new Date()
    };
  }

  /**
   * Recommend clubs based on user's department
   * Workplan Line 527: "Clubs based on department"
   */
  async getDepartmentBasedRecommendations(user) {
    if (!user.profile?.department) {
      return [];
    }

    // Get clubs user is already member of OR coordinating
    const [memberClubs, coordinatingClubs] = await Promise.all([
      Membership.find({
        user: user._id,
        status: 'approved'
      }).distinct('club'),
      Club.find({ coordinator: user._id }).distinct('_id')
    ]);
    
    const userClubs = [...memberClubs, ...coordinatingClubs];

    // Department-based scoring
    const departmentMapping = {
      'CSE': ['technical'],
      'ECE': ['technical'],
      'EEE': ['technical'],
      'MECH': ['technical', 'sports'],
      'CIVIL': ['technical', 'sports'],
      'IT': ['technical']
    };

    const preferredCategories = departmentMapping[user.profile.department] || ['technical', 'cultural'];

    const clubs = await Club.find({
      _id: { $nin: userClubs },
      status: 'active',
      category: { $in: preferredCategories }
    })
    .populate('coordinator', 'profile.name')
    .limit(5)
    .lean();

    // Get member counts for each club
    const clubsWithStats = await Promise.all(
      clubs.map(async (club) => {
        const memberCount = await Membership.countDocuments({
          club: club._id,
          status: 'approved'
        });
        
        const upcomingEvents = await Event.countDocuments({
          club: club._id,
          status: { $in: ['published', 'approved'] },
          dateTime: { $gte: new Date() }
        });

        return {
          ...club,
          memberCount,
          upcomingEvents,
          reason: `Popular in ${user.profile.department} department`
        };
      })
    );

    return clubsWithStats;
  }

  /**
   * Recommend clubs similar to ones user has joined
   * Workplan Line 528: "Similar clubs to joined ones"
   */
  async getSimilarClubsRecommendations(userId) {
    // Get user's current clubs (membership + coordinating)
    const [userMemberships, coordinatingClubs] = await Promise.all([
      Membership.find({
        user: userId,
        status: 'approved'
      }).populate('club').lean(),
      Club.find({ coordinator: userId }).distinct('_id')
    ]);

    if (userMemberships.length === 0) {
      return [];
    }

    const userClubIds = [...userMemberships.map(m => m.club._id), ...coordinatingClubs];
    const userClubCategories = userMemberships.map(m => m.club.category);

    // Find clubs in same categories but not joined
    const similarClubs = await Club.find({
      _id: { $nin: userClubIds },
      status: 'active',
      category: { $in: userClubCategories }
    })
    .populate('coordinator', 'profile.name')
    .limit(5)
    .lean();

    // Add stats
    const clubsWithStats = await Promise.all(
      similarClubs.map(async (club) => {
        const memberCount = await Membership.countDocuments({
          club: club._id,
          status: 'approved'
        });

        const commonMembers = await Membership.countDocuments({
          club: club._id,
          user: { $in: userClubIds },
          status: 'approved'
        });

        return {
          ...club,
          memberCount,
          commonMembers,
          reason: `Similar to ${userMemberships[0].club.name}`
        };
      })
    );

    return clubsWithStats;
  }

  /**
   * Get trending clubs based on activity
   * Workplan Line 529: "Trending clubs"
   */
  async getTrendingClubs(limit = 5) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get all active clubs
    const clubs = await Club.find({ status: 'active' }).lean();

    // Calculate activity score for each club
    const clubsWithScores = await Promise.all(
      clubs.map(async (club) => {
        const [
          recentEvents,
          memberCount,
          recentMembers,
          eventAttendance
        ] = await Promise.all([
          Event.countDocuments({
            club: club._id,
            dateTime: { $gte: thirtyDaysAgo },
            status: { $in: ['completed', 'ongoing', 'published'] }
          }),
          Membership.countDocuments({
            club: club._id,
            status: 'approved'
          }),
          Membership.countDocuments({
            club: club._id,
            status: 'approved',
            createdAt: { $gte: thirtyDaysAgo }
          }),
          Event.aggregate([
            {
              $match: {
                club: club._id,
                dateTime: { $gte: thirtyDaysAgo },
                status: 'completed'
              }
            },
            {
              $group: {
                _id: null,
                totalAttendees: { $sum: '$expectedAttendees' }
              }
            }
          ])
        ]);

        // Activity score formula
        const activityScore = 
          (recentEvents * 10) +       // Events weight: 10 points each
          (recentMembers * 5) +        // New members: 5 points each
          (eventAttendance[0]?.totalAttendees || 0) * 0.1; // Attendance: 0.1 points per attendee

        return {
          ...club,
          memberCount,
          recentEvents,
          recentMembers,
          activityScore,
          reason: 'Trending in last 30 days'
        };
      })
    );

    // Sort by activity score and return top clubs
    return clubsWithScores
      .sort((a, b) => b.activityScore - a.activityScore)
      .slice(0, limit);
  }

  /**
   * Get clubs that user's friends are part of
   * Workplan Line 530: "Friends' clubs"
   */
  async getFriendsClubsRecommendations(userId) {
    const user = await User.findById(userId).lean();
    if (!user) return [];

    // Get clubs user is already member of OR coordinating
    const [memberClubs, coordinatingClubs] = await Promise.all([
      Membership.find({
        user: userId,
        status: 'approved'
      }).distinct('club'),
      Club.find({ coordinator: userId }).distinct('_id')
    ]);
    
    const userClubs = [...memberClubs, ...coordinatingClubs];

    // Find users from same department and batch (potential friends)
    const potentialFriends = await User.find({
      _id: { $ne: userId },
      'profile.department': user.profile?.department,
      'profile.batch': user.profile?.batch,
      status: 'profile_complete'
    })
    .limit(50)
    .select('_id')
    .lean();

    if (potentialFriends.length === 0) {
      return [];
    }

    const friendIds = potentialFriends.map(f => f._id);

    // Find clubs that friends are members of
    const friendClubs = await Membership.aggregate([
      {
        $match: {
          user: { $in: friendIds },
          club: { $nin: userClubs },
          status: 'approved'
        }
      },
      {
        $group: {
          _id: '$club',
          friendCount: { $sum: 1 },
          friends: { $push: '$user' }
        }
      },
      {
        $sort: { friendCount: -1 }
      },
      {
        $limit: 5
      }
    ]);

    // Populate club details
    const clubs = await Club.find({
      _id: { $in: friendClubs.map(fc => fc._id) }
    })
    .populate('coordinator', 'profile.name')
    .lean();

    // Merge with friend counts
    const clubsWithFriendInfo = clubs.map(club => {
      const friendInfo = friendClubs.find(fc => fc._id.toString() === club._id.toString());
      return {
        ...club,
        friendCount: friendInfo?.friendCount || 0,
        reason: `${friendInfo?.friendCount || 0} classmates are members`
      };
    });

    return clubsWithFriendInfo;
  }

  /**
   * Get potential club members for recruitment
   * For clubs to identify potential members
   */
  async getPotentialMembers(clubId, limit = 20) {
    const club = await Club.findById(clubId).lean();
    if (!club) {
      throw Object.assign(new Error('Club not found'), { statusCode: 404 });
    }

    // Get existing members
    const existingMembers = await Membership.find({
      club: clubId,
      status: { $in: ['approved', 'applied'] }
    }).distinct('user');

    // Find users interested in similar categories
    const similarClubs = await Club.find({
      category: club.category,
      status: 'active'
    }).distinct('_id');

    // Users who are members of similar clubs but not this one
    const potentialUsers = await Membership.find({
      club: { $in: similarClubs, $ne: clubId },
      user: { $nin: existingMembers },
      status: 'approved'
    })
    .distinct('user');

    // Get user details
    const users = await User.find({
      _id: { $in: potentialUsers },
      status: 'profile_complete'
    })
    .select('profile.name rollNumber profile.department profile.year')
    .limit(limit)
    .lean();

    return users.map(user => ({
      ...user,
      reason: `Active in ${club.category} clubs`
    }));
  }

  /**
   * Get collaboration opportunities for clubs
   * Suggest clubs that could collaborate on events
   */
  async getCollaborationOpportunities(clubId, limit = 5) {
    const club = await Club.findById(clubId).lean();
    if (!club) {
      throw Object.assign(new Error('Club not found'), { statusCode: 404 });
    }

    // Find clubs with similar categories or complementary categories
    const complementaryCategories = {
      'technical': ['technical', 'academic'],
      'cultural': ['cultural', 'arts', 'social'],
      'sports': ['sports', 'social'],
      'arts': ['arts', 'cultural'],
      'social': ['social', 'cultural', 'sports']
    };

    const targetCategories = complementaryCategories[club.category] || [club.category];

    // Find active clubs in complementary categories
    const clubs = await Club.find({
      _id: { $ne: clubId },
      status: 'active',
      category: { $in: targetCategories }
    })
    .populate('coordinator', 'profile.name')
    .limit(limit)
    .lean();

    // Add collaboration score
    const clubsWithScores = await Promise.all(
      clubs.map(async (targetClub) => {
        const [memberCount, recentEvents] = await Promise.all([
          Membership.countDocuments({
            club: targetClub._id,
            status: 'approved'
          }),
          Event.countDocuments({
            club: targetClub._id,
            dateTime: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
            status: 'completed'
          })
        ]);

        return {
          ...targetClub,
          memberCount,
          recentEvents,
          reason: `Complementary in ${targetClub.category} category`
        };
      })
    );

    return clubsWithScores;
  }
}

module.exports = new RecommendationService();
