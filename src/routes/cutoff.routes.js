/**
 * CareerPulse AI - Cutoff Routes
 * Protected endpoints for calculating student cutoffs and fetching student marks records.
 */

import express from 'express';
import { body } from 'express-validator';
import * as cutoffController from '../controllers/cutoff.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = express.Router();

router.use(protect);

router.post(
  '/calculate',
  validate([
    body('stream')
      .isString()
      .notEmpty()
      .withMessage('Stream is required'),
    body('twelfthMarks')
      .isObject()
      .withMessage('12th marks object is required'),
    body('twelfthTotal')
      .optional({ nullable: true })
      .isNumeric()
      .withMessage('Twelfth total must be numeric'),
    body('jee')
      .optional({ nullable: true })
      .isObject()
      .withMessage('JEE data must be an object'),
    body('neet')
      .optional({ nullable: true })
      .isObject()
      .withMessage('NEET data must be an object')
  ]),
  cutoffController.calculateCutoff
);

router.get('/me', cutoffController.getMyCutoff);

export default router;
