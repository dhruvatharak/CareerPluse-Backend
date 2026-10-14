/**
 * CareerPulse AI - 12th Marks & Cutoff Calculator
 * Pure unit-testable functions for TNEA engineering cutoffs, subject averages,
 * NEET score band evaluations, and stream eligibility rules.
 */

import { STREAM_SUBJECTS } from '../shared/cutoffConstants.js';

/**
 * Calculates 12th standard percentage.
 *
 * @param {Object} params
 * @param {Object} params.marks - Subject marks object
 * @param {number} [params.total] - Optional explicit total obtained
 * @param {number} [params.maxPerSubject=100] - Max marks per subject
 * @returns {Object} { total: number, percentage: number }
 */
export const calculateTwelfthPercentage = ({ marks = {}, total = null, maxPerSubject = 100 }) => {
  const numericMarks = [];

  Object.values(marks).forEach((val) => {
    if (val !== null && val !== undefined && val !== '' && !isNaN(val)) {
      numericMarks.push(Number(val));
    }
  });

  if (numericMarks.length === 0 && (!total || isNaN(total))) {
    return { total: 0, percentage: 0 };
  }

  let finalTotal = total !== null && total !== undefined && !isNaN(total) && Number(total) > 0
    ? Number(total)
    : numericMarks.reduce((sum, m) => sum + m, 0);

  const subjectCount = numericMarks.length > 0 ? numericMarks.length : 5;
  const maxMarks = subjectCount * maxPerSubject;
  const percentage = maxMarks > 0 ? Number(((finalTotal / maxMarks) * 100).toFixed(2)) : 0;

  return {
    total: Number(finalTotal.toFixed(2)),
    percentage: Math.min(100, Math.max(0, percentage))
  };
};

/**
 * Calculates TNEA Engineering Cutoff strictly following the official formula:
 * TNEA Cutoff = Maths / 2 + Physics / 4 + Chemistry / 4
 *
 * @param {Object} params
 * @param {number|null} params.maths
 * @param {number|null} params.physics
 * @param {number|null} params.chemistry
 * @returns {number|null} TNEA Cutoff rounded to 2 decimals, or null if any subject is missing
 */
export const calculateTneaCutoff = ({ maths, physics, chemistry }) => {
  if (
    maths === null || maths === undefined || maths === '' || isNaN(maths) ||
    physics === null || physics === undefined || physics === '' || isNaN(physics) ||
    chemistry === null || chemistry === undefined || chemistry === '' || isNaN(chemistry)
  ) {
    return null;
  }

  const m = Number(maths);
  const p = Number(physics);
  const c = Number(chemistry);

  const cutoff = (m / 2) + (p / 4) + (c / 4);
  return Number(cutoff.toFixed(2));
};

/**
 * Calculates stream-relevant subject average.
 *
 * @param {Object} params
 * @param {string} params.stream - 'Engineering' | 'Medical' | 'Commerce' | etc.
 * @param {Object} params.marks - Subject marks
 * @returns {number|null}
 */
export const calculateRelevantSubjectAverage = ({ stream = 'Engineering', marks = {} }) => {
  const relevantKeys = STREAM_SUBJECTS[stream] || [];
  const relevantValues = [];

  if (relevantKeys.length > 0) {
    relevantKeys.forEach((key) => {
      const val = marks[key];
      if (val !== null && val !== undefined && val !== '' && !isNaN(val)) {
        relevantValues.push(Number(val));
      }
    });
  }

  // Fallback to all entered marks if stream keys yielded no marks
  if (relevantValues.length === 0) {
    Object.values(marks).forEach((val) => {
      if (val !== null && val !== undefined && val !== '' && !isNaN(val)) {
        relevantValues.push(Number(val));
      }
    });
  }

  if (relevantValues.length === 0) return null;

  const sum = relevantValues.reduce((acc, curr) => acc + curr, 0);
  return Number((sum / relevantValues.length).toFixed(2));
};

