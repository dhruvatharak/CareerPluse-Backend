/**
 * CareerPulse AI - Favorites Routes
 */

import express from 'express';
import { body, param } from 'express-validator';
import * as favoriteController from '../controllers/favorite.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.post(
  '/',
  validate([
    body('itemType')
      .trim()
      .isIn(['group', 'school', 'college', 'diploma', 'degreeCollege'])
      .withMessage('Invalid itemType'),
    body('itemId')
      .trim()
      .notEmpty()
      .withMessage('itemId is required')
  ]),
  favoriteController.addFavorite
);

router.delete(
  '/:itemType/:itemId',
  validate([
    param('itemType')
      .trim()
      .isIn(['group', 'school', 'college', 'diploma', 'degreeCollege'])
      .withMessage('Invalid itemType'),
    param('itemId')
      .trim()
      .notEmpty()
      .withMessage('itemId is required')
  ]),
  favoriteController.removeFavorite
);

router.get('/', favoriteController.getFavorites);

export default router;
