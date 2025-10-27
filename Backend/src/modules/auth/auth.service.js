//src/modules/auth/auth.service.js
const jwtUtil   = require('../../utils/jwt');
const ms        = require('ms');
const { v4: uuidv4 } = require('uuid');
const config    = require('../../../config');
const redis     = require('../../config/redis');
const { User }  = require('./user.model');
const { Session } = require('./session.model');
const { PasswordReset } = require('./passwordReset.model');
const { sendMail } = require('../../utils/mail');
const { genRandom, hashSha256, hashBcrypt, compareBcrypt } = require('../../utils/crypto');
const { parseUserAgent, generateDeviceFingerprint, isDeviceRecognized } = require('../../utils/deviceFingerprint');
const auditService        = require('../audit/audit.service');
const notificationService = require('../notification/notification.service');

const MAX_LOGIN_ATTEMPTS = 10;
const LOCK_DURATION      = 30 * 60 * 1000;    // 30 minutes
const RESET_COOLDOWN     = 24 * 60 * 60 * 1000; // 24 hours
const MAX_RESET_ATTEMPTS = 3;                   // Max 3 reset attempts per day

/**
 * STEP 1: Register & send OTP
 */
exports.register = async ({ rollNumber, email, password }, userContext) => {
  if (await User.findOne({ $or: [{ email }, { rollNumber }] })) {
    const err = new Error('Account exists');
    err.statusCode = 409;
    throw err;
  }
  const user = new User({ rollNumber, email, status: 'otp_sent' });
  await user.setPassword(password);
  await user.save();

  // Workplan Line 22: Max 3 OTP resends per hour rate limiting
  const key = `otp:reg:${email}`;
  const resendCount = await redis.get(`${key}:count`);
  if (resendCount && parseInt(resendCount) >= 3) {
    const err = new Error('Maximum 3 OTP resends per hour exceeded. Please try again later.');
    err.statusCode = 429;
    throw err;
  }

  // generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await redis.multi()
    .set(key, otp, 'EX', 600)
    .incr(`${key}:count`)
    .expire(`${key}:count`, 3600)
    .exec();

  // send OTP email
  await sendMail({
    to: email,
    subject: 'KMIT Clubs Hub OTP',
    html: `<p>Your OTP is <strong>${otp}</strong>. Expires in 10 minutes.</p>`
  });

  // audit log
  await auditService.log({
    user: user._id,
    action: 'USER_REGISTER',
    target: `User:${user._id}`,
    newValue: { rollNumber, email },
    ip: userContext.ip,
    userAgent: userContext.userAgent
  });

  // notification (in-app or email)
  await notificationService.create({
    user: user._id,
    type: 'system_maintenance', // or define 'otp_sent'
    payload: { email },
    priority: 'HIGH'
  });
};

/**
 * STEP 2: Verify Registration OTP
 */
exports.verifyOtp = async ({ email, otp }, userContext) => {
  const key = `otp:reg:${email}`;
  const stored = await redis.get(key);
  const count  = await redis.get(`${key}:count`);

  if (!stored || stored !== otp) {
    if (count >= 3) {
      const e = new Error('Too many OTP attempts');
      e.statusCode = 429;
      throw e;
    }
    const e = new Error('Invalid OTP');
    e.statusCode = 400;
    throw e;
  }

  const user = await User.findOneAndUpdate(
    { email, status: 'otp_sent' },
    { status: 'verified' },
    { new: true }
  );
  if (!user) {
    const e = new Error('Invalid state');
    e.statusCode = 400;
    throw e;
  }

  // cleanup
  await redis.del(key, `${key}:count`);

  // audit
  await auditService.log({
    user: user._id,
    action: 'OTP_VERIFIED',
    target: `User:${user._id}`,
    ip: userContext.ip,
    userAgent: userContext.userAgent
  });

  // return short JWT
  return jwtUtil.sign({ id: user._id }, { expiresIn: '15m' });
};

/**
 * STEP 3: Complete Profile & issue tokens
 */
