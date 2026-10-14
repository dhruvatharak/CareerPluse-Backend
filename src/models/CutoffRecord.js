/**
 * CareerPulse AI - Cutoff Record Model
 * Persists student 12th marks, stream, competitive exam scores (JEE/NEET), and computed cutoffs.
 */

import mongoose from 'mongoose';

const CutoffRecordSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    stream: {
      type: String,
      required: true,
      enum: ['Engineering', 'Medical', 'Commerce', 'Arts', 'Science', 'Law', 'Other'],
      default: 'Engineering',
      index: true
    },
    twelfthMarks: {
      maths: { type: Number, default: null },
      physics: { type: Number, default: null },
      chemistry: { type: Number, default: null },
      biology: { type: Number, default: null },
      computerScience: { type: Number, default: null },
      accountancy: { type: Number, default: null },
      economics: { type: Number, default: null },
      commerce: { type: Number, default: null },
      businessMaths: { type: Number, default: null },
      other: { type: Number, default: null }
    },
    twelfthTotal: {
      type: Number,
      default: 0
    },
    twelfthPercentage: {
      type: Number,
      default: 0
    },
    jee: {
      score: { type: Number, default: null },
      percentile: { type: Number, default: null },
      rank: { type: Number, default: null }
    },
    neet: {
      score: { type: Number, default: null }
    },
    results: {
      tneaCutoff: { type: Number, default: null },
      neetScore: { type: Number, default: null },
      neetBand: { type: String, default: null },
      relevantSubjectAverage: { type: Number, default: null },
      percentage: { type: Number, default: 0 },
      eligibleCourseIds: { type: [String], default: [] }
    }
  },
  {
    timestamps: true
  }
);

export const CutoffRecord = mongoose.model('CutoffRecord', CutoffRecordSchema);
export default CutoffRecord;
