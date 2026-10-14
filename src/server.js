/**
 * CareerPulse AI - Server Entrypoint
 * Connects to MongoDB database, verifies index health, and listens for incoming HTTP requests.
 */

import app from './app.js';
import { env } from './config/env.js';
import { connectDB, closeDB } from './config/db.js';
import { logger } from './utils/logger.js';

// Models for index check
import User from './models/User.js';
import Recommendation from './models/Recommendation.js';
import CutoffRecord from './models/CutoffRecord.js';
import Favorite from './models/Favorite.js';
import CollegeCourse from './models/CollegeCourse.js';

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Verify critical database indexes
    try {
      await Promise.all([
        User.init(),
        Recommendation.init(),
        CutoffRecord.init(),
        Favorite.init(),
        CollegeCourse.init()
      ]);
      logger.info('Database indexes verified.');
    } catch (indexErr) {
      logger.warn('Index verification notice:', indexErr.message);
    }

    // Start Express listener
    const server = app.listen(env.PORT, () => {
      logger.info(`====================================================`);
      logger.info(`🚀 CareerPulse AI API Server Running!`);
      logger.info(`📍 Port:        http://localhost:${env.PORT}`);
      logger.info(`🏥 Health Check:http://localhost:${env.PORT}/api/health`);
      logger.info(`🌍 Environment: ${env.NODE_ENV}`);
      const groqConfigured = Boolean(env.GROQ_API_KEY && env.GROQ_API_KEY.trim());
      const geminiConfigured = Boolean(env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim());
      logger.info(`Groq configured: ${groqConfigured ? 'yes' : 'no'}, Gemini configured: ${geminiConfigured ? 'yes' : 'no'}`);
      logger.info(`====================================================`);
    });

    // Graceful shutdown handling
    const shutdown = async (signal) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        logger.info('HTTP server closed.');
        try {
          await closeDB();
          logger.info('MongoDB connection closed.');
          process.exit(0);
        } catch (err) {
          logger.error('Error during database shutdown:', err.message);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (err) {
    logger.error('Failed to start CareerPulse AI Backend Server:', err.message);
    process.exit(1);
  }
};

startServer();
