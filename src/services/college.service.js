/**
 * CareerPulse AI - College Service
 * Handles college catalog querying, exam filters (JEE/NEET/etc.), detailed college cutoffs,
 * historical trends, personalized student chance evaluation, and bucket matching.
 */

import College from '../models/College.js';
import Course from '../models/Course.js';
import CollegeCourse from '../models/CollegeCourse.js';
import CutoffRecord from '../models/CutoffRecord.js';
import { getChanceLabel, getBucketCategory } from '../helpers/chanceLabel.js';

/**
 * Filter and paginate colleges with custom exam filter rules and tier-based ranking.
 *
 * EXAM FILTER RULES:
 * - jee: Colleges offering at least one course where requiresJEE = true or cutoffType = 'JEERank'
 * - neet: Colleges offering at least one course where requiresNEET = true or cutoffType = 'NEETScore'
 * - withoutNeet: Colleges offering courses where requiresNEET = false (Engineering, Arts, Science, etc.)
 * - withoutJee: Colleges offering courses where requiresJEE = false (TNEA Engineering, Medical, Arts, etc.)
 *
 * RANKING:
 * - Tier first (Tier 1 -> Tier 2 -> Tier 3)
 * - Then total admitted students descending
 *
 * @param {Object} options
 */
export const getColleges = async ({
  exam,
  district,
  tier,
  type,
  course,
  search,
  sort = 'tier',
  page = 1,
  limit = 12
} = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 12);
  const collegeFilter = {};

  // 1. Direct filters on College model
  if (district && district.toLowerCase() !== 'all') {
    collegeFilter.district = new RegExp(`^${district}$`, 'i');
  }

  if (tier && tier.toLowerCase() !== 'all') {
    collegeFilter.tier = tier;
  }

  if (type && type.toLowerCase() !== 'all') {
    collegeFilter.type = type;
  }

  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    collegeFilter.$or = [
      { name: searchRegex },
      { district: searchRegex },
      { collegeId: searchRegex }
    ];
  }

  // 2. Resolve exam & course filters via CollegeCourse and Course models
  let allowedCollegeIds = null;

  if (course && course.trim()) {
    const matchingCourses = await CollegeCourse.find({ courseId: course.trim() }).distinct('collegeId');
    allowedCollegeIds = matchingCourses;
  }

  if (exam && exam.toLowerCase() !== 'all') {
    const examKey = exam.toLowerCase();
    let examCollegeIds = [];

    if (examKey === 'jee') {
      // Colleges having at least one course with requiresJEE = true or cutoffType = JEERank
      const jeeCourses = await Course.find({ requiresJEE: true }).distinct('courseId');
      examCollegeIds = await CollegeCourse.find({
        $or: [{ courseId: { $in: jeeCourses } }, { cutoffType: 'JEERank' }]
      }).distinct('collegeId');
    } else if (examKey === 'neet') {
      // Colleges having at least one course with requiresNEET = true or cutoffType = NEETScore
      const neetCourses = await Course.find({ requiresNEET: true }).distinct('courseId');
      examCollegeIds = await CollegeCourse.find({
        $or: [{ courseId: { $in: neetCourses } }, { cutoffType: 'NEETScore' }]
      }).distinct('collegeId');
    } else if (examKey === 'withoutneet') {
      // Colleges offering courses that do not require NEET (Engineering, Tech, Commerce, Arts)
      const nonNeetCourses = await Course.find({ requiresNEET: { $ne: true } }).distinct('courseId');
      examCollegeIds = await CollegeCourse.find({ courseId: { $in: nonNeetCourses } }).distinct('collegeId');
    } else if (examKey === 'withoutjee') {
      // Colleges offering courses that do not require JEE (State TNEA Engineering, Medical, Arts)
      const nonJeeCourses = await Course.find({ requiresJEE: { $ne: true } }).distinct('courseId');
      examCollegeIds = await CollegeCourse.find({ courseId: { $in: nonJeeCourses } }).distinct('collegeId');
    }

    if (allowedCollegeIds !== null) {
      allowedCollegeIds = allowedCollegeIds.filter((id) => examCollegeIds.includes(id));
    } else {
      allowedCollegeIds = examCollegeIds;
    }
  }

  if (allowedCollegeIds !== null) {
    collegeFilter.collegeId = { $in: allowedCollegeIds };
  }

  // 3. Compute total admissions per college to support ranking
  const admissionTotals = await CollegeCourse.aggregate([
    {
      $group: {
        _id: '$collegeId',
        totalAdmitted: { $sum: '$admitted' },
        courseCount: { $sum: 1 }
      }
    }
  ]);

  const admissionsMap = new Map();
  const courseCountMap = new Map();
  admissionTotals.forEach((item) => {
    admissionsMap.set(item._id, item.totalAdmitted || 0);
    courseCountMap.set(item._id, item.courseCount || 0);
  });

  // 4. Fetch colleges matching filter
  const allMatchingColleges = await College.find(collegeFilter).lean();

  // Tier weight map for sorting
  const tierWeight = { 'Tier 1': 1, 'Tier 2': 2, 'Tier 3': 3 };

  // Sort: Tier first (Tier 1 -> 3), then total admitted descending
  allMatchingColleges.sort((a, b) => {
    const aAdmitted = admissionsMap.get(a.collegeId) || 0;
    const bAdmitted = admissionsMap.get(b.collegeId) || 0;

    if (sort === 'admissions') {
      if (bAdmitted !== aAdmitted) return bAdmitted - aAdmitted;
      const tA = tierWeight[a.tier] || 4;
      const tB = tierWeight[b.tier] || 4;
      return tA - tB;
    }

    // Default: tier first, then total admitted descending
    const tA = tierWeight[a.tier] || 4;
    const tB = tierWeight[b.tier] || 4;
    if (tA !== tB) return tA - tB;
    if (bAdmitted !== aAdmitted) return bAdmitted - aAdmitted;
    return a.name.localeCompare(b.name);
  });

  // 5. Paginate results
  const total = allMatchingColleges.length;
  const totalPages = Math.ceil(total / limitNum) || 1;
  const startIndex = (pageNum - 1) * limitNum;
  const paginatedColleges = allMatchingColleges.slice(startIndex, startIndex + limitNum);

  const formattedColleges = paginatedColleges.map((col) => ({
    ...col,
    totalAdmitted: admissionsMap.get(col.collegeId) || 0,
    courseCount: courseCountMap.get(col.collegeId) || 0
  }));

  return {
    colleges: formattedColleges,
    pagination: {
      total,
      page: pageNum,
      totalPages,
      limit: limitNum
    }
  };
};