exports.completeProfile = async (userId, profileData, userContext) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { profile: profileData, status: 'profile_complete' },
    { new: true }
  ).lean();

  // Fetch user's club memberships from Membership collection (SINGLE SOURCE OF TRUTH)
  const { Membership } = require('../club/membership.model');
  const memberships = await Membership.find({
    user: user._id,
    status: 'approved'
  }).populate('club', 'name').lean();

  // Transform memberships to match old roles.scoped format for frontend compatibility
  const scopedRoles = memberships.map(m => ({
    club: m.club._id,
    role: m.role,
    clubName: m.club.name
  }));

  // Attach scoped roles to user object (populated from Membership)
  user.roles = {
    ...user.roles,
    scoped: scopedRoles
  };

  // issue access token
  const accessToken = jwtUtil.sign(
    { id: user._id, roles: user.roles },
    { expiresIn: config.JWT_EXPIRY }
  );

  // create rotating refresh token
  const raw = genRandom(40);
  const sha = hashSha256(raw);
  const bcryptHash = await hashBcrypt(raw);
  const expiresAt = new Date(Date.now() + ms(config.REFRESH_TOKEN_EXPIRY));

  // Prepare session data with device fingerprinting
  const sessionData = {
    user: user._id,
    sha256Hash: sha,
    bcryptHash,
    expiresAt,
    userAgent: userContext.userAgent,
    ip: userContext.ip
  };

  // Add device fingerprinting if available (from login flow)
  if (userContext.deviceFingerprint) {
    sessionData.deviceFingerprint = userContext.deviceFingerprint;
    sessionData.deviceInfo = userContext.deviceInfo;
    sessionData.isNewDevice = userContext.isNewDevice || false;
    
    // Remember device for 30 days (Workplan: optional "Remember Device" for 30 days)
    if (userContext.rememberDevice) {
      sessionData.rememberDevice = true;
      sessionData.rememberDeviceExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    }
  }

  await new Session(sessionData).save();

  // notification: role assigned
  await notificationService.create({
    user: user._id,
    type: 'role_assigned',
    payload: { role: 'student' },
    priority: 'MEDIUM'
  });

  // audit
  await auditService.log({
    user: user._id,
    action: 'PROFILE_COMPLETE',
    target: `User:${user._id}`,
    newValue: profileData,
    ip: userContext.ip,
    userAgent: userContext.userAgent
  });

  // Send welcome email with club discovery link (Workplan requirement: Line 26)
  await sendMail({
    to: user.email,
    subject: 'Welcome to KMIT Clubs Hub!',
    html: `
      <h2>Welcome to KMIT Clubs Hub, ${profileData.name}!</h2>
      <p>Your registration is complete. We're excited to have you join our community!</p>
      <p><strong>Your Details:</strong></p>
      <ul>
        <li>Roll Number: ${user.rollNumber}</li>
        <li>Email: ${user.email}</li>
        <li>Department: ${profileData.department}</li>
        <li>Year: ${profileData.year}</li>
      </ul>
      <p>Start exploring clubs and get involved:</p>
      <p><a href="${config.FRONTEND_URL}/clubs" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Discover Clubs</a></p>
      <p>Best regards,<br>KMIT Clubs Team</p>
    `
  });

  return { user, tokens: { accessToken, refreshToken: raw } };
};

/**
 * LOGIN
 */
