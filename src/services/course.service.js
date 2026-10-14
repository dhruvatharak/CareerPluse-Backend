/**
 * CareerPulse AI - Course Service
 * Provides degree courses catalog, admission ranking, and detailed offering colleges.
 */

import Course from '../models/Course.js';
import College from '../models/College.js';
import CollegeCourse from '../models/CollegeCourse.js';

/**
 * Get top degree courses ranked by total admitted students in the latest academic year.
 * @param {Object} options
 * @param {string} options.stream - Optional stream filter ('Engineering', 'Medical', etc.)
 * @param {number} options.limit - Max courses to return
 */
export const getTopCourses = async ({ stream, limit = 10 } = {}) => {
  const numericLimit = Math.max(1, parseInt(limit, 10) || 10);

  // 1. Determine latest academic year in college_courses dataset
  const latestYearRow = await CollegeCourse.findOne({})
    .sort({ academicYear: -1 })
    .select('academicYear')
    .lean();

  const academicYear = latestYearRow?.academicYear || '2024-2025';

  // 2. Aggregate admissions for the latest academic year
  const matchCondition = { academicYear };

  const pipeline = [
    { $match: matchCondition },
    {
      $group: {
        _id: '$courseId',
        totalAdmitted: { $sum: '$admitted' },
        totalIntake: { $sum: '$intake' },
        collegeCount: { $sum: 1 },
        academicYear: { $first: '$academicYear' }
      }
    },
    {
      $lookup: {
        from: 'courses',
        localField: '_id',
        foreignField: 'courseId',
        as: 'courseDetails'
      }
    },
    { $unwind: '$courseDetails' }
  ];

  if (stream && stream.toLowerCase() !== 'all') {
    pipeline.push({
      $match: { 'courseDetails.stream': new RegExp(`^${stream}$`, 'i') }
    });
  }

  pipeline.push(
    { $sort: { totalAdmitted: -1, 'courseDetails.name': 1 } },
    { $limit: numericLimit },
    {
      $project: {
        _id: '$courseDetails._id',
        courseId: '$_id',
        name: '$courseDetails.name',
        stream: '$courseDetails.stream',
        duration: '$courseDetails.duration',
        requiresJEE: '$courseDetails.requiresJEE',
        requiresNEET: '$courseDetails.requiresNEET',
        description: '$courseDetails.description',
        whatYouStudy: '$courseDetails.whatYouStudy',
        careers: '$courseDetails.careers',
        govtCareers: '$courseDetails.govtCareers',
        higherStudies: '$courseDetails.higherStudies',
        isSample: '$courseDetails.isSample',
        totalAdmitted: 1,
        totalIntake: 1,
        collegeCount: 1,
        academicYear: 1
      }
    }
  );

  const aggregatedCourses = await CollegeCourse.aggregate(pipeline);

  // If aggregated records exist, return them
  if (aggregatedCourses && aggregatedCourses.length > 0) {
    return aggregatedCourses;
  }

  // Fallback if no admissions data exists yet
  const fallbackQuery = {};
  if (stream && stream.toLowerCase() !== 'all') {
    fallbackQuery.stream = new RegExp(`^${stream}$`, 'i');
  }

  const fallbackCourses = await Course.find(fallbackQuery)
    .limit(numericLimit)
    .lean();

  return fallbackCourses.map((c) => ({
    ...c,
    totalAdmitted: 0,
    totalIntake: 0,
    collegeCount: 0,
    academicYear
  }));
};

/**
 * List degree courses with optional stream filtering and search.
 * @param {Object} options
 * @param {string} options.stream
 * @param {string} options.search
 */
export const getCourses = async ({ stream, search } = {}) => {
  const query = {};

  if (stream && stream.toLowerCase() !== 'all') {
    query.stream = new RegExp(`^${stream}$`, 'i');
  }

  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [
      { name: searchRegex },
      { courseId: searchRegex },
      { description: searchRegex }
    ];
  }

  return await Course.find(query).sort({ stream: 1, name: 1 }).lean();
};

/**
 * Get detailed course information with colleges offering it.
 * @param {string} courseId
 */
export const getCourseById = async (courseId) => {
  const course = await Course.findOne({ courseId }).lean();
  if (!course) {
    return null;
  }

  // Find offerings for this course across colleges
  const offerings = await CollegeCourse.find({ courseId })
    .sort({ academicYear: -1, prevCutoff: -1 })
    .lean();

  const collegeIds = [...new Set(offerings.map((o) => o.collegeId))];
  const collegesList = await College.find({ collegeId: { $in: collegeIds } }).lean();

  const collegeMap = new Map();
  collegesList.forEach((col) => collegeMap.set(col.collegeId, col));

  // Attach college info and latest cutoff stats
  const offeringsWithCollege = offerings.map((offering) => ({
    ...offering,
    college: collegeMap.get(offering.collegeId) || null
  }));

  return {
    course,
    offerings: offeringsWithCollege,
    colleges: collegesList
  };
};

export default {
  getTopCourses,
  getCourses,
  getCourseById
};
