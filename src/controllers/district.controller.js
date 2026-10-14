/**
 * CareerPulse AI - Districts Controller
 */

import * as districtService from '../services/district.service.js';
import { successResponse } from '../helpers/apiResponse.js';
import asyncHandler from '../helpers/asyncHandler.js';

export const getDistricts = asyncHandler(async (req, res) => {
  const districts = await districtService.getAllDistricts();
  return successResponse(res, 'Districts retrieved successfully', districts);
});

export default {
  getDistricts
};
