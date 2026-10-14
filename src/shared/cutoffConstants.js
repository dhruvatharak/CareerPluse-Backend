/**
 * CareerPulse AI - Cutoff & Stream Constants
 * Thresholds, stream subject mappings, and eligibility rules for Tamil Nadu admissions.
 */

export const STREAM_SUBJECTS = {
  Engineering: ['maths', 'physics', 'chemistry'],
  Medical: ['physics', 'chemistry', 'biology'],
  Commerce: ['accountancy', 'economics', 'commerce', 'businessMaths'],
  Science: ['maths', 'physics', 'chemistry', 'biology', 'computerScience'],
  Arts: ['economics', 'history', 'geography', 'politicalScience', 'english', 'tamil']
};

export const CHANCE_THRESHOLDS = {
  TNEA200: {
    HIGH: 8,
    GOOD: 3,
    MODERATE: -2,
    BORDERLINE: -5
  },
  Percentage: {
    HIGH: 8,
    GOOD: 3,
    MODERATE: -2,
    BORDERLINE: -5
  },
  NEETScore: {
    HIGH: 28.8, // 8 * 3.6
    GOOD: 10.8, // 3 * 3.6
    MODERATE: -7.2, // -2 * 3.6
    BORDERLINE: -18 // -5 * 3.6
  },
  JEERank: {
    // For ranks: positive diff means student rank is smaller (better) than prevCutoff
    HIGH: 2000,
    GOOD: 500,
    MODERATE: -500,
    BORDERLINE: -2000
  }
};

export const OFFICIAL_DISCLAIMER =
  'Previous-year cutoff does not guarantee admission in the current year. Cutoffs, seats, eligibility, fees and recruitment requirements can change every year. Always verify the latest information from the official authority before applying.';
