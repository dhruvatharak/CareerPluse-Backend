/**
 * CareerPulse AI - Cutoff Controller
 * Thin controller managing cutoff calculations and retrieval of the logged-in student's marks.
 */

import * as cutoffService from '../services/cutoff.service.js';
import { successResponse, errorResponse } from '../helpers/apiResponse.js';
import asyncHandler from '../helpers/asyncHandler.js';

export const calculateCutoff = asyncHandler(async (req, res) => {
  const { stream, twelfthMarks, twelfthTotal, jee, neet } = req.body;

  // Validate marks ranges (0 to 100 per subject)
  if (twelfthMarks && typeof twelfthMarks === 'object') {
    for (const [subj, val] of Object.entries(twelfthMarks)) {
      if (val !== null && val !== undefined && val !== '') {
        const num = Number(val);
        if (isNaN(num) || num < 0 || num > 100) {
          return errorResponse(res, `Subject ${subj} mark must be between 0 and 100`, 400);
        }
      }
    }
  }

  // Validate NEET score if provided (0 to 720)
  if (neet && neet.score !== undefined && neet.score !== null && neet.score !== '') {
    const neetScore = Number(neet.score);
    if (isNaN(neetScore) || neetScore < 0 || neetScore > 720) {
      return errorResponse(res, 'NEET score must be between 0 and 720', 400);
    }
  }

  // Validate JEE score/percentile if provided
  if (jee && jee.percentile !== undefined && jee.percentile !== null && jee.percentile !== '') {
    const p = Number(jee.percentile);
    if (isNaN(p) || p < 0 || p > 100) {
      return errorResponse(res, 'JEE percentile must be between 0 and 100', 400);
    }
  }

  const savedRecord = await cutoffService.saveAndCalculateCutoff({
    userId: req.user._id,
    stream,
    twelfthMarks,
    twelfthTotal,
    jee,
    neet
  });

  return successResponse(res, 'Cutoff calculated and saved successfully', savedRecord, 200);
});

export const getMyCutoff = asyncHandler(async (req, res) => {
  const record = await cutoffService.getUserCutoff(req.user._id);
  return successResponse(res, 'Cutoff record retrieved', record, 200);
});

export default {
  calculateCutoff,
  getMyCutoff
};
