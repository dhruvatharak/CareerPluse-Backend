/**
 * CareerPulse AI - Authentication Routes
 * Mounts endpoints for visitor registration, login, and profile verification.
 */

import express from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { protect } from '../middleware/auth.middleware.js';
import { authLimiter } from '../middleware/rateLimit.middleware.js';
import { TN_DISTRICTS, RESERVATION_CATEGORIES } from '../utils/constants.js';

const router = express.Router();

// Validation rules for Registration
const registerValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ max: 100 })
    .withMessage('Name must not exceed 100 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email address is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('district')
    .trim()
    .notEmpty()
    .withMessage('District selection is required')
    .isIn(TN_DISTRICTS)
    .withMessage('Please select a valid Tamil Nadu district'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Reservation category is required')
    .isIn(RESERVATION_CATEGORIES)
    .withMessage('Please select a valid category (OC, BC, BCM, MBC, SC, SCA, ST)'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please enter a valid 10-digit Indian phone number')
];

// Validation rules for Login
const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email address is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Route definitions
router.post('/register', authLimiter, validate(registerValidation), authController.register);
router.post('/login', authLimiter, validate(loginValidation), authController.login);
router.get('/me', protect, authController.getMe);

export default router;