/**
 * Evaluates student NEET score against historical DME category ranges.
 *
 * @param {Object} params
 * @param {number|null} params.neetScore - Student NEET score (0-720)
 * @param {string} params.category - Student reservation category ('OC', 'BC', etc.)
 * @param {Array} params.medicalCutoffs - List of MedicalCutoff records
 * @returns {string|null} 'above' | 'within' | 'below' or null
 */
export const evaluateNeetBand = ({ neetScore, category = 'OC', medicalCutoffs = [] }) => {
  if (neetScore === null || neetScore === undefined || isNaN(neetScore)) {
    return null;
  }

  const score = Number(neetScore);
  const cat = category || 'OC';

  // Find MBBS reference range for this category
  const ref = medicalCutoffs.find((m) => m.category === cat && m.courseId === 'CRS-MED-01')
    || medicalCutoffs.find((m) => m.category === 'OC' && m.courseId === 'CRS-MED-01');

  if (!ref) {
    if (score >= 600) return 'above';
    if (score >= 450) return 'within';
    return 'below';
  }

  if (score > ref.maxNeetScore) return 'above';
  if (score >= ref.minNeetScore && score <= ref.maxNeetScore) return 'within';
  return 'below';
};

/**
 * Determines eligible course IDs based on subject marks, exam scores, and stream prerequisites.
 *
 * @param {Object} params
 * @param {string} params.stream
 * @param {Object} params.marks
 * @param {Object} [params.neet]
 * @param {Object} [params.jee]
 * @param {Array} params.allCourses
 * @returns {Array<string>} List of eligible courseIds
 */
export const determineEligibleCourses = ({
  stream,
  marks = {},
  neet = null,
  jee = null,
  allCourses = []
}) => {
  const hasMaths = marks.maths !== null && marks.maths !== undefined && !isNaN(marks.maths) && Number(marks.maths) >= 35;
  const hasPhysics = marks.physics !== null && marks.physics !== undefined && !isNaN(marks.physics) && Number(marks.physics) >= 35;
  const hasChemistry = marks.chemistry !== null && marks.chemistry !== undefined && !isNaN(marks.chemistry) && Number(marks.chemistry) >= 35;
  const hasBiology = marks.biology !== null && marks.biology !== undefined && !isNaN(marks.biology) && Number(marks.biology) >= 35;

  const hasNeetScore = neet && neet.score && Number(neet.score) > 0;
  const hasJeeScore = jee && (jee.score > 0 || jee.percentile > 0 || jee.rank > 0);

  const eligibleIds = [];

  allCourses.forEach((c) => {
    // 1. Engineering
    if (c.stream === 'Engineering') {
      if (hasMaths && hasPhysics && hasChemistry) {
        if (c.requiresJEE) {
          if (hasJeeScore) eligibleIds.push(c.courseId);
        } else {
          eligibleIds.push(c.courseId);
        }
      }
    }
    // 2. Medical / Dental
    else if (c.stream === 'Medical') {
      if (hasPhysics && hasChemistry && hasBiology) {
        if (c.requiresNEET) {
          if (hasNeetScore) eligibleIds.push(c.courseId);
        } else {
          eligibleIds.push(c.courseId);
        }
      } else if (hasBiology || hasChemistry) {
        // Allied medical or pharmacy without strict PCB
        if (!c.requiresNEET) eligibleIds.push(c.courseId);
      }
    }
    // 3. Commerce
    else if (c.stream === 'Commerce') {
      eligibleIds.push(c.courseId);
    }
    // 4. Arts, Science, Law
    else {
      eligibleIds.push(c.courseId);
    }
  });

  return eligibleIds;
};

export default {
  calculateTwelfthPercentage,
  calculateTneaCutoff,
  calculateRelevantSubjectAverage,
  evaluateNeetBand,
  determineEligibleCourses
};
