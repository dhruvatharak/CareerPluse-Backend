/**
 * CareerPulse AI - Cutoff Service
 * Manages 12th marks submission, cutoff calculation, NEET score bands, and persistence.
 */

import CutoffRecord from '../models/CutoffRecord.js';
import Course from '../models/Course.js';
import MedicalCutoff from '../models/MedicalCutoff.js';
import User from '../models/User.js';
import {
  calculateTwelfthPercentage,
  calculateTneaCutoff,
  calculateRelevantSubjectAverage,
  evaluateNeetBand,
  determineEligibleCourses
} from '../helpers/cutoffCalculator.js';

export const saveAndCalculateCutoff = async ({
  userId,
  stream = 'Engineering',
  twelfthMarks = {},
  twelfthTotal = null,
  jee = null,
  neet = null
}) => {
  const [allCourses, medicalCutoffs, user] = await Promise.all([
    Course.find({}),
    MedicalCutoff.find({}),
    User.findById(userId).select('category')
  ]);

  const category = user?.category || 'OC';

  // 1. Percentage
  const { total, percentage } = calculateTwelfthPercentage({
    marks: twelfthMarks,
    total: twelfthTotal
  });

  // 2. TNEA Engineering Cutoff (Maths/2 + Physics/4 + Chemistry/4)
  const tneaCutoff = calculateTneaCutoff({
    maths: twelfthMarks?.maths,
    physics: twelfthMarks?.physics,
    chemistry: twelfthMarks?.chemistry
  });

  // 3. Relevant subject average
  const relevantSubjectAverage = calculateRelevantSubjectAverage({
    stream,
    marks: twelfthMarks
  });

  // 4. NEET score band
  const neetScore = neet && neet.score !== undefined && neet.score !== null ? Number(neet.score) : null;
  const neetBand = evaluateNeetBand({
    neetScore,
    category,
    medicalCutoffs
  });

  // 5. Eligible course IDs
  const eligibleCourseIds = determineEligibleCourses({
    stream,
    marks: twelfthMarks,
    neet,
    jee,
    allCourses
  });

  const updatePayload = {
    stream,
    twelfthMarks: {
      maths: twelfthMarks?.maths ?? null,
      physics: twelfthMarks?.physics ?? null,
      chemistry: twelfthMarks?.chemistry ?? null,
      biology: twelfthMarks?.biology ?? null,
      computerScience: twelfthMarks?.computerScience ?? null,
      accountancy: twelfthMarks?.accountancy ?? null,
      economics: twelfthMarks?.economics ?? null,
      commerce: twelfthMarks?.commerce ?? null,
      businessMaths: twelfthMarks?.businessMaths ?? null,
      other: twelfthMarks?.other ?? null
    },
    twelfthTotal: total,
    twelfthPercentage: percentage,
    jee: {
      score: jee?.score ?? null,
      percentile: jee?.percentile ?? null,
      rank: jee?.rank ?? null
    },
    neet: {
      score: neetScore
    },
    results: {
      tneaCutoff,
      neetScore,
      neetBand,
      relevantSubjectAverage,
      percentage,
      eligibleCourseIds
    }
  };

  const record = await CutoffRecord.findOneAndUpdate(
    { user: userId },
    { $set: updatePayload },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return record;
};

export const getUserCutoff = async (userId) => {
  return await CutoffRecord.findOne({ user: userId });
};

export default {
  saveAndCalculateCutoff,
  getUserCutoff
};
