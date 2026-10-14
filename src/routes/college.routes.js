/**
 * CareerPulse AI - College Routes
 * Protected endpoints for degree colleges catalog, exam filters, college detail with cutoffs,
 * and bucketed college matching.
 */

import express from 'express';
import { query } from 'express-validator';
import * as collegeController from '../controllers/college.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = express.Router();

router.use(protect);

router.get(
  '/match',
  collegeController.getCollegesMatch
);

router.get(
  '/',
  validate([
    query('exam').optional().trim(),
    query('district').optional().trim(),
    query('tier').optional().trim(),
    query('type').optional().trim(),
    query('course').optional().trim(),
    query('search').optional().trim(),
    query('sort').optional().trim(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ]),
  collegeController.getColleges
);

router.get('/:collegeId', collegeController.getCollegeById);

export default router;
