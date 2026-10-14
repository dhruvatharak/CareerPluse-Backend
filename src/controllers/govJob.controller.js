/**
 * CareerPulse AI - Government Jobs Controller
 */

import * as govJobService from '../services/govJob.service.js';
import { successResponse } from '../helpers/apiResponse.js';
import asyncHandler from '../helpers/asyncHandler.js';

export const getGovJobs = asyncHandler(async (req, res) => {
  const { level = '10th', search = '' } = req.query;
  const jobs = await govJobService.getGovJobs({ level, search });
  return successResponse(res, 'Government jobs retrieved successfully', jobs);
});

export default {
  getGovJobs
};
