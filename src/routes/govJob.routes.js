/**
 * CareerPulse AI - Government Jobs Routes
 */

import express from 'express';
import { query } from 'express-validator';
import * as govJobController from '../controllers/govJob.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.get(
  '/',
  validate([
    query('level').optional().isIn(['10th', '12th', 'Diploma', 'Degree', 'All']),
    query('search').optional().trim()
  ]),
  govJobController.getGovJobs
);

export default router;
