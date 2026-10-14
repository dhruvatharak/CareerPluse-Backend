/**
 * CareerPulse AI - Recommendation Service
 * Orchestrates rule-based pre-scoring, LLM AI prompting (Groq / Gemini), safe parsing,
 * deterministic fallback generation, and database persistence.
 */

import Recommendation from '../models/Recommendation.js';
import QuizAttempt from '../models/QuizAttempt.js';
import Group from '../models/Group.js';
import QuizQuestion from '../models/QuizQuestion.js';
import DiplomaCourse from '../models/DiplomaCourse.js';
import DiplomaCollege from '../models/DiplomaCollege.js';
import { callLLMWithFallback } from './llm.service.js';
import {
  SYSTEM_COUNSELLOR_PROMPT,
  buildGroupPrompt,
  buildDiplomaPrompt
} from '../helpers/promptBuilder.js';
import { logger } from '../utils/logger.js';
import { safeParseLLMResponse } from '../helpers/jsonSafeParse.js';
import {
  scoreQuizAttempt,
  buildFallbackQuizRecommendations,
  scoreDiplomaCourses,
  buildFallbackDiplomaRecommendations
} from '../helpers/groupScoring.js';

/**
 * Generates recommendation for a completed 10th Career Guide quiz attempt.
 */
export const processQuizRecommendations = async ({
  userId,
  quizAttemptId,
  answers,
  tenthMarks = null
}) => {
  const [allQuestions, allGroups] = await Promise.all([
    QuizQuestion.find({}),
    Group.find({}).sort({ groupId: 1 })
  ]);

  // Step 1: Compute rule-based score (also our deterministic fallback)
  const { categoryScores, groupScores, rankedGroups } = scoreQuizAttempt({
    questions: allQuestions,
    answers,
    tenthMarks,
    allGroups
  });

  // Take top ~8 candidates for LLM prompt context
  const topCandidateGroups = rankedGroups.slice(0, 8).map((r) => r.group);
  const allowedGroupIds = topCandidateGroups.map((g) => g.groupId);

  // Map readable answers for LLM context
  const questionMap = new Map();
  allQuestions.forEach((q) => questionMap.set(q.questionId, q));
  const readableAnswers = answers.map((ans) => {
    const q = questionMap.get(ans.questionId);
    const optKey = `option${ans.selectedOption.toUpperCase()}`;
    return {
      questionId: ans.questionId,
      category: q ? q.category : 'General',
      question: q ? q.question : ans.questionId,
      selectedOption: ans.selectedOption,
      answerText: q && q[optKey] ? q[optKey] : ans.selectedOption
    };
  });

  let finalRecommendations = [];
  let finalSummary = '';
  let generatedBy = 'fallback';
  let fallbackReason = null;

  // Step 2 & 3: Attempt AI recommendation via LLM (Groq -> Gemini)
  try {
    const userPrompt = buildGroupPrompt({
      readableAnswers,
      categoryScores,
      tenthMarks,
      candidateGroups: topCandidateGroups
    });

    const llmRes = await callLLMWithFallback({
      systemPrompt: SYSTEM_COUNSELLOR_PROMPT,
      userPrompt,
      allowedIds: allowedGroupIds,
      maxItems: 5
    });

    if (llmRes.success && llmRes.data?.recommendations?.length > 0) {
      finalRecommendations = llmRes.data.recommendations;
      finalSummary = llmRes.data.summary;
      generatedBy = llmRes.generatedBy;
      fallbackReason = llmRes.fallbackReason;
    } else {
      generatedBy = 'fallback';
      fallbackReason = llmRes.fallbackReason;
      const fallback = buildFallbackQuizRecommendations({
        rankedGroups,
        tenthMarks
      });
      finalRecommendations = fallback.recommendations;
      finalSummary = fallback.summary;
    }
  } catch (err) {
    logger.warn(`[Recommendation] LLM AI unavailable (${err.message}). Using rule-based fallback.`);
    generatedBy = 'fallback';
    fallbackReason = err.fallbackReason || 'NETWORK';

    const fallback = buildFallbackQuizRecommendations({
      rankedGroups,
      tenthMarks
    });
    finalRecommendations = fallback.recommendations;
    finalSummary = fallback.summary;
  }

  // Step 4: Persist Recommendation in database
  const recommendation = await Recommendation.create({
    user: userId,
    type: 'quiz-group',
    sourceRef: quizAttemptId || null,
    input: {
      totalQuestions: answers.length,
      categoryScores,
      tenthMarks
    },
    results: finalRecommendations,
    summary: finalSummary,
    generatedBy,
    fallbackReason
  });

  return {
    recommendation,
    categoryScores,
    groupScores
  };
};

