/**
 * CareerPulse AI - College Controller
 * Thin controller managing degree colleges querying, exam filters, college cutoffs, and matching.
 */

import * as collegeService from '../services/college.service.js';
import { successResponse, errorResponse } from '../helpers/apiResponse.js';
import asyncHandler from '../helpers/asyncHandler.js';

export const getColleges = asyncHandler(async (req, res) => {
  const { exam, district, tier, type, course, search, sort, page, limit } = req.query;

  const result = await collegeService.getColleges({
    exam,
    district,
    tier,
    type,
    course,
    search,
    sort,
    page,
    limit
  });

  return successResponse(res, 'Colleges retrieved successfully', result, 200);
});

export const getCollegeById = asyncHandler(async (req, res) => {
  const { collegeId } = req.params;
  const userId = req.user ? req.user._id : null;

  const collegeData = await collegeService.getCollegeById(collegeId, userId);

  if (!collegeData) {
    return errorResponse(res, 'College not found', 404);
  }

  return successResponse(res, 'College details retrieved successfully', collegeData, 200);
});

export const getCollegesMatch = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const matches = await collegeService.getCollegesMatch(userId);
  return successResponse(res, 'College matches calculated successfully', matches, 200);
});

export default {
  getColleges,
  getCollegeById,
  getCollegesMatch
};
