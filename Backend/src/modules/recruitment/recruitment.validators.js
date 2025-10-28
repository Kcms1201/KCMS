//src/modules/recruitment/recruitment.validators.js
const Joi = require('joi');
const { Types } = require('mongoose');

const objectId = Joi.string().custom((v, h) =>
  Types.ObjectId.isValid(v) ? v : h.error('invalid id')
);

module.exports = {
  createSchema: Joi.object({
    club: objectId.required().messages({
      'any.required': 'Club is required. Please select a club.',
      'string.base': 'Invalid club ID format',
      'string.empty': 'Club ID cannot be empty'
    }),
    title: Joi.string().max(100).required().messages({
      'any.required': 'Recruitment title is required',
      'string.max': 'Title cannot exceed 100 characters'
    }),
    description: Joi.string().max(1000).required().messages({
      'any.required': 'Description is required',
      'string.max': 'Description cannot exceed 1000 characters'
    }),
    eligibility: Joi.string().max(500).optional().messages({
      'string.max': 'Eligibility criteria cannot exceed 500 characters'
    }),
    startDate: Joi.date().required().messages({
      'any.required': 'Start date is required',
      'date.base': 'Invalid start date format'
    }),
    endDate: Joi.date().greater(Joi.ref('startDate')).required().messages({
      'any.required': 'End date is required',
      'date.base': 'Invalid end date format',
      'date.greater': 'End date must be after start date'
    }),
    positions: Joi.number().integer().min(1).max(100).optional().messages({
      'number.base': 'Positions must be a number',
      'number.min': 'At least 1 position required',
      'number.max': 'Maximum 100 positions allowed'
    }),
    customQuestions: Joi.array().items(Joi.string()).max(5).optional().messages({
      'array.max': 'Maximum 5 custom questions allowed'
    })
  }),

  updateSchema: Joi.object({
    title: Joi.string().max(100).messages({
      'string.max': 'Title cannot exceed 100 characters'
    }),
    description: Joi.string().max(1000).messages({
      'string.max': 'Description cannot exceed 1000 characters'
    }),
    eligibility: Joi.string().max(500).messages({
      'string.max': 'Eligibility criteria cannot exceed 500 characters'
    }),
    startDate: Joi.date().messages({
      'date.base': 'Invalid start date format'
    }),
    endDate: Joi.date().messages({
      'date.base': 'Invalid end date format'
    }),
    positions: Joi.number().integer().min(1).max(100).messages({
      'number.base': 'Positions must be a number',
      'number.min': 'At least 1 position required',
      'number.max': 'Maximum 100 positions allowed'
    }),
    customQuestions: Joi.array().items(Joi.string()).max(5).messages({
      'array.max': 'Maximum 5 custom questions allowed'
    })
  }).min(1),

  lifecycleSchema: Joi.object({
    action: Joi.string().valid('schedule','open','close').required()
  }),

  listSchema: Joi.object({
    club: objectId,
    status: Joi.string().valid(
      'draft','scheduled','open','closing_soon','closed','selection_done'
    ),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  }),

  recruitmentId: Joi.object({
    id: objectId.required()
  }),

  recruitmentIdAndAppId: Joi.object({
    id: objectId.required(),
    appId: objectId.required()
  }),

  applySchema: Joi.object({
    answers: Joi.array()
      .items(
        Joi.object({ question: Joi.string().required(), answer: Joi.string().required() })
      )
      .min(1)
      .required()
  }),

  reviewSchema: Joi.object({
    status: Joi.string().valid('selected','rejected').required(),
    score: Joi.number().min(0).optional()
  }),

  bulkReviewSchema: Joi.object({
    applicationIds: Joi.array().items(objectId).min(1).required(),
    status: Joi.string().valid('selected','rejected').required()
  })
};