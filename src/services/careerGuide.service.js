/**
 * CareerPulse AI - 12th Career Guide Service
 * Handles multi-option filtering, CutoffRecord matching, rule-based ground-truth fallback,
 * LLM AI guidance synthesis (Groq / Gemini) with zero-hallucination database overwrites, and gov jobs attachment.
 */

import Recommendation from '../models/Recommendation.js';
import CutoffRecord from '../models/CutoffRecord.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import College from '../models/College.js';
import CollegeCourse from '../models/CollegeCourse.js';
import GovJob from '../models/GovJob.js';
import { getChanceLabel, getBucketCategory } from '../helpers/chanceLabel.js';
import { callLLMWithFallback } from './llm.service.js';
import { safeParseLLMResponse } from '../helpers/jsonSafeParse.js';
import {
  SYSTEM_CAREER_GUIDE_PROMPT,
  buildCareerGuidePrompt
} from '../helpers/promptBuilder.js';
import { logger } from '../utils/logger.js';

/**
 * Validates options for contradictions and emptiness.
 * @param {Array<string>} options
 */
export const validateCareerGuideOptions = (options = []) => {
  if (!Array.isArray(options) || options.length === 0) {
    const error = new Error('Please select at least one career guide option');
    error.statusCode = 400;
    throw error;
  }

  // Contradiction checks
  if (options.includes('NEET') && options.includes('Without NEET')) {
    const error = new Error("Options contradiction: Cannot select both 'NEET' and 'Without NEET'.");
    error.statusCode = 400;
    throw error;
  }

  if (options.includes('JEE') && options.includes('Without JEE')) {
    const error = new Error("Options contradiction: Cannot select both 'JEE' and 'Without JEE'.");
    error.statusCode = 400;
    throw error;
  }
};

/**
 * Extracts allowed streams based on chosen stream option chips.
 * @param {Array<string>} options
 * @returns {Array<string>}
 */
export const getStreamsFromOptions = (options = []) => {
  const streamFilters = [];
  if (options.includes('Engineering Stream')) streamFilters.push('Engineering');
  if (options.includes('Medical Stream')) streamFilters.push('Medical');
  if (options.includes('Commerce Stream')) streamFilters.push('Commerce');
  if (options.includes('Arts & Science Stream')) {
    streamFilters.push('Arts', 'Science');
  }
  return streamFilters;
};

/**
 * Validates that preferredCourse matches selected stream options.
 * @param {string} preferredCourse
 * @param {Array<string>} options
 */
export const validatePreferredCourseForStream = async (preferredCourse, options = []) => {
  if (!preferredCourse || !preferredCourse.trim()) return;

  const courseId = preferredCourse.trim();
  const selectedStreams = getStreamsFromOptions(options);
  if (selectedStreams.length === 0) return; // If no stream chip is selected, allow all

  const course = await Course.findOne({ courseId }).lean();
  if (!course) {
    const error = new Error(`Preferred course '${courseId}' was not found.`);
    error.statusCode = 400;
    throw error;
  }

  if (!selectedStreams.includes(course.stream)) {
    const error = new Error(
      `Selected course '${course.name}' (${course.stream}) does not match the chosen stream (${selectedStreams.join(', ')}).`
    );
    error.statusCode = 400;
    throw error;
  }
};

/**
 * Helper to evaluate candidate offerings against student cutoff record.
 * @param {Array} offerings
 * @param {Object} userCutoff
 * @param {Map} collegeMap
 * @param {Map} courseMap
 * @param {boolean} isOtherDistrict
 * @returns {Array}
 */
export const evaluateOfferingRows = (
  offerings = [],
  userCutoff,
  collegeMap,
  courseMap,
  isOtherDistrict = false
) => {
  const tierWeights = { 'Tier 1': 1, 'Tier 2': 2, 'Tier 3': 3 };
  const evaluated = [];
  const seenCompositeIds = new Set();

  for (const offering of offerings) {
    const col = collegeMap.get(offering.collegeId);
    const crs = courseMap.get(offering.courseId);
    if (!col || !crs) continue;

    let studentValue = null;
    let typeMatched = false;

    if (offering.cutoffType === 'TNEA200') {
      studentValue = userCutoff.results?.tneaCutoff ?? null;
      typeMatched = studentValue !== null;
    } else if (offering.cutoffType === 'NEETScore') {
      studentValue = userCutoff.neet?.score ?? null;
      typeMatched = studentValue !== null;
    } else if (offering.cutoffType === 'JEERank') {
      studentValue = userCutoff.jee?.rank ?? null;
      typeMatched = studentValue !== null;
    } else if (offering.cutoffType === 'Percentage') {
      studentValue = userCutoff.results?.percentage ?? userCutoff.twelfthPercentage ?? null;
      typeMatched = studentValue !== null;
    }

    if (!typeMatched || studentValue === null) continue;

    const compositeId = `${offering.collegeId}__${offering.courseId}`;
    if (seenCompositeIds.has(compositeId)) continue; // keep latest year
    seenCompositeIds.add(compositeId);

    const chance = getChanceLabel({
      studentValue,
      prevCutoff: offering.prevCutoff,
      cutoffType: offering.cutoffType
    });

    const bucket = getBucketCategory({
      studentValue,
      prevCutoff: offering.prevCutoff,
      cutoffType: offering.cutoffType
    });

    evaluated.push({
      id: compositeId,
      collegeId: offering.collegeId,
      courseId: offering.courseId,
      collegeName: col.name,
      courseName: crs.name,
      stream: crs.stream,
      tier: col.tier,
      tierWeight: tierWeights[col.tier] || 4,
      district: col.district || '',
      cutoffType: offering.cutoffType,
      prevCutoff: offering.prevCutoff,
      academicYear: offering.academicYear,
      intake: offering.intake,
      admitted: offering.admitted,
      fees: offering.fees,
      studentValue,
      diff: chance.diff,
      chanceLabel: chance.label,
      chanceVariant: chance.variant,
      bucket,
      isOtherDistrict
    });
  }

  return evaluated;
};

/**
 * Generates grounded 12th Career Guide recommendations.
 */