exports.login = async ({ identifier, password, rememberDevice }, userContext) => {
  const user = await User.findOne({
    $or: [{ email: identifier }, { rollNumber: identifier }]
  });
  if (!user) throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });

  // handle lockout
  if (user.accountLockedUntil && user.accountLockedUntil > Date.now()) {
    throw Object.assign(new Error('Account locked'), { statusCode: 423 });
  }

  const ok = await user.verifyPassword(password);
  if (!ok) {
    user.loginAttempts += 1;
    if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      user.accountLockedUntil = Date.now() + LOCK_DURATION;
      await sendMail({ to: user.email, subject: 'Account Locked', text: 'Locked for 30m' });
      await notificationService.create({
        user: user._id,
        type: 'system_maintenance',
        payload: {},
        priority: 'HIGH'
      });
    }
    await user.save();
    // Progressive delay: 1s, 2s, 4s, 8s, 16s (workplan requirement)
    const delays = [0, 1000, 2000, 4000, 8000, 16000];
    const delay = delays[Math.min(user.loginAttempts, delays.length - 1)];
    await new Promise(r => setTimeout(r, delay));
    throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
  }

  user.loginAttempts = 0;
  user.accountLockedUntil = null;
  await user.save();

  // Device fingerprinting for security (Workplan requirement)
  const deviceFingerprint = generateDeviceFingerprint(userContext.userAgent, userContext.ip);
  const deviceInfo = parseUserAgent(userContext.userAgent);
  const isKnownDevice = await isDeviceRecognized(user._id, deviceFingerprint);

  // Send notification for new device login
  if (!isKnownDevice) {
    await sendMail({
      to: user.email,
      subject: 'New Device Login Detected',
      html: `
        <h2>New Device Login</h2>
        <p>We detected a login to your account from a new device:</p>
        <ul>
          <li><strong>Device:</strong> ${deviceInfo.deviceName}</li>
          <li><strong>Browser:</strong> ${deviceInfo.browser} ${deviceInfo.browserVersion}</li>
          <li><strong>OS:</strong> ${deviceInfo.os} ${deviceInfo.osVersion}</li>
          <li><strong>IP Address:</strong> ${userContext.ip}</li>
          <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
        </ul>
        <p>If this was you, no action is needed. If you don't recognize this activity, please change your password immediately.</p>
        <p><a href="${config.FRONTEND_URL}/change-password">Change Password</a></p>
      `
    });

    await notificationService.create({
      user: user._id,
      type: 'system_maintenance',
      payload: { 
        reason: 'new_device_login',
        deviceName: deviceInfo.deviceName,
        ip: userContext.ip
      },
      priority: 'HIGH'
    });
  }

  // Add device context to userContext for session creation
  userContext.deviceFingerprint = deviceFingerprint;
  userContext.deviceInfo = deviceInfo;
  userContext.isNewDevice = !isKnownDevice;
  userContext.rememberDevice = rememberDevice || false;

  // issue tokens / complete profile
  const result = await this.completeProfile(user._id, user.profile, userContext);

  // enforce max 3 sessions
  const sessions = await Session.find({ user: user._id, revokedAt: null }).sort({ createdAt: 1 });
  if (sessions.length > 3) {
    const toRevoke = sessions.slice(0, sessions.length - 3);
    await Promise.all(toRevoke.map(s => (s.revokedAt = new Date(), s.save())));
  }

  // audit
  await auditService.log({
    user: user._id,
    action: 'USER_LOGIN',
    target: `User:${user._id}`,
    ip: userContext.ip,
    userAgent: userContext.userAgent
  });

  return result;
};

/**
 * REFRESH TOKEN
 */
exports.refreshToken = async ({ refreshToken }) => {
  const sha = hashSha256(refreshToken);
  const oldSession = await Session.findOne({ sha256Hash: sha, revokedAt: null });
  
  // Validate old session
  if (!oldSession || oldSession.expiresAt < new Date()) {
    const e = new Error('Invalid refresh token');
    e.statusCode = 401;
    throw e;
  }
  if (!await compareBcrypt(refreshToken, oldSession.bcryptHash)) {
    const e = new Error('Invalid refresh token');
    e.statusCode = 401;
    throw e;
  }

  // Revoke old session
  oldSession.revokedAt = new Date();
  await oldSession.save();

  // Create NEW session (proper refresh token rotation)
  const raw = genRandom(40);
  const sha2 = hashSha256(raw);
  const bcryptHash2 = await hashBcrypt(raw);
  
  const newSession = new Session({
    user: oldSession.user,
    sha256Hash: sha2,
    bcryptHash: bcryptHash2,
    ip: oldSession.ip,
    userAgent: oldSession.userAgent,
    expiresAt: new Date(Date.now() + ms(config.REFRESH_TOKEN_EXPIRY)),
    revokedAt: null
  });
  await newSession.save();

  // Get user for JWT
  const user = await User.findById(oldSession.user);
  
  const accessToken = jwtUtil.sign(
    { id: user._id, roles: user.roles },
    { expiresIn: config.JWT_EXPIRY }
  );
  
  return { accessToken, refreshToken: raw };
};

/**
 * LOGOUT (single session)
 */
