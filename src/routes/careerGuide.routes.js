/**
 * CareerPulse AI - 12th Career Guide Routes
 * Protected endpoints for generating AI-guided degree recommendations and viewing history.
 */

import express from 'express';
import { body } from 'express-validator';
import * as careerGuideController from '../controllers/careerGuide.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { aiLimiter } from '../middleware/rateLimit.middleware.js';

const router = express.Router();

router.use(protect);

router.post(
  '/recommend',
  aiLimiter,
  validate([
    body('options')
      .isArray({ min: 1 })
      .withMessage('At least one career guide option must be selected'),
    body('district').optional().trim(),
    body('preferredCourse').optional().trim()
  ]),
  careerGuideController.recommendCareerGuide
);

router.get('/history', careerGuideController.getCareerGuideHistory);

export default router;