export const generateCareerGuide = async ({
  userId,
  options = [],
  district = '',
  preferredCourse = ''
}) => {
  // 1. Validate options and preferredCourse against selected stream(s)
  validateCareerGuideOptions(options);
  await validatePreferredCourseForStream(preferredCourse, options);

  // 2. Load student profile and CutoffRecord
  const [user, userCutoff] = await Promise.all([
    User.findById(userId).select('district category'),
    CutoffRecord.findOne({ user: userId })
  ]);

  if (!userCutoff) {
    const error = new Error('Please add your marks first');
    error.statusCode = 400;
    throw error;
  }

  const category = user?.category || 'OC';
  const homeDistrict = district && district !== 'All' ? district : user?.district || '';

  // 3. Build candidate Course query based on options
  const courseFilter = {};
  const streamFilters = getStreamsFromOptions(options);

  if (streamFilters.length > 0) {
    courseFilter.stream = { $in: streamFilters };
  } else if (userCutoff.stream) {
    courseFilter.stream = new RegExp(`^${userCutoff.stream}$`, 'i');
  }

  if (options.includes('NEET')) courseFilter.requiresNEET = true;
  if (options.includes('Without NEET')) courseFilter.requiresNEET = false;
  if (options.includes('Without JEE')) courseFilter.requiresJEE = false;

  if (preferredCourse && preferredCourse.trim()) {
    courseFilter.courseId = preferredCourse.trim();
  }

  const matchingCourses = await Course.find(courseFilter).lean();
  const allowedCourseIds = matchingCourses.map((c) => c.courseId);

  // 4. Build CollegeCourse candidate filter
  const collegeCourseFilter = {};
  if (allowedCourseIds.length > 0) {
    collegeCourseFilter.courseId = { $in: allowedCourseIds };
  }

  if (options.includes('JEE')) {
    collegeCourseFilter.$or = [
      { courseId: { $in: allowedCourseIds } },
      { cutoffType: 'JEERank' }
    ];
  }

  const collegeMap = new Map();
  const courseMap = new Map();

  const hydrateMetadata = async (offerings) => {
    const cIds = [...new Set(offerings.map((o) => o.courseId))].filter((id) => !courseMap.has(id));
    const colIds = [...new Set(offerings.map((o) => o.collegeId))].filter((id) => !collegeMap.has(id));

    const [cols, crss] = await Promise.all([
      colIds.length > 0 ? College.find({ collegeId: { $in: colIds } }).lean() : [],
      cIds.length > 0 ? Course.find({ courseId: { $in: cIds } }).lean() : []
    ]);

    cols.forEach((col) => collegeMap.set(col.collegeId, col));
    crss.forEach((crs) => courseMap.set(crs.courseId, crs));
  };

  const hasDistrictFilter = Boolean(district && district !== 'All');
  let localEvaluatedRows = [];
  let otherDistrictEvaluatedRows = [];
  let districtNote = null;

  if (hasDistrictFilter) {
    const localColleges = await College.find({ district: new RegExp(`^${district}$`, 'i') }).lean();
    const localCollegeIds = localColleges.map((c) => c.collegeId);
    localColleges.forEach((col) => collegeMap.set(col.collegeId, col));

    let localOfferings = [];
    if (localCollegeIds.length > 0) {
      localOfferings = await CollegeCourse.find({
        ...collegeCourseFilter,
        collegeId: { $in: localCollegeIds }
      })
        .sort({ academicYear: -1, prevCutoff: -1 })
        .lean();
      await hydrateMetadata(localOfferings);
    }

    localEvaluatedRows = evaluateOfferingRows(localOfferings, userCutoff, collegeMap, courseMap, false);

    const localBest = localEvaluatedRows.filter((r) => r.bucket === 'best');
    const localSafe = localEvaluatedRows.filter((r) => r.bucket === 'safe');

    // Trigger district fallback when selected district gives no "safe" or no "best" results
    if (localBest.length === 0 || localSafe.length === 0) {
      const otherOfferings = await CollegeCourse.find({
        ...collegeCourseFilter,
        collegeId: { $nin: localCollegeIds }
      })
        .sort({ academicYear: -1, prevCutoff: -1 })
        .lean();

      await hydrateMetadata(otherOfferings);
      otherDistrictEvaluatedRows = evaluateOfferingRows(otherOfferings, userCutoff, collegeMap, courseMap, true);

      const otherBest = otherDistrictEvaluatedRows.filter((r) => r.bucket === 'best');
      const otherSafe = otherDistrictEvaluatedRows.filter((r) => r.bucket === 'safe');

      if (
        (localBest.length === 0 && otherBest.length > 0) ||
        (localSafe.length === 0 && otherSafe.length > 0) ||
        (localEvaluatedRows.length === 0 && otherDistrictEvaluatedRows.length > 0)
      ) {
        districtNote = `Not enough matches in ${district}, so we also searched other districts.`;
      }
    }
  } else {
    const allOfferings = await CollegeCourse.find(collegeCourseFilter)
      .sort({ academicYear: -1, prevCutoff: -1 })
      .lean();
    await hydrateMetadata(allOfferings);
    localEvaluatedRows = evaluateOfferingRows(allOfferings, userCutoff, collegeMap, courseMap, false);
  }

  const allInitialEvaluated = [...localEvaluatedRows, ...otherDistrictEvaluatedRows];
  if (allInitialEvaluated.length === 0) {
    const error = new Error('No college courses match your selected options and marks');
    error.statusCode = 400;
    throw error;
  }

  // 5. Low-cutoff case check
  // If the student's value is below the previous cutoff of every candidate (everything is Stretch/Low),
  // keep showing them honestly, but also retrieve closest lower-cutoff alternatives from the whole dataset.
  const allInitialBest = allInitialEvaluated.filter((r) => r.bucket === 'best');
  const allInitialSafe = allInitialEvaluated.filter((r) => r.bucket === 'safe');
  const allInitialStretch = allInitialEvaluated.filter((r) => r.bucket === 'stretch');

  let isLowCutoffCase = false;
  let lowCutoffMessage = null;
  let lowCutoffAlternatives = [];

  if (allInitialBest.length === 0 && allInitialSafe.length === 0 && allInitialStretch.length > 0) {
    isLowCutoffCase = true;
    lowCutoffMessage =
      'Your marks are below previous closing cutoffs for the selected options. We have preserved your aspirational choices and included the closest lower-cutoff alternatives from across Tamil Nadu as backup options. Consider exploring related courses or subsequent counselling rounds.';

    // Query closest lower-cutoff alternatives from whole dataset for same stream and options
    const altCourseFilter = {};
    if (streamFilters.length > 0) {
      altCourseFilter.stream = { $in: streamFilters };
    } else if (userCutoff.stream) {
      altCourseFilter.stream = new RegExp(`^${userCutoff.stream}$`, 'i');
    }
    if (options.includes('NEET')) altCourseFilter.requiresNEET = true;
    if (options.includes('Without NEET')) altCourseFilter.requiresNEET = false;
    if (options.includes('Without JEE')) altCourseFilter.requiresJEE = false;

    const altCourses = await Course.find(altCourseFilter).lean();
    const altCourseIds = altCourses.map((c) => c.courseId);

    const wholeOfferings = await CollegeCourse.find({ courseId: { $in: altCourseIds } })
      .sort({ academicYear: -1 })
      .lean();
    await hydrateMetadata(wholeOfferings);

    const wholeEvaluated = evaluateOfferingRows(wholeOfferings, userCutoff, collegeMap, courseMap, false);

    // Sort alternatives by easiest/closest cutoff (highest diff, closest to student value)
    const sortedAlternatives = [...wholeEvaluated].sort((a, b) => b.diff - a.diff);

    lowCutoffAlternatives = sortedAlternatives.slice(0, 3).map((item, idx) => ({
      ...item,
      bucket: 'safe',
      category: 'safe',
      matchScore: 88 - idx * 3,
      isOtherDistrict:
        hasDistrictFilter && item.district?.toLowerCase() !== district.toLowerCase(),
      reason: `Alternative option in ${item.district || 'Tamil Nadu'} with lower cutoff trend (${item.prevCutoff}) to explore`
    }));

    if (hasDistrictFilter && lowCutoffAlternatives.some((alt) => alt.isOtherDistrict)) {
      districtNote = districtNote || `Not enough matches in ${district}, so we also searched other districts.`;
    }
  }

  // 6. Partition into Buckets & Build Deterministic Rule-Based Result (Fallback)
  const tierSort = (a, b) => a.tierWeight - b.tierWeight || Math.abs(a.diff) - Math.abs(b.diff);

  const localBest = localEvaluatedRows.filter((r) => r.bucket === 'best').sort(tierSort);
  const localSafe = localEvaluatedRows.filter((r) => r.bucket === 'safe').sort(tierSort);

  const safeAltIds = new Set(lowCutoffAlternatives.map((a) => a.id));
  const filteredLocalStretch = isLowCutoffCase
    ? localEvaluatedRows.filter((r) => r.bucket === 'stretch' && !safeAltIds.has(r.id)).sort(tierSort)
    : localEvaluatedRows.filter((r) => r.bucket === 'stretch').sort(tierSort);

  const otherBest = otherDistrictEvaluatedRows.filter((r) => r.bucket === 'best').sort(tierSort);
  const otherSafe = otherDistrictEvaluatedRows.filter((r) => r.bucket === 'safe').sort(tierSort);
  const filteredOtherStretch = isLowCutoffCase
    ? otherDistrictEvaluatedRows.filter((r) => r.bucket === 'stretch' && !safeAltIds.has(r.id)).sort(tierSort)
    : otherDistrictEvaluatedRows.filter((r) => r.bucket === 'stretch').sort(tierSort);

  const localSelection = [
    ...localBest.slice(0, 3).map((r, i) => ({ ...r, matchScore: 95 - i * 3 })),
    ...filteredLocalStretch.slice(0, 3).map((r, i) => ({ ...r, matchScore: 80 - i * 4 })),
    ...localSafe.slice(0, 3).map((r, i) => ({ ...r, matchScore: 88 - i * 3 }))
  ];

  const otherSelection = [];
  if (hasDistrictFilter) {
    if (localBest.length === 0 && otherBest.length > 0) {
      otherSelection.push(...otherBest.slice(0, 3).map((r, i) => ({ ...r, matchScore: 92 - i * 3 })));
    }
    if (localSafe.length === 0 && otherSafe.length > 0) {
      otherSelection.push(...otherSafe.slice(0, 3).map((r, i) => ({ ...r, matchScore: 86 - i * 3 })));
    }
    if (localSelection.length === 0) {
      otherSelection.push(...filteredOtherStretch.slice(0, 2).map((r, i) => ({ ...r, matchScore: 78 - i * 4 })));
    }
  }

  if (isLowCutoffCase && lowCutoffAlternatives.length > 0) {
    lowCutoffAlternatives.forEach((alt) => {
      if (
        !localSelection.some((s) => s.id === alt.id) &&
        !otherSelection.some((s) => s.id === alt.id)
      ) {
        if (alt.isOtherDistrict) {
          otherSelection.push(alt);
        } else {
          localSelection.push(alt);
        }
      }
    });
  }

  // Combined rule-based selection: local first, then other district
  const ruleBasedSelection = [...localSelection, ...otherSelection];

  if (ruleBasedSelection.length === 0) {
    allInitialEvaluated.slice(0, 6).forEach((r) => {
      if (!ruleBasedSelection.some((s) => s.id === r.id)) {
        ruleBasedSelection.push({ ...r, matchScore: 82 });
      }
    });
  }

  // Candidate lookup map for zero-hallucination database overwrites
  const candidateLookupMap = new Map();
  [...allInitialEvaluated, ...lowCutoffAlternatives].forEach((r) => {
    candidateLookupMap.set(r.id, r);
  });

  const formatRecommendationItem = (item) => ({
    id: item.id,
    name: `${item.collegeName} - ${item.courseName}`,
    category: item.bucket || item.category || 'best',
    reason:
      item.reason ||
      `Previous cutoff ${item.prevCutoff} vs your ${item.studentValue} (${item.cutoffType}) – academic year ${item.academicYear}`,
    matchScore: item.matchScore || 85,
    type: 'college',
    collegeId: item.collegeId,
    courseId: item.courseId,
    prevCutoff: item.prevCutoff,
    cutoffType: item.cutoffType,
    academicYear: item.academicYear,
    chanceLabel: item.chanceLabel,
    chanceVariant: item.chanceVariant,
    district: item.district || '',
    isOtherDistrict: Boolean(item.isOtherDistrict)
  });

  const ruleBasedResults = ruleBasedSelection.map(formatRecommendationItem);
  const totalAnalyzed = allInitialEvaluated.length;
  const ruleBasedSummary = `Analyzed ${totalAnalyzed} admission offerings across Tamil Nadu for your ${userCutoff.stream || '12th'} credentials. Identified high-affinity degree programs aligned with your cutoff performance.`;

  // 7. Invoke LLM AI (Groq -> Gemini) with top ~12 grounded rows
  let finalResults = ruleBasedResults;
  let finalSummary = ruleBasedSummary;
  let generatedBy = 'fallback';
  let fallbackReason = null;

  const top12Candidates = ruleBasedSelection.slice(0, 12);
  const allowedIds = top12Candidates.map((c) => c.id);
  const primaryRow = ruleBasedSelection[0] || allInitialEvaluated[0];

  try {
    const userPrompt = buildCareerGuidePrompt({
      studentValue: primaryRow.studentValue,
      cutoffType: primaryRow.cutoffType,
      stream: userCutoff.stream || '12th Standard',
      category,
      district: homeDistrict,
      selectedOptions: options,
      candidateRows: top12Candidates
    });

    const llmRes = await callLLMWithFallback({
      systemPrompt: SYSTEM_CAREER_GUIDE_PROMPT,
      userPrompt,
      allowedIds,
      maxItems: 8
    });

    if (llmRes.success && llmRes.data?.recommendations?.length > 0) {
      // Overwrite prevCutoff, intake, district strictly from DATABASE row (Zero Hallucination)
      finalResults = llmRes.data.recommendations.map((rec) => {
        const dbRow = candidateLookupMap.get(rec.id);
        return {
          id: rec.id,
          name: dbRow ? `${dbRow.collegeName} - ${dbRow.courseName}` : rec.name,
          category: rec.category,
          reason: rec.reason,
          matchScore: rec.matchScore,
          type: 'college',
          collegeId: dbRow?.collegeId || '',
          courseId: dbRow?.courseId || '',
          prevCutoff: dbRow?.prevCutoff ?? null,
          cutoffType: dbRow?.cutoffType || '',
          academicYear: dbRow?.academicYear || '',
          chanceLabel: dbRow?.chanceLabel || '',
          chanceVariant: dbRow?.chanceVariant || 'slate',
          district: dbRow?.district || '',
          isOtherDistrict: Boolean(dbRow?.isOtherDistrict)
        };
      });

      // Ensure other-district fallback items are included if fallback was triggered
      if (otherSelection.length > 0 && !finalResults.some((r) => r.isOtherDistrict)) {
        finalResults.push(...otherSelection.map(formatRecommendationItem));
      }

      // Ensure safe alternatives are included if low-cutoff case occurred
      if (isLowCutoffCase) {
        lowCutoffAlternatives.forEach((alt) => {
          const existing = finalResults.find((r) => r.id === alt.id);
          if (existing) {
            existing.category = 'safe';
            existing.reason = alt.reason;
          } else if (!finalResults.some((r) => r.category === 'safe')) {
            finalResults.push(formatRecommendationItem(alt));
          }
        });
      }

      // Keep selected district's results first
      finalResults.sort((a, b) => {
        if (a.isOtherDistrict === b.isOtherDistrict) return 0;
        return a.isOtherDistrict ? 1 : -1;
      });

      finalSummary = llmRes.data.summary || ruleBasedSummary;
      generatedBy = llmRes.generatedBy;
      fallbackReason = llmRes.fallbackReason;
    } else {
      generatedBy = 'fallback';
      fallbackReason = llmRes.fallbackReason;
    }
  } catch (err) {
    logger.warn('[CareerGuide] LLM synthesis failed, using rule-based fallback:', err.message);
    finalResults = ruleBasedResults;
    finalSummary = ruleBasedSummary;
    generatedBy = 'fallback';
    fallbackReason = err.fallbackReason || 'NETWORK';
  }

  // Strictly enforce selected district's results first in finalResults
  finalResults.sort((a, b) => {
    if (a.isOtherDistrict === b.isOtherDistrict) return 0;
    return a.isOtherDistrict ? 1 : -1;
  });

  // 8. Save Recommendation record
  const savedRecommendation = await Recommendation.create({
    user: userId,
    type: 'career-12th',
    input: {
      options,
      stream: userCutoff.stream,
      studentValue: primaryRow?.studentValue ?? null,
      cutoffType: primaryRow?.cutoffType ?? '',
      district: homeDistrict,
      preferredCourse: preferredCourse || null
    },
    results: finalResults,
    summary: finalSummary,
    districtNote,
    lowCutoffMessage,
    generatedBy,
    fallbackReason
  });

  // 9. Fetch Government jobs for 12th & Degree qualifications
  const govJobsList = await GovJob.find({
    qualificationLevel: { $in: ['12th', 'Degree'] }
  })
    .limit(6)
    .lean();

  const govJobsWithNote = govJobsList.map((job) => ({
    ...job,
    note: 'Verify all criteria on the official notification before applying.'
  }));

  return {
    recommendation: savedRecommendation,
    govJobs: govJobsWithNote
  };
};

/**
 * Get user's 12th career guide history.
 */
export const getCareerGuideHistory = async (userId) => {
  return await Recommendation.find({ user: userId, type: 'career-12th' })
    .sort({ createdAt: -1 })
    .lean();
};

export default {
  validateCareerGuideOptions,
  getStreamsFromOptions,
  validatePreferredCourseForStream,
  evaluateOfferingRows,
  generateCareerGuide,
  getCareerGuideHistory
};
