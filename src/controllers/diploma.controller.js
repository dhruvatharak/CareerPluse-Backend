/**
 * CareerPulse AI - Diploma Controller
 * Thin controller managing diploma courses, colleges, and interest recommendations.
 */

import * as diplomaService from '../services/diploma.service.js';
import { successResponse, errorResponse } from '../helpers/apiResponse.js';
import asyncHandler from '../helpers/asyncHandler.js';

export const getCourses = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const courses = await diplomaService.getAllCourses(search);
  return successResponse(res, 'Diploma courses retrieved successfully', courses);
});

export const getColleges = asyncHandler(async (req, res) => {
  const { district, course, type, search } = req.query;
  const colleges = await diplomaService.getColleges({
    district,
    course,
    type,
    search
  });

  return successResponse(res, 'Diploma colleges retrieved successfully', colleges);
});

export const recommendDiploma = asyncHandler(async (req, res) => {
  const { interests, district } = req.body;

  if (!Array.isArray(interests) || interests.length === 0) {
    return errorResponse(res, 'Please provide at least one interest tag', 400);
  }

  const result = await diplomaService.recommendDiplomaCourses({
    userId: req.user._id,
    interests,
    district
  });

  return successResponse(res, 'Diploma recommendations generated', result, 201);
});

export default {
  getCourses,
  getColleges,
  recommendDiploma
};
