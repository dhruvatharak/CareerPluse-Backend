/**
 * CareerPulse AI - Rate Limiter Middleware
 * Protects endpoints from brute-force, denial-of-service, and AI resource exhaustion.
 */

import rateLimit from 'express-rate-limit';

// Global API rate limit: 100 requests per 15 minutes per IP
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP address. Please try again after 15 minutes.',
    data: null
  }
});

// Stricter rate limit for authentication (login/register): 10 attempts per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
    data: null
  }
});

// AI recommendation rate limit: 10 requests per 15 minutes per user
export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.user ? req.user._id.toString() : req.ip),
  message: {
    success: false,
    message: 'AI recommendation rate limit reached (10 requests per 15 minutes). Please try again shortly.',
    data: null
  }
});

export default {
  apiLimiter,
  authLimiter,
  aiLimiter
};
