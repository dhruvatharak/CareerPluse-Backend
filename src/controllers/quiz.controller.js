/**
 * CareerPulse AI - Quiz Controller
 * Thin controller managing aptitude questions, quiz submissions, and historical attempts.
 */

import * as quizService from '../services/quiz.service.js';
import { successResponse, errorResponse } from '../helpers/apiResponse.js';
import asyncHandler from '../helpers/asyncHandler.js';

export const getQuestions = asyncHandler(async (req, res) => {
  const questions = await quizService.getPublicQuizQuestions();
  return successResponse(res, 'Quiz questions retrieved successfully', questions);
});

export const submitQuiz = asyncHandler(async (req, res) => {
  const { answers, tenthMarks } = req.body;

  if (!Array.isArray(answers) || answers.length === 0) {
    return errorResponse(res, 'Please provide an array of answers', 400);
  }

  const result = await quizService.submitQuizAttempt({
    userId: req.user._id,
    answers,
    tenthMarks
  });

  return successResponse(res, 'Quiz submitted and recommendations generated', result, 201);
});

export const getAttempts = asyncHandler(async (req, res) => {
  const attempts = await quizService.getUserQuizAttempts(req.user._id);
  return successResponse(res, 'Quiz attempts retrieved', attempts);
});

export default {
  getQuestions,
  submitQuiz,
  getAttempts
};
