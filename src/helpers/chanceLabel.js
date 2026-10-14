/**
 * CareerPulse AI - Chance Label & Admission Probability Helper
 * Evaluates candidate likelihood against previous-year closing cutoffs with strict cutoffType parity.
 *
 * NOTE: Admission depends on annual seat matrices, reservation rosters, applicant volume, and exam trends.
 * No prediction guarantees admission.
 */

import { CHANCE_THRESHOLDS } from '../shared/cutoffConstants.js';

/**
 * Computes chance label and color variant for a student score vs historical cutoff.
 *
 * @param {Object} params
 * @param {number} params.studentValue - Student score, percentage, or rank
 * @param {number} params.prevCutoff - Previous year closing cutoff or rank
 * @param {string} params.cutoffType - 'TNEA200' | 'NEETScore' | 'JEERank' | 'Percentage'
 * @returns {Object} { label: string, variant: string, diff: number }
 */
export const getChanceLabel = ({ studentValue, prevCutoff, cutoffType = 'TNEA200' }) => {
  if (
    studentValue === null ||
    studentValue === undefined ||
    prevCutoff === null ||
    prevCutoff === undefined ||
    isNaN(studentValue) ||
    isNaN(prevCutoff)
  ) {
    return {
      label: 'Cutoff Pending',
      variant: 'slate',
      diff: 0
    };
  }

  const sVal = Number(studentValue);
  const pVal = Number(prevCutoff);

  // 1. JEE Rank (lower rank number is superior)
  if (cutoffType === 'JEERank') {
    const diff = pVal - sVal; // Positive when student rank is better (lower)
    const t = CHANCE_THRESHOLDS.JEERank;

    if (diff >= t.HIGH) return { label: 'High Chance', variant: 'green', diff };
    if (diff >= t.GOOD) return { label: 'Good Chance', variant: 'blue', diff };
    if (diff >= t.MODERATE) return { label: 'Moderate Chance', variant: 'lavender', diff };
    if (diff >= t.BORDERLINE) return { label: 'Borderline', variant: 'yellow', diff };
    return { label: 'Low Chance', variant: 'pink', diff };
  }

  // 2. NEET Score (out of 720, scaled thresholds)
  if (cutoffType === 'NEETScore') {
    const diff = Number((sVal - pVal).toFixed(2));
    const t = CHANCE_THRESHOLDS.NEETScore;

    if (diff >= t.HIGH) return { label: 'High Chance', variant: 'green', diff };
    if (diff >= t.GOOD) return { label: 'Good Chance', variant: 'blue', diff };
    if (diff >= t.MODERATE) return { label: 'Moderate Chance', variant: 'lavender', diff };
    if (diff >= t.BORDERLINE) return { label: 'Borderline', variant: 'yellow', diff };
    return { label: 'Low Chance', variant: 'pink', diff };
  }

  // 3. TNEA200 or Percentage (higher is superior)
  const diff = Number((sVal - pVal).toFixed(2));
  const t = CHANCE_THRESHOLDS.TNEA200;

  if (diff >= t.HIGH) return { label: 'High Chance', variant: 'green', diff };
  if (diff >= t.GOOD) return { label: 'Good Chance', variant: 'blue', diff };
  if (diff >= t.MODERATE) return { label: 'Moderate Chance', variant: 'lavender', diff };
  if (diff >= t.BORDERLINE) return { label: 'Borderline', variant: 'yellow', diff };
  return { label: 'Low Chance', variant: 'pink', diff };
};

/**
 * Categorizes a course into 'best', 'stretch', or 'safe' bucket relative to student marks.
 */
export const getBucketCategory = ({ studentValue, prevCutoff, cutoffType = 'TNEA200' }) => {
  if (
    studentValue === null ||
    studentValue === undefined ||
    prevCutoff === null ||
    prevCutoff === undefined
  ) {
    return 'safe';
  }

  const sVal = Number(studentValue);
  const pVal = Number(prevCutoff);

  if (cutoffType === 'JEERank') {
    const diff = pVal - sVal;
    if (Math.abs(diff) <= 1000) return 'best';
    return diff < -1000 ? 'stretch' : 'safe';
  }

  const diff = sVal - pVal;
  const tolerance = cutoffType === 'NEETScore' ? 10.8 : 3.0;

  if (Math.abs(diff) <= tolerance) {
    return 'best';
  }
  return diff < -tolerance ? 'stretch' : 'safe';
};

export default {
  getChanceLabel,
  getBucketCategory
};
