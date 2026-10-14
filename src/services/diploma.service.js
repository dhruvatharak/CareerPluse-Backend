/**
 * CareerPulse AI - Diploma Service
 * Query logic for polytechnic diploma courses, colleges, and interest-based recommendations.
 */

import DiplomaCourse from '../models/DiplomaCourse.js';
import DiplomaCollege from '../models/DiplomaCollege.js';
import { processDiplomaRecommendations } from './recommendation.service.js';

export const getAllCourses = async (search = '') => {
  const query = {};
  if (search && search.trim()) {
    const regex = new RegExp(search.trim(), 'i');
    query.$or = [{ name: regex }, { interestTags: regex }, { careers: regex }];
  }

  return await DiplomaCourse.find(query).sort({ courseId: 1 });
};

export const getCourseById = async (courseId) => {
  return await DiplomaCourse.findOne({ courseId });
};

export const getColleges = async ({
  district = '',
  course = '',
  type = '',
  search = ''
}) => {
  const query = {};

  if (district && district.trim() && district !== 'All') {
    query.district = district.trim();
  }

  if (course && course.trim() && course !== 'All') {
    query.courses = course.trim();
  }

  if (type && type.trim() && type !== 'All') {
    query.type = type.trim();
  }

  if (search && search.trim()) {
    const regex = new RegExp(search.trim(), 'i');
    query.$or = [{ name: regex }, { district: regex }];
  }

  return await DiplomaCollege.find(query).sort({ district: 1, name: 1 });
};

export const recommendDiplomaCourses = async ({ userId, interests, district = '' }) => {
  return await processDiplomaRecommendations({
    userId,
    interests,
    district
  });
};