/**
 * Get college details with full course list, cutoffs, student chance, and multi-year trend.
 *
 * @param {string} collegeId
 * @param {string} userId - ID of logged in user to evaluate personalized chances
 */
export const getCollegeById = async (collegeId, userId = null) => {
  const college = await College.findOne({ collegeId }).lean();
  if (!college) {
    return null;
  }

  // Fetch all course offerings for this college
  const offerings = await CollegeCourse.find({ collegeId })
    .sort({ courseId: 1, academicYear: -1 })
    .lean();

  const courseIds = [...new Set(offerings.map((o) => o.courseId))];
  const coursesCatalog = await Course.find({ courseId: { $in: courseIds } }).lean();
  const catalogMap = new Map();
  coursesCatalog.forEach((c) => catalogMap.set(c.courseId, c));

  // Retrieve user cutoff record if user is authenticated
  let userCutoff = null;
  if (userId) {
    userCutoff = await CutoffRecord.findOne({ user: userId }).lean();
  }

  // Group offerings by courseId to build multi-year trend and latest cutoff
  const courseMap = new Map();

  offerings.forEach((row) => {
    if (!courseMap.has(row.courseId)) {
      courseMap.set(row.courseId, []);
    }
    courseMap.get(row.courseId).push(row);
  });

  const coursesWithCutoffs = [];

  for (const [cId, history] of courseMap.entries()) {
    const courseInfo = catalogMap.get(cId);

    // Latest year record is first due to academicYear: -1 sort
    const latest = history[0];

    // Trends sorted chronologically (e.g. 2023-2024 -> 2024-2025)
    const trends = [...history]
      .sort((a, b) => (a.academicYear > b.academicYear ? 1 : -1))
      .map((h) => ({
        academicYear: h.academicYear,
        prevCutoff: h.prevCutoff,
        admitted: h.admitted,
        intake: h.intake,
        fees: h.fees
      }));

    // Determine student value based on this course's cutoffType
    let studentValue = null;

    if (userCutoff) {
      if (latest.cutoffType === 'TNEA200') {
        studentValue = userCutoff.results?.tneaCutoff ?? null;
      } else if (latest.cutoffType === 'NEETScore') {
        studentValue = userCutoff.neet?.score ?? null;
      } else if (latest.cutoffType === 'JEERank') {
        studentValue = userCutoff.jee?.rank ?? null;
      } else if (latest.cutoffType === 'Percentage') {
        studentValue = userCutoff.results?.percentage ?? null;
      }
    }

    const chance = getChanceLabel({
      studentValue,
      prevCutoff: latest.prevCutoff,
      cutoffType: latest.cutoffType
    });

    coursesWithCutoffs.push({
      courseId: cId,
      name: courseInfo?.name || cId,
      stream: courseInfo?.stream || 'Other',
      duration: courseInfo?.duration || '4 Years',
      description: courseInfo?.description || '',
      requiresJEE: courseInfo?.requiresJEE || false,
      requiresNEET: courseInfo?.requiresNEET || false,
      cutoffType: latest.cutoffType,
      prevCutoff: latest.prevCutoff,
      intake: latest.intake,
      admitted: latest.admitted,
      fees: latest.fees,
      hostel: latest.hostel,
      academicYear: latest.academicYear,
      source: latest.source,
      lastUpdated: latest.lastUpdated,
      trends,
      studentValue,
      chanceLabel: chance.label,
      chanceVariant: chance.variant,
      diff: chance.diff
    });
  }

  // Sort courses by stream and name
  coursesWithCutoffs.sort((a, b) => a.stream.localeCompare(b.stream) || a.name.localeCompare(b.name));

  return {
    college,
    courses: coursesWithCutoffs
  };
};

