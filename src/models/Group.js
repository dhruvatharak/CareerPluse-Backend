/**
 * CareerPulse AI - Higher Secondary Group Model
 * Stores Tamil Nadu 11th standard group codes, subjects, eligibility, and career outcomes.
 */

import mongoose from 'mongoose';

const GroupSchema = new mongoose.Schema(
  {
    groupId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    subjects: {
      type: [String],
      default: []
    },
    eligibility: {
      type: String,
      default: ''
    },
    minMarks: {
      type: Number,
      default: 0
    },
    suitableProfile: {
      type: String,
      default: ''
    },
    coursesAfter12th: {
      type: [String],
      default: []
    },
    entranceExams: {
      type: [String],
      default: []
    },
    govtCareers: {
      type: [String],
      default: []
    },
    privateCareers: {
      type: [String],
      default: []
    },
    higherStudies: {
      type: [String],
      default: []
    },
    isSample: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

export const Group = mongoose.model('Group', GroupSchema);
export default Group;
