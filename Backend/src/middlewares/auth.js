const jwtUtil = require('../utils/jwt');
const { User } = require('../modules/auth/user.model');

module.exports = async function auth(req, res, next) {
  try {
    const hdr = req.headers['authorization'] || '';
    const parts = hdr.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ message: 'Missing or invalid Authorization header' });
    }

    const token = parts[1];
    let payload;
    try {
      payload = jwtUtil.verify(token);
    } catch (err) {
      const reason = err.name === 'TokenExpiredError' ? 'expired' : 'invalid';
      return res.status(401).json({ message: 'Unauthorized token', reason });
    }

    const user = await User.findById(payload.id || payload.sub).lean();
    if (!user) return res.status(401).json({ message: 'User not found' });

    // ✅ Fetch user's club memberships from Membership collection (SINGLE SOURCE OF TRUTH)
    const { Membership } = require('../modules/club/membership.model');
    const memberships = await Membership.find({
      user: user._id,
      status: 'approved'
    }).populate('club', 'name').lean();

    // Transform memberships to match old roles.scoped format for frontend compatibility
    const scopedRoles = memberships.map(m => ({
      club: m.club._id,
      role: m.role,
      clubName: m.club.name // Extra info for convenience
    }));

    req.user = {
      id: user._id,
      rollNumber: user.rollNumber,
      email: user.email,
      roles: {
        global: (user.roles?.global || '').toString(),
        scoped: scopedRoles // ✅ Populated from Membership collection
      },
      status: user.status,
    };
    return next();
  } catch (err) {
    return next(err);
  }
};

/**
 * Optional authentication middleware
 * - If token is present and valid: sets req.user
 * - If token is missing or invalid: continues without req.user (doesn't fail)
 * 
 * Use this for routes that should be public but need to know if user is authenticated
 * (e.g., recruitment detail - public view, but show management buttons if core member)
 */
module.exports.optionalAuth = async function optionalAuth(req, res, next) {
  try {
    const hdr = req.headers['authorization'] || '';
    const parts = hdr.split(' ');
    
    // No token? Continue without user
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return next();
    }

    const token = parts[1];
    let payload;
    try {
      payload = jwtUtil.verify(token);
    } catch (err) {
      // Invalid/expired token? Continue without user (don't fail)
      return next();
    }

    const user = await User.findById(payload.id || payload.sub).lean();
    if (!user) return next(); // User not found? Continue without user

    // ✅ Fetch user's club memberships from Membership collection
    const { Membership } = require('../modules/club/membership.model');
    const memberships = await Membership.find({
      user: user._id,
      status: 'approved'
    }).populate('club', 'name').lean();

    const scopedRoles = memberships.map(m => ({
      club: m.club._id,
      role: m.role,
      clubName: m.club.name
    }));

    req.user = {
      id: user._id,
      rollNumber: user.rollNumber,
      email: user.email,
      roles: {
        global: (user.roles?.global || '').toString(),
        scoped: scopedRoles
      },
      status: user.status,
    };
    
    return next();
  } catch (err) {
    // Any error? Continue without user (don't fail the request)
    return next();
  }
};