/**
 * Returns bucketed Best / Stretch / Safe colleges for the authenticated student.
 * @param {string} userId
 */
export const getCollegesMatch = async (userId) => {
  const userCutoff = await CutoffRecord.findOne({ user: userId }).lean();
  if (!userCutoff) {
    return { best: [], stretch: [], safe: [] };
  }

  const latestCourses = await CollegeCourse.find({})
    .sort({ academicYear: -1 })
    .lean();

  const collegeIds = [...new Set(latestCourses.map((c) => c.collegeId))];
  const courseIds = [...new Set(latestCourses.map((c) => c.courseId))];

  const [collegesList, coursesCatalog] = await Promise.all([
    College.find({ collegeId: { $in: collegeIds } }).lean(),
    Course.find({ courseId: { $in: courseIds } }).lean()
  ]);

  const collegeMap = new Map();
  collegesList.forEach((col) => collegeMap.set(col.collegeId, col));

  const courseCatalogMap = new Map();
  coursesCatalog.forEach((c) => courseCatalogMap.set(c.courseId, c));

  const buckets = {
    best: [],
    stretch: [],
    safe: []
  };

  const seenCombinations = new Set();

  for (const item of latestCourses) {
    const key = `${item.collegeId}-${item.courseId}`;
    if (seenCombinations.has(key)) continue;
    seenCombinations.add(key);

    let studentValue = null;
    if (item.cutoffType === 'TNEA200') {
      studentValue = userCutoff.results?.tneaCutoff ?? null;
    } else if (item.cutoffType === 'NEETScore') {
      studentValue = userCutoff.neet?.score ?? null;
    } else if (item.cutoffType === 'JEERank') {
      studentValue = userCutoff.jee?.rank ?? null;
    } else if (item.cutoffType === 'Percentage') {
      studentValue = userCutoff.results?.percentage ?? null;
    }

    if (studentValue === null) continue;

    const bucket = getBucketCategory({
      studentValue,
      prevCutoff: item.prevCutoff,
      cutoffType: item.cutoffType
    });

    const chance = getChanceLabel({
      studentValue,
      prevCutoff: item.prevCutoff,
      cutoffType: item.cutoffType
    });

    const college = collegeMap.get(item.collegeId);
    const course = courseCatalogMap.get(item.courseId);

    if (college && course) {
      buckets[bucket].push({
        college,
        course,
        cutoffType: item.cutoffType,
        prevCutoff: item.prevCutoff,
        studentValue,
        chanceLabel: chance.label,
        chanceVariant: chance.variant,
        diff: chance.diff,
        academicYear: item.academicYear
      });
    }
  }

  // Limit each bucket to top 15 results
  buckets.best = buckets.best.slice(0, 15);
  buckets.stretch = buckets.stretch.slice(0, 15);
  buckets.safe = buckets.safe.slice(0, 15);

  return buckets;
};

export default {
  getColleges,
  getCollegeById,
  getCollegesMatch
};
