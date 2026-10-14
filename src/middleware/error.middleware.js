/**
 * CareerPulse AI - Central Error Handling Middleware
 * Intercepts all runtime exceptions, Mongoose validation errors, and sends uniform JSON responses.
 */

import { errorResponse } from '../helpers/apiResponse.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = null;

  // Server-side logging
  if (!env.isProduction) {
    logger.error(`[Error Middleware] ${req.method} ${req.originalUrl}:`, err);
  } else {
    // In production: log error details server-side only
    logger.error(`[Error Middleware] ${req.method} ${req.originalUrl} [${statusCode}]:`, err.message);
    if (statusCode === 500) {
      message = 'An unexpected server error occurred. Please try again later.';
    }
  }

  // Mongoose duplicate key error (E11000)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const val = err.keyValue ? err.keyValue[field] : '';
    message = `An account with this ${field} ('${val}') already exists. Please sign in instead.`;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors || {}).map((e) => e.message);
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Resource not found with id: ${err.value}`;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired';
  }

  // CORS policy violation error
  if (err.message && err.message.includes('CORS policy violation')) {
    statusCode = 403;
    message = err.message;
  }

  return errorResponse(res, message, statusCode, errors);
};

export default errorHandler;
