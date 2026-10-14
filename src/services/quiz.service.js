/**
 * CareerPulse AI - Quiz Service
 * Handles career aptitude questions retrieval, response submissions, and historical attempts.
 */

import QuizQuestion from '../models/QuizQuestion.js';
import QuizAttempt from '../models/QuizAttempt.js';
import Recommendation from '../models/Recommendation.js';
import { processQuizRecommendations } from './recommendation.service.js';

/**
 * Retrieves quiz questions for student assessment.
 * CRITICAL: Strips all internal mapping fields (mapsToA, mapsToB, mapsToC, mapsToD)
 * to maintain assessment integrity and prevent bias.
 */
export const getPublicQuizQuestions = async () => {
  return await QuizQuestion.find({}, {
    mapsToA: 0,
    mapsToB: 0,
    mapsToC: 0,
    mapsToD: 0,
    createdAt: 0,
    updatedAt: 0,
    __v: 0
  }).sort({ questionId: 1 });
};

/**
 * Submits student answers, computes scores, generates recommendations,
 * and saves both QuizAttempt and Recommendation records.
 */
export const submitQuizAttempt = async ({ userId, answers, tenthMarks = null }) => {
  // 1. Process scoring and generate recommendation (AI or Fallback)
  const { recommendation, categoryScores, groupScores } =
    await processQuizRecommendations({
      userId,
      answers,
      tenthMarks
    });

  // 2. Persist QuizAttempt
  const attempt = await QuizAttempt.create({
    user: userId,
    answers,
    categoryScores,
    groupScores,
    tenthMarks: tenthMarks || {}
  });

  // 3. Link QuizAttempt back to Recommendation
  recommendation.sourceRef = attempt._id;
  await recommendation.save();

  return {
    attempt,
    recommendation
  };
};

/**
 * Retrieves all previous quiz attempts for a student, attaching the linked recommendation.
 */
export const getUserQuizAttempts = async (userId) => {
  const attempts = await QuizAttempt.find({ user: userId })
    .sort({ createdAt: -1 })
    .lean();

  const attemptIds = attempts.map((a) => a._id);
  const recommendations = await Recommendation.find({
    sourceRef: { $in: attemptIds }
  }).lean();

  const recMap = new Map();
  recommendations.forEach((r) => recMap.set(r.sourceRef.toString(), r));

  return attempts.map((att) => ({
    ...att,
    recommendation: recMap.get(att._id.toString()) || null
  }));
};
