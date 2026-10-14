/**
 * CareerPulse AI - Express Application Setup
 * Configures global middleware, security headers, rate limiting, and mounts route handlers.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { apiLimiter } from './middleware/rateLimit.middleware.js';
import { notFound } from './middleware/notFound.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import { successResponse } from './helpers/apiResponse.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import groupRoutes from './routes/group.routes.js';
import districtRoutes from './routes/district.routes.js';
import schoolRoutes from './routes/school.routes.js';
import govJobRoutes from './routes/govJob.routes.js';
import favoriteRoutes from './routes/favorite.routes.js';
import userRoutes from './routes/user.routes.js';
import quizRoutes from './routes/quiz.routes.js';
import diplomaRoutes from './routes/diploma.routes.js';
import recommendationRoutes from './routes/recommendation.routes.js';
import cutoffRoutes from './routes/cutoff.routes.js';
import courseRoutes from './routes/course.routes.js';
import collegeRoutes from './routes/college.routes.js';
import careerGuideRoutes from './routes/careerGuide.routes.js';

const app = express();

// Trust reverse proxy (Vercel, Cloudflare, etc.) for rate limiters and IP resolution
app.set('trust proxy', 1);

// Disable X-Powered-By header
app.disable('x-powered-by');

// Security HTTP headers
app.use(helmet());

// CORS configuration (supports comma-separated CLIENT_URL and explicit OPTIONS preflight)
const configuredClientUrls = (env.CLIENT_URL || '')
  .split(',')
  .map((u) => u.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

const allowedOrigins = Array.from(new Set([...configuredClientUrls, ...defaultAllowedOrigins]));

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server) or allowed origins
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.trim().replace(/\/+$/, '');
    if (allowedOrigins.includes(normalizedOrigin) || !env.isProduction) {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy violation: Origin '${origin}' is not authorized.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
// Explicitly handle preflight OPTIONS requests across all routes
app.options('*', cors(corsOptions));

// Request logging (morgan)
if (env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsers with 100kb limit to prevent payload floods
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Data sanitization against NoSQL query injection & HTTP Parameter Pollution
app.use(mongoSanitize());
app.use(hpp());

// Lazy database connection middleware for serverless cold-start efficiency
app.use(async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    try {
      await connectDB();
    } catch (err) {
      // Allow /api/health through even if DB connection fails to return dbConnected: false
      if (req.path === '/api/health') {
        return next();
      }
      return next(err);
    }
  }
  next();
});

// Apply global rate limiting to all /api routes
app.use('/api', apiLimiter);

// Health check endpoint (returns status: 'ok', uptime, dbConnected)
app.get('/api/health', (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  return res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    dbConnected,
    timestamp: new Date().toISOString()
  });
});

// Root welcome endpoints
app.get(['/', '/api'], (req, res) => {
  return successResponse(res, 'Welcome to CareerPulse AI API Service', {
    healthCheck: '/api/health',
    documentation: 'See README.md for endpoint specifications'
  });
});

// Mount modular API routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/districts', districtRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/gov-jobs', govJobRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/users', userRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/diploma', diplomaRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/cutoff', cutoffRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/colleges', collegeRoutes);
app.use('/api/career-guide', careerGuideRoutes);

// 404 Route Not Found handler
app.use(notFound);

// Centralized error handling middleware
app.use(errorHandler);

export default app;
