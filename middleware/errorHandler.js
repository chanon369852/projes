// Centralized Error Handler
class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Async error wrapper for controllers
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Global error handler middleware
const globalErrorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errorCode = err.code || 'INTERNAL_ERROR';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Invalid input data';
    errorCode = 'VALIDATION_ERROR';
  }

  if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Unauthorized access';
    errorCode = 'UNAUTHORIZED';
  }

  if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    message = 'Duplicate entry detected';
    errorCode = 'DUPLICATE_ERROR';
  }

  if (err.code === 'ER_NO_REFERENCED_ROW') {
    statusCode = 400;
    message = 'Referenced record not found';
    errorCode = 'FOREIGN_KEY_ERROR';
  }

  if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST') {
    statusCode = 503;
    message = 'Database connection error';
    errorCode = 'DATABASE_ERROR';
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code: errorCode,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        details: err.errors || err.detail || null,
      }),
    },
  });
};

// 404 handler
const notFoundHandler = (req, res, next) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404, 'NOT_FOUND');
  next(error);
};

module.exports = {
  AppError,
  asyncHandler,
  globalErrorHandler,
  notFoundHandler,
};
