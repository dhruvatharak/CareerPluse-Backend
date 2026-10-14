/**
 * CareerPulse AI - Recommendation Controller
 * Thin controller managing user saved recommendations.
 */

import * as recommendationService from '../services/recommendation.service.js';
import { successResponse, errorResponse } from '../helpers/apiResponse.js';
import asyncHandler from '../helpers/asyncHandler.js';

export const getRecommendations = asyncHandler(async (req, res) => {
  const { type } = req.query;
  const recommendations = await recommendationService.getUserRecommendations(req.user._id, type);
  return successResponse(res, 'Recommendations retrieved successfully', recommendations);
});

export const getRecommendationById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const recommendation = await recommendationService.getRecommendationById(id, req.user._id);

  if (!recommendation) {
    return errorResponse(res, 'Recommendation not found', 404);
  }

  return successResponse(res, 'Recommendation retrieved', recommendation);
});

export const deleteRecommendation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deleted = await recommendationService.deleteRecommendation(id, req.user._id);

  if (!deleted) {
    return errorResponse(res, 'Recommendation not found', 404);
  }

  return successResponse(res, 'Recommendation deleted successfully', { id });
});

export default {
  getRecommendations,
  getRecommendationById,
  deleteRecommendation
};