exports.revokeRefreshToken = async (token, userId) => {
  const sha = hashSha256(token);
  const session = await Session.findOne({ sha256Hash: sha, user: userId, revokedAt: null });
  if (session) {
    session.revokedAt = new Date();
    await session.save();
  }
};

/**
 * LOGOUT ALL
 */
exports.revokeAllSessions = async (userId) => {
  await Session.updateMany({ user: userId, revokedAt: null }, { revokedAt: new Date() });
};

/**
 * FORGOT PASSWORD
 */
exports.forgotPassword = async (identifier, userContext) => {
  // Look up by email or rollNumber
  const user = await User.findOne({
    $or: [{ email: identifier }, { rollNumber: identifier }]
  });
  if (!user) {
    // Always return success to avoid account enumeration
    return;
  }
  
  const email = user.email;

  // Check max 3 reset attempts per day (workplan requirement)
  const resetAttemptsKey = `reset:attempts:${user._id}`;
  const attempts = await redis.get(resetAttemptsKey);
  const attemptCount = attempts ? parseInt(attempts) : 0;
  
  if (attemptCount >= MAX_RESET_ATTEMPTS) {
    const err = new Error('Maximum password reset attempts reached. Please try again in 24 hours.');
    err.statusCode = 429;
    throw err;
  }

  // Enforce 24-hour cooldown
  if (user.forgotPasswordRequestedAt &&
      Date.now() - user.forgotPasswordRequestedAt < RESET_COOLDOWN) {
    const err = new Error('Password reset requested too recently. Please wait 24 hours.');
    err.statusCode = 429;
    throw err;
  }

  // Increment attempt counter with 24-hour TTL
  await redis.multi()
    .incr(resetAttemptsKey)
    .expire(resetAttemptsKey, 86400) // 24 hours
    .exec();

  // Update last requested time
  user.forgotPasswordRequestedAt = Date.now();
  await user.save();

  // Generate reset token + OTP
  const rawToken = uuidv4();
  const otp      = Math.floor(100000 + Math.random() * 900000).toString();
  const sha      = hashSha256(rawToken);
  const bcryptHash = await hashBcrypt(rawToken);
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const expiresAt    = new Date(Date.now() + 15 * 60 * 1000);

  // Persist PasswordReset record
  await PasswordReset.create({
    user: user._id,
    sha256Hash: sha,
    bcryptHash,
    otp,
    otpExpiresAt,
    expiresAt
  });

  // Send OTP + reset link
  console.log('📧 Sending password reset OTP:', { email, otp, expiresIn: '10 minutes' });
  await sendMail({
    to: email,
    subject: 'KMIT Clubs Hub Password Reset',
    html: `
      <p>Your OTP is <strong>${otp}</strong> (valid 10 min).</p>
      <p>Reset link: <a href="${config.FRONTEND_URL}/reset?token=${rawToken}&email=${email}">
         Click here to reset your password</a></p>
    `
  });
  console.log('✅ Password reset OTP email sent successfully to:', email);

  // Enqueue notification
  await notificationService.create({
    user: user._id,
    type: 'system_maintenance',  // or define a specific 'password_reset' type
    payload: { email },
    priority: 'HIGH'
  });

  // Audit log
  await auditService.log({
    user: user._id,
    action: 'PASSWORD_RESET_REQUEST',
    target: `User:${user._id}`,
    newValue: { method: 'email', otpSent: true },
    ip: userContext.ip,
    userAgent: userContext.userAgent
  });
};

/**
 * VERIFY RESET OTP
 */
