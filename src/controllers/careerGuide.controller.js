/**
 * CareerPulse AI - 12th Career Guide Controller
 * Thin controller managing LLM AI recommendations, rule-based fallback, and history.
 */

import * as careerGuideService from '../services/careerGuide.service.js';
import { successResponse } from '../helpers/apiResponse.js';
import asyncHandler from '../helpers/asyncHandler.js';

export const recommendCareerGuide = asyncHandler(async (req, res) => {
  const { options, district, preferredCourse } = req.body;

  const result = await careerGuideService.generateCareerGuide({
    userId: req.user._id,
    options,
    district,
    preferredCourse
  });

  return successResponse(
    res,
    '12th Career Guide recommendations generated successfully',
    result,
    201
  );
});

export const getCareerGuideHistory = asyncHandler(async (req, res) => {
  const history = await careerGuideService.getCareerGuideHistory(req.user._id);
  return successResponse(res, 'Career guide history retrieved', history, 200);
});

export default {
  recommendCareerGuide,
  getCareerGuideHistory
};
