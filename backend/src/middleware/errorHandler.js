/**
 * Comprehensive Error Handling Middleware
 * 
 * This middleware provides centralized error handling with proper logging,
 * user-friendly error messages, and appropriate HTTP status codes.
 */

const { ValidationError } = require('mongoose');
const { JsonWebTokenError, TokenExpiredError } = require('jsonwebtoken');

// Error types and their corresponding HTTP status codes
const ERROR_TYPES = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// User-friendly error messages
const ERROR_MESSAGES = {
  VALIDATION_ERROR: 'Please check your input and try again',
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'You do not have permission to perform this action',
  NOT_FOUND: 'The requested resource was not found',
  CONFLICT: 'This resource already exists',
  UNPROCESSABLE_ENTITY: 'The request could not be processed',
  TOO_MANY_REQUESTS: 'Too many requests. Please try again later',
  INTERNAL_SERVER_ERROR: 'An unexpected error occurred. Please try again',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable. Please try again later'
};

// Log error details
const logError = (error, req) => {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    userId: req.user?.userId || req.user?.user?._id,
    error: {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }
  };
  
  console.error('🚨 Error occurred:', JSON.stringify(errorInfo, null, 2));
  
  // In production, you might want to send this to an error tracking service
  // like Sentry, LogRocket, or DataDog
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to error tracking service
    // errorTrackingService.captureException(error, { extra: errorInfo });
  }
};

// Handle different types of errors
const handleMongooseError = (error) => {
  if (error instanceof ValidationError) {
    const validationErrors = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message,
      value: err.value
    }));
    
    return {
      status: ERROR_TYPES.VALIDATION_ERROR,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: validationErrors
    };
  }
  
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return {
      status: ERROR_TYPES.CONFLICT,
      code: 'DUPLICATE_ENTRY',
      message: `${field} already exists`,
      field: field
    };
  }
  
  return null;
};

const handleJWTError = (error) => {
  if (error instanceof TokenExpiredError) {
    return {
      status: ERROR_TYPES.UNAUTHORIZED,
      code: 'TOKEN_EXPIRED',
      message: 'Your session has expired. Please login again'
    };
  }
  
  if (error instanceof JsonWebTokenError) {
    return {
      status: ERROR_TYPES.UNAUTHORIZED,
      code: 'INVALID_TOKEN',
      message: 'Invalid authentication token'
    };
  }
  
  return null;
};

const handleCustomError = (error) => {
  // Handle custom application errors
  if (error.status && error.code) {
    return {
      status: error.status,
      code: error.code,
      message: error.message || ERROR_MESSAGES[error.code] || 'An error occurred'
    };
  }
  
  return null;
};

// Main error handling middleware
const errorHandler = (error, req, res, next) => {
  // Log the error
  logError(error, req);
  
  let errorResponse = {
    status: ERROR_TYPES.INTERNAL_SERVER_ERROR,
    code: 'INTERNAL_SERVER_ERROR',
    message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
  };
  
  // Handle different error types
  const mongooseError = handleMongooseError(error);
  if (mongooseError) {
    errorResponse = mongooseError;
  } else {
    const jwtError = handleJWTError(error);
    if (jwtError) {
      errorResponse = jwtError;
    } else {
      const customError = handleCustomError(error);
      if (customError) {
        errorResponse = customError;
      }
    }
  }
  
  // Add request ID for tracking
  errorResponse.requestId = req.id || 'unknown';
  
  // Add timestamp
  errorResponse.timestamp = new Date().toISOString();
  
  // In development, include stack trace
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = error.stack;
  }
  
  res.status(errorResponse.status).json({
    success: false,
    error: errorResponse
  });
};

// 404 handler for undefined routes
const notFoundHandler = (req, res) => {
  res.status(ERROR_TYPES.NOT_FOUND).json({
    success: false,
    error: {
      status: ERROR_TYPES.NOT_FOUND,
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.url} not found`,
      timestamp: new Date().toISOString(),
      requestId: req.id || 'unknown'
    }
  });
};

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Rate limiting error handler
const rateLimitHandler = (req, res) => {
  res.status(ERROR_TYPES.TOO_MANY_REQUESTS).json({
    success: false,
    error: {
      status: ERROR_TYPES.TOO_MANY_REQUESTS,
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests. Please try again later',
      retryAfter: req.rateLimit?.resetTime || 60,
      timestamp: new Date().toISOString()
    }
  });
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  rateLimitHandler,
  ERROR_TYPES,
  ERROR_MESSAGES
};