exports.verifyResetOtp = async ({ identifier, otp }, userContext) => {
  if (!identifier || !otp) {
    console.error('Missing identifier or otp:', { identifier, otp });
    throw Object.assign(new Error('Identifier and OTP are required'), { statusCode: 400 });
  }
  
  const user = await User.findOne({
    $or: [{ email: identifier }, { rollNumber: identifier }]
  });
  
  if (!user) {
    console.error('User not found for identifier:', identifier);
    throw Object.assign(new Error('Invalid identifier'), { statusCode: 400 });
  }

  // Debug: Check what reset records exist for this user
  const allResets = await PasswordReset.find({ user: user._id }).sort({ createdAt: -1 }).limit(3);
  console.log('🔍 Debug - All password resets for user:', {
    userId: user._id,
    userEmail: user.email,
    submittedOTP: otp,
    resets: allResets.map(r => ({
      otp: r.otp,
      expiresAt: r.expiresAt,
      usedAt: r.usedAt,
      isExpired: r.expiresAt < new Date()
    }))
  });

  const rec = await PasswordReset.findOne({
    user: user._id,
    otp,
    expiresAt: { $gt: new Date() },
    usedAt: null
  });
  
  if (!rec) {
    console.error('❌ No matching password reset found:', {
      userId: user._id,
      submittedOTP: otp,
      now: new Date()
    });
    throw Object.assign(new Error('Invalid or expired OTP'), { statusCode: 400 });
  }
  
  console.log('✅ Valid OTP found, verification successful');

  // audit
  await auditService.log({
    user: user._id,
    action: 'PASSWORD_RESET_OTP_VERIFIED',
    target: `User:${user._id}`,
    ip: userContext.ip,
    userAgent: userContext.userAgent
  });

  return true;
};

/**
 * RESET PASSWORD
 */
exports.resetPassword = async ({ identifier, otp, newPassword }, userContext) => {
  const user = await User.findOne({
    $or: [{ email: identifier }, { rollNumber: identifier }]
  });
  if (!user) throw Object.assign(new Error('Invalid'), { statusCode: 400 });

  const rec = await PasswordReset.findOne({
    user: user._id,
    otp,
    expiresAt: { $gt: new Date() },
    usedAt: null
  });
  if (!rec) throw Object.assign(new Error('Invalid or expired token/OTP'), { statusCode: 400 });

  // Workplan Line 18: Validate password doesn't contain roll number
  if (newPassword.toLowerCase().includes(user.rollNumber.toLowerCase())) {
    throw Object.assign(new Error('Password cannot contain your roll number'), { statusCode: 400 });
  }

  // update password
  await user.setPassword(newPassword);
  await user.save();

  // mark reset used & revoke sessions
  rec.usedAt = new Date();
  await rec.save();
  await this.revokeAllSessions(user._id);

  // notification
  await notificationService.create({
    user: user._id,
    type: 'system_maintenance',  // or 'password_reset_success'
    payload: {},
    priority: 'MEDIUM'
  });

  // audit
  await auditService.log({
    user: user._id,
    action: 'PASSWORD_RESET',
    target: `User:${user._id}`,
    ip: userContext.ip,
    userAgent: userContext.userAgent
  });
};

/**
 * RESEND OTP (Workplan Line 32: Session progress saving)
 * Saves registration progress and resends OTP if session expires
 */
exports.resendOtp = async ({ email }, userContext) => {
  // Check if user exists with pending OTP
  const user = await User.findOne({ email, status: { $in: ['otp_sent', 'pending'] } });
  if (!user) {
    const err = new Error('No pending registration found for this email');
    err.statusCode = 404;
    throw err;
  }

  // Workplan Line 22: Max 3 OTP resends per hour rate limiting
  const key = `otp:reg:${email}`;
  const resendCount = await redis.get(`${key}:count`);
  if (resendCount && parseInt(resendCount) >= 3) {
    const err = new Error('Maximum 3 OTP resends per hour exceeded. Please try again later.');
    err.statusCode = 429;
    throw err;
  }

  // Save registration progress in Redis (Workplan Line 32)
  await redis.setex(`registration:progress:${email}`, 3600, JSON.stringify({
    rollNumber: user.rollNumber,
    email: user.email,
    status: user.status,
    createdAt: user.createdAt
  }));

  // Generate and send new OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await redis.multi()
    .set(key, otp, 'EX', 600)
    .incr(`${key}:count`)
    .expire(`${key}:count`, 3600)
    .exec();

  await sendMail({
    to: email,
    subject: 'KMIT Clubs Hub - Resend OTP',
    html: `<p>Your new OTP is <strong>${otp}</strong>. Expires in 10 minutes.</p>`
  });

  // Audit log
  await auditService.log({
    user: user._id,
    action: 'OTP_RESEND',
    target: `User:${user._id}`,
    ip: userContext.ip,
    userAgent: userContext.userAgent
  });
};