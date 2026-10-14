/**
 * CareerPulse AI - Diploma Routes
 * Protected endpoints for polytechnic courses, colleges, and AI interest recommendations.
 */

import express from 'express';
import { body, query } from 'express-validator';
import * as diplomaController from '../controllers/diploma.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { protect } from '../middleware/auth.middleware.js';
import { aiLimiter } from '../middleware/rateLimit.middleware.js';

const router = express.Router();

router.use(protect);

router.get(
  '/courses',
  validate([query('search').optional().trim()]),
  diplomaController.getCourses
);

router.get(
  '/colleges',
  validate([
    query('district').optional().trim(),
    query('course').optional().trim(),
    query('type').optional().trim(),
    query('search').optional().trim()
  ]),
  diplomaController.getColleges
);

router.post(
  '/recommend',
  aiLimiter,
  validate([
    body('interests')
      .isArray({ min: 1 })
      .withMessage('At least one interest tag must be selected'),
    body('district').optional().trim()
  ]),
  diplomaController.recommendDiploma
);

export default router;
