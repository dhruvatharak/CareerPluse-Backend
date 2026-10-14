/**
 * CareerPulse AI - Environment Configuration & Validation
 * Loads and validates environment variables from .env
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isProduction = process.env.NODE_ENV === 'production';
const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);

// In production, strictly enforce presence and length of required variables
if (isProduction) {
  const requiredVars = ['MONGO_URI', 'JWT_SECRET', 'CLIENT_URL'];
  const missing = requiredVars.filter((key) => !process.env[key] || process.env[key].trim() === '');
  if (missing.length > 0) {
    console.error(`[FATAL] Missing required production environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length < 32) {
    console.error('[FATAL] Security violation: JWT_SECRET must be at least 32 characters long in production mode.');
    process.exit(1);
  }
}

// Timeout per individual LLM provider attempt (default 8000ms on Vercel to stay within serverless limits)
const parsedTimeout = parseInt(process.env.LLM_TIMEOUT_MS, 10);
const LLM_TIMEOUT_MS = !isNaN(parsedTimeout) && parsedTimeout > 0
  ? parsedTimeout
  : (isVercel ? 8000 : 30000);

// Total time budget shared across all providers before triggering deterministic rule-based fallback
const parsedBudget = parseInt(process.env.LLM_TOTAL_BUDGET_MS, 10);
const LLM_TOTAL_BUDGET_MS = !isNaN(parsedBudget) && parsedBudget > 0
  ? parsedBudget
  : (isVercel ? Math.max(LLM_TIMEOUT_MS, 9000) : Math.max(LLM_TIMEOUT_MS, 30000));

export const env = {
  PORT: parseInt(process.env.PORT, 10) || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/careerpulse',
  JWT_SECRET: process.env.JWT_SECRET || 'careerpulse_default_dev_jwt_secret_key_minimum_length_32_chars',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  GROQ_API_URL: process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions',
  GROQ_MODEL: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_API_URL: process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  LLM_TIMEOUT_MS,
  LLM_TOTAL_BUDGET_MS,
  isProduction,
  isVercel
};

export default env;
