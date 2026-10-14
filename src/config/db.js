/**
 * CareerPulse AI - MongoDB Connection Manager
 * Connects to MongoDB via Mongoose with global connection caching for serverless environments.
 * Prevents multiple cold start connection leaks across Vercel serverless function invocations.
 */

import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

// Global connection cache across serverless invocations
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export const connectDB = async () => {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (mongoose.connection.readyState === 1) {
    cached.conn = mongoose;
    return cached.conn;
  }

  if (!cached.promise) {
    mongoose.set('strictQuery', false);

    const sanitizedUri = (env.MONGO_URI || '').replace(/:\/\/[^:]+:([^@]+)@/, '://***:***@');
    logger.info(`Connecting to MongoDB (${sanitizedUri})...`);

    const opts = {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10
    };

    cached.promise = mongoose
      .connect(env.MONGO_URI, opts)
      .then((mongooseInstance) => {
        logger.info(
          `Connected successfully to MongoDB: ${mongooseInstance.connection.host}/${mongooseInstance.connection.name}`
        );
        cached.conn = mongooseInstance;
        return mongooseInstance;
      })
      .catch((err) => {
        cached.promise = null;
        cached.conn = null;
        logger.error(`MongoDB connection failed: ${err.message}`);
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    cached.conn = null;
    throw err;
  }

  return cached.conn;
};

export const closeDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  cached.conn = null;
  cached.promise = null;
};

export default {
  connectDB,
  closeDB
};
