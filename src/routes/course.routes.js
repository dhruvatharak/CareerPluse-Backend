/**
 * CareerPulse AI - Course Routes
 * Protected endpoints for degree courses catalog and top admissions courses.
 */

import express from 'express';
import { query } from 'express-validator';
import * as courseController from '../controllers/course.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = express.Router();

router.use(protect);

router.get(
  '/top',
  validate([
    query('stream').optional().trim(),
    query('limit').optional().isInt({ min: 1, max: 50 })
  ]),
  courseController.getTopCourses
);

router.get(
  '/',
  validate([
    query('stream').optional().trim(),
    query('search').optional().trim()
  ]),
  courseController.getCourses
);

router.get('/:courseId', courseController.getCourseById);

export default router;
