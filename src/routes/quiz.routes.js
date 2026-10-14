/**
 * CareerPulse AI - Quiz Routes
 * Protected endpoints for fetching assessment questions, submitting quizzes, and viewing past attempts.
 */

import express from 'express';
import { body } from 'express-validator';
import * as quizController from '../controllers/quiz.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { protect } from '../middleware/auth.middleware.js';
import { aiLimiter } from '../middleware/rateLimit.middleware.js';

const router = express.Router();

router.use(protect);

router.get('/questions', quizController.getQuestions);

router.post(
  '/submit',
  aiLimiter,
  validate([
    body('answers')
      .isArray({ min: 1 })
      .withMessage('Answers array is required and must not be empty'),
    body('answers.*.questionId')
      .trim()
      .notEmpty()
      .withMessage('Each answer must contain a valid questionId'),
    body('answers.*.selectedOption')
      .trim()
      .isIn(['A', 'B', 'C', 'D'])
      .withMessage('Selected option must be one of A, B, C, or D'),
    body('tenthMarks').optional().isObject()
  ]),
  quizController.submitQuiz
);

router.get('/attempts', quizController.getAttempts);

export default router;
