/**
 * CareerPulse AI - Recommendation Routes
 * Protected endpoints to retrieve user career recommendations.
 */

import express from 'express';
import { param, query } from 'express-validator';
import * as recommendationController from '../controllers/recommendation.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.get(
  '/',
  validate([query('type').optional().isIn(['quiz-group', 'diploma'])]),
  recommendationController.getRecommendations
);

router.get(
  '/:id',
  validate([param('id').isMongoId().withMessage('Invalid recommendation ID format')]),
  recommendationController.getRecommendationById
);

router.delete(
  '/:id',
  validate([param('id').isMongoId().withMessage('Invalid recommendation ID format')]),
  recommendationController.deleteRecommendation
);

export default router;
