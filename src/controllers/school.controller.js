/**
 * CareerPulse AI - Schools Controller
 * Thin controller: delegates to school.service, returns paginated school list.
 */

import * as schoolService from '../services/school.service.js';
import { successResponse, errorResponse } from '../helpers/apiResponse.js';
import asyncHandler from '../helpers/asyncHandler.js';

export const getSchools = asyncHandler(async (req, res) => {
  const { district, search, sort, page, limit } = req.query;
  const result = await schoolService.getSchools({
    district,
    search,
    sort,
    page,
    limit
  });

  return successResponse(res, 'Schools retrieved successfully', result);
});

export const getSchoolById = asyncHandler(async (req, res) => {
  const { schoolId } = req.params;
  const school = await schoolService.getSchoolById(schoolId);

  if (!school) {
    return errorResponse(res, `School '${schoolId}' not found`, 404);
  }

  return successResponse(res, 'School details retrieved', school);
});

export default {
  getSchools,
  getSchoolById
};
