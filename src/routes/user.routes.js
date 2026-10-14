/**
 * CareerPulse AI - User Routes
 * Protected endpoints for fetching profile data, updating settings, and changing password.
 */

import express from 'express';
import { body } from 'express-validator';
import * as userController from '../controllers/user.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { TN_DISTRICTS, RESERVATION_CATEGORIES } from '../utils/constants.js';

const router = express.Router();

router.use(protect);

router.get('/profile', userController.getUserProfile);

router.patch(
  '/profile',
  validate([
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('district')
      .optional()
      .isIn(TN_DISTRICTS)
      .withMessage('Please select a valid Tamil Nadu district'),
    body('category')
      .optional()
      .isIn(RESERVATION_CATEGORIES)
      .withMessage('Please select a valid reservation category'),
    body('phone')
      .optional()
      .trim()
  ]),
  userController.updateUserProfile
);

router.patch(
  '/password',
  validate([
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long')
  ]),
  userController.updateUserPassword
);

export default router;
