const router      = require('express').Router();
const validate    = require('../../middlewares/validate');
const authCtrl    = require('./auth.controller');
const v           = require('./auth.validators');
const authMw      = require('../../middlewares/auth');
const { loginLimiter } = require('../../middlewares/rateLimit');

// Registration & OTP flows
router.post('/register',
  validate(v.register),
  authCtrl.register
);

router.post('/verify-otp',
  validate(v.verifyOtp),
  authCtrl.verifyOtp
);

// Resend OTP (Workplan Line 32: Session progress saving)
router.post('/resend-otp',
  validate(v.verifyOtp), // Reuse verifyOtp validator (only needs email)
  authCtrl.resendOtp
);

// Complete profile (requires short‐JWT)
router.post('/complete-profile',
  authMw,
  validate(v.completeProfile),
  authCtrl.completeProfile
);

// Login with rate-limit & progressive delays
router.post('/login',
  loginLimiter,
  validate(v.login),
  authCtrl.login
);

// Refresh token
router.post('/refresh-token',
  validate(v.refresh),
  authCtrl.refreshToken
);

// Logout single & all
router.post('/logout',
  authMw,
  authCtrl.logout
);

router.post('/logout-all',
  authMw,
  authCtrl.logoutAll
);

// Forgot/Reset password
router.post('/forgot-password',
  validate(v.forgotPassword),
  authCtrl.forgotPassword
);

router.post('/verify-reset',
  validate(v.verifyReset),
  authCtrl.verifyReset
);

router.post('/reset-password',
  validate(v.resetPassword),
  authCtrl.resetPassword
);

// JWT Configuration Info (public endpoint for monitoring)
router.get('/jwt-info',
  authCtrl.getJwtInfo
);

module.exports = router;