// Input Validation Middleware
const { body, param, query, validationResult } = require('express-validator');

// Validate request
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors: errors.array().map(err => ({
          field: err.path,
          message: err.msg,
          value: err.value,
        })),
      },
    });
  }
  next();
};

// Common validators
const validators = {
  // Auth validators
  register: [
    body('student_id')
      .trim()
      .notEmpty().withMessage('Student ID is required')
      .isLength({ min: 5, max: 20 }).withMessage('Student ID must be 5-20 characters'),
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase and number'),
    body('full_name')
      .trim()
      .notEmpty().withMessage('Full name is required')
      .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
    body('faculty')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('Faculty must be less than 100 characters'),
    body('major')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('Major must be less than 100 characters'),
    body('year')
      .optional()
      .isInt({ min: 1, max: 8 }).withMessage('Year must be 1-8'),
    validate,
  ],

  login: [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format'),
    body('password')
      .notEmpty().withMessage('Password is required'),
    validate,
  ],

  // Schedule validators
  createSchedule: [
    body('subject_name')
      .trim()
      .notEmpty().withMessage('Subject name is required')
      .isLength({ max: 100 }).withMessage('Subject name must be less than 100 characters'),
    body('day_of_week')
      .notEmpty().withMessage('Day of week is required')
      .isInt({ min: 0, max: 6 }).withMessage('Day must be 0-6 (Sunday=0, Saturday=6)'),
    body('start_time')
      .notEmpty().withMessage('Start time is required')
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid time format (HH:MM)'),
    body('end_time')
      .notEmpty().withMessage('End time is required')
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid time format (HH:MM)'),
    body('color')
      .optional()
      .matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Color must be hex format (#RRGGBB)'),
    validate,
  ],

  // Task validators
  createTask: [
    body('title')
      .trim()
      .notEmpty().withMessage('Task title is required')
      .isLength({ max: 200 }).withMessage('Title must be less than 200 characters'),
    body('deadline')
      .notEmpty().withMessage('Deadline is required')
      .isISO8601().withMessage('Invalid date format'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent']).withMessage('Priority must be low, medium, high, or urgent'),
    body('estimated_hours')
      .optional()
      .isFloat({ min: 0.5, max: 100 }).withMessage('Estimated hours must be 0.5-100'),
    validate,
  ],

  // Expense validators
  createExpense: [
    body('type')
      .notEmpty().withMessage('Type is required')
      .isIn(['income', 'expense']).withMessage('Type must be income or expense'),
    body('amount')
      .notEmpty().withMessage('Amount is required')
      .isFloat({ min: 0 }).withMessage('Amount must be positive'),
    body('date')
      .notEmpty().withMessage('Date is required')
      .isDate().withMessage('Invalid date format'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 255 }).withMessage('Description must be less than 255 characters'),
    validate,
  ],

  // ID parameter validator
  idParam: [
    param('id')
      .isInt({ min: 1 }).withMessage('ID must be a positive integer'),
    validate,
  ],

  // Pagination validators
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    validate,
  ],
};

// Sanitize input to prevent XSS
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        // Remove script tags and dangerous HTML
        obj[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+=/gi, '');
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);

  next();
};

module.exports = {
  validators,
  validate,
  sanitizeInput,
};