/**
 * Generates recommendation for polytechnic diploma courses and matching colleges.
 */
export const processDiplomaRecommendations = async ({
  userId,
  interests = [],
  district = ''
}) => {
  const allCourses = await DiplomaCourse.find({}).sort({ courseId: 1 });

  // Step 1: Deterministic scoring based on interest tags
  const rankedCourses = scoreDiplomaCourses({
    courses: allCourses,
    interests
  });

  const topCandidateCourses = rankedCourses.slice(0, 8).map((r) => r.course);
  const allowedCourseIds = topCandidateCourses.map((c) => c.courseId);

  let finalRecommendations = [];
  let finalSummary = '';
  let generatedBy = 'fallback';
  let fallbackReason = null;

  // Step 2: Attempt LLM generation (Groq -> Gemini)
  try {
    const userPrompt = buildDiplomaPrompt({
      interests,
      district,
      candidateCourses: topCandidateCourses
    });

    const llmRes = await callLLMWithFallback({
      systemPrompt: SYSTEM_COUNSELLOR_PROMPT,
      userPrompt,
      allowedIds: allowedCourseIds,
      maxItems: 5
    });

    if (llmRes.success && llmRes.data?.recommendations?.length > 0) {
      finalRecommendations = llmRes.data.recommendations;
      finalSummary = llmRes.data.summary;
      generatedBy = llmRes.generatedBy;
      fallbackReason = llmRes.fallbackReason;
    } else {
      generatedBy = 'fallback';
      fallbackReason = llmRes.fallbackReason;
      const fallback = buildFallbackDiplomaRecommendations({
        rankedCourses,
        interests
      });
      finalRecommendations = fallback.recommendations;
      finalSummary = fallback.summary;
    }
  } catch (err) {
    logger.warn(`[Recommendation] LLM AI unavailable for diploma (${err.message}). Using fallback.`);
    generatedBy = 'fallback';
    fallbackReason = err.fallbackReason || 'NETWORK';

    const fallback = buildFallbackDiplomaRecommendations({
      rankedCourses,
      interests
    });
    finalRecommendations = fallback.recommendations;
    finalSummary = fallback.summary;
  }

  // Find matching polytechnic colleges in the student's district if provided
  let matchingColleges = [];
  const recommendedCourseIds = finalRecommendations.map((r) => r.id);

  const collegeQuery = {
    courses: { $in: recommendedCourseIds }
  };
  if (district && district !== 'All') {
    collegeQuery.district = district;
  }

  matchingColleges = await DiplomaCollege.find(collegeQuery).limit(10);

  // If district filter yielded no colleges, fallback to top colleges in state with those courses
  if (matchingColleges.length === 0) {
    matchingColleges = await DiplomaCollege.find({
      courses: { $in: recommendedCourseIds }
    }).limit(6);
  }

  // Persist Recommendation
  const recommendation = await Recommendation.create({
    user: userId,
    type: 'diploma',
    sourceRef: null,
    input: {
      interests,
      district: district || 'All'
    },
    results: finalRecommendations,
    summary: finalSummary,
    generatedBy,
    fallbackReason
  });

  return {
    recommendation,
    colleges: matchingColleges
  };
};

/**
 * Retrieves recommendations for a user.
 */
export const getUserRecommendations = async (userId, type = null) => {
  const query = { user: userId };
  if (type) query.type = type;

  return await Recommendation.find(query).sort({ createdAt: -1 });
};

/**
 * Retrieves a single recommendation by ID.
 */
export const getRecommendationById = async (id, userId) => {
  return await Recommendation.findOne({ _id: id, user: userId });
};

/**
 * Deletes a user's own recommendation by ID.
 */
export const deleteRecommendation = async (id, userId) => {
  return await Recommendation.findOneAndDelete({ _id: id, user: userId });
};

export default {
  processQuizRecommendations,
  processDiplomaRecommendations,
  getUserRecommendations,
  getRecommendationById,
  deleteRecommendation
};
