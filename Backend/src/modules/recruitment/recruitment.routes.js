//src/modules/recruitment/recruitment.routes.js
const router       = require('express').Router();
const authenticate = require('../../middlewares/auth');
const { 
  requireEither,
  CORE_AND_PRESIDENT,  // ✅ All core roles + president
  PRESIDENT_ONLY       // ✅ President only
} = require('../../middlewares/permission');
const validate     = require('../../middlewares/validate');
const v            = require('./recruitment.validators');
const ctrl         = require('./recruitment.controller');

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
  requireEither(['admin'], CORE_AND_PRESIDENT), // ✅ Admin OR Core+President
  validate(v.recruitmentId, 'params'),
  validate(v.lifecycleSchema),
  ctrl.changeStatus
);

// List Recruitments (Public - Section 4.2)
router.get(
  '/',
  validate(v.listSchema, 'query'),
  ctrl.list
);

// Get By ID (Public for open ones - Section 4.2)
router.get(
  '/:id',
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
  requireEither(['admin'], CORE_AND_PRESIDENT), // ✅ Admin OR Core+President
  validate(v.recruitmentId, 'params'),
  validate(v.listSchema, 'query'),
  ctrl.listApplications
);

// Review Single Application (Core+ can review applications - Section 4.3)
router.patch(
  '/:id/applications/:appId',
  authenticate,
  requireEither(['admin'], CORE_AND_PRESIDENT), // ✅ Admin OR Core+President
  validate(v.recruitmentIdAndAppId, 'params'),
  validate(v.reviewSchema),
  ctrl.review
);

// Bulk Review (Core+ can bulk review - Section 4.3)
router.patch(
  '/:id/applications',
  authenticate,
  requireEither(['admin'], CORE_AND_PRESIDENT), // ✅ Admin OR Core+President
  validate(v.recruitmentId, 'params'),
  validate(v.bulkReviewSchema),
  ctrl.bulkReview
);

module.exports = router;