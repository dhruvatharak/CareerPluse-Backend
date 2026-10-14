/**
 * CareerPulse AI - Course Controller
 * Thin controller managing degree courses catalog and top admissions queries.
 */

import * as courseService from '../services/course.service.js';
import { successResponse, errorResponse } from '../helpers/apiResponse.js';
import asyncHandler from '../helpers/asyncHandler.js';

export const getTopCourses = asyncHandler(async (req, res) => {
  const { stream, limit } = req.query;
  const courses = await courseService.getTopCourses({ stream, limit });
  return successResponse(res, 'Top courses retrieved successfully', courses, 200);
});

export const getCourses = asyncHandler(async (req, res) => {
  const { stream, search } = req.query;
  const courses = await courseService.getCourses({ stream, search });
  return successResponse(res, 'Courses retrieved successfully', courses, 200);
});

export const getCourseById = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const courseData = await courseService.getCourseById(courseId);

  if (!courseData) {
    return errorResponse(res, 'Course not found', 404);
  }

  return successResponse(res, 'Course details retrieved successfully', courseData, 200);
});

export default {
  getTopCourses,
  getCourses,
  getCourseById
};
