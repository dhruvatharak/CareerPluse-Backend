/**
 * CareerPulse AI - Schools Routes
 */

import express from 'express';
import { query, param } from 'express-validator';
import * as schoolController from '../controllers/school.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.get(
  '/',
  validate([
    query('district').optional().trim(),
    query('search').optional().trim(),
    query('sort').optional().isIn(['passPercentage', 'centumCount', 'name']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ]),
  schoolController.getSchools
);

router.get(
  '/:schoolId',
  validate([param('schoolId').trim().notEmpty().withMessage('schoolId is required')]),
  schoolController.getSchoolById
);

export default router;
