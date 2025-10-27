//src/modules/recruitment/recruitment.routes.js
const router       = require('express').Router();
const authenticate = require('../../middlewares/auth');
const { optionalAuth } = require('../../middlewares/auth');
const { 
  requireEither,
  CORE_AND_PRESIDENT,  // ✅ All core roles + president
  PRESIDENT_ONLY       // ✅ President only
} = require('../../middlewares/permission');
const validate     = require('../../middlewares/validate');
const v            = require('./recruitment.validators');
const ctrl         = require('./recruitment.controller');
const { Recruitment } = require('./recruitment.model');

// ✅ Middleware to load recruitment and add club to req.body for permission checking
const addRecruitmentClub = async (req, res, next) => {
  try {
    const recruitment = await Recruitment.findById(req.params.id).lean();
    if (!recruitment) {
      return res.status(404).json({ status: 'error', message: 'Recruitment not found' });
    }
    // Add club to req.body so permission middleware can check it
    req.body.club = recruitment.club.toString();
    next();
  } catch (error) {
    next(error);
  }
};

// Create Recruitment (Core+ can create recruitment - Section 4.1)
router.post(
  '/',
  authenticate,
  requireEither(['admin'], CORE_AND_PRESIDENT, 'club'), // ✅ Admin OR Core+President, check 'club' field
  validate(v.createSchema),
  ctrl.create
);


// Schedule/Open/Close (Core+ can manage lifecycle - Section 4.1)
router.post(
  '/:id/status',
  authenticate,
  validate(v.recruitmentId, 'params'),
  validate(v.lifecycleSchema),
  addRecruitmentClub,  // ✅ Load recruitment and add club to req.body
  requireEither(['admin'], CORE_AND_PRESIDENT, 'club'), // ✅ Check permission for club
  ctrl.changeStatus
);

// List Recruitments (Public - Section 4.2)
router.get(
  '/',
  validate(v.listSchema, 'query'),
  ctrl.list
);

// Get By ID (Public for open ones - Section 4.2)
// ✅ Uses optionalAuth so logged-in users get canManage flag
router.get(
  '/:id',
  optionalAuth,  // ✅ Sets req.user if authenticated, doesn't fail if not
  validate(v.recruitmentId, 'params'),
  ctrl.getById
);

// Apply (Students can apply - Section 4.2)
router.post(
  '/:id/apply',
  authenticate,
  validate(v.recruitmentId, 'params'),
  validate(v.applySchema),
  ctrl.apply
);

// List Applications (Core+ can view applications - Section 4.3)
router.get(
  '/:id/applications',
  authenticate,
  validate(v.recruitmentId, 'params'),
  validate(v.listSchema, 'query'),
  addRecruitmentClub,  // ✅ Load recruitment and add club to req.body
  requireEither(['admin'], CORE_AND_PRESIDENT, 'club'), // ✅ Check permission for club
  ctrl.listApplications
);

// Review Single Application (Core+ can review applications - Section 4.3)
router.patch(
  '/:id/applications/:appId',
  authenticate,
  validate(v.recruitmentIdAndAppId, 'params'),
  validate(v.reviewSchema),
  addRecruitmentClub,  // ✅ Load recruitment and add club to req.body
  requireEither(['admin'], CORE_AND_PRESIDENT, 'club'), // ✅ Check permission for club
  ctrl.review
);

// Bulk Review (Core+ can bulk review - Section 4.3)
router.patch(
  '/:id/applications',
  authenticate,
  validate(v.recruitmentId, 'params'),
  validate(v.bulkReviewSchema),
  addRecruitmentClub,  // ✅ Load recruitment and add club to req.body
  requireEither(['admin'], CORE_AND_PRESIDENT, 'club'), // ✅ Check permission for club
  ctrl.bulkReview
);

module.exports = router;