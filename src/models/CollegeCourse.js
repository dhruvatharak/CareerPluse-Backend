/**
 * CareerPulse AI - College Course Allocation & Cutoff Model
 * Stores college-wise course cutoffs, historical intake, admissions, fees, and hostel info.
 */

import mongoose from 'mongoose';

const CollegeCourseSchema = new mongoose.Schema(
  {
    collegeId: {
      type: String,
      required: true,
      index: true
    },
    courseId: {
      type: String,
      required: true,
      index: true
    },
    cutoffType: {
      type: String,
      required: true,
      enum: ['TNEA200', 'NEETScore', 'JEERank', 'Percentage'],
      index: true
    },
    prevCutoff: {
      type: Number,
      required: true
    },
    intake: {
      type: Number,
      default: null
    },
    admitted: {
      type: Number,
      default: 0,
      index: true
    },
    fees: {
      type: Number,
      default: null
    },
    hostel: {
      type: Number,
      default: null
    },
    academicYear: {
      type: String,
      required: true,
      index: true
    },
    source: {
      type: String,
      default: 'Official Admission Authority'
    },
    lastUpdated: {
      type: String,
      default: ''
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

CollegeCourseSchema.index({ collegeId: 1, courseId: 1, academicYear: 1 }, { unique: true });

export const CollegeCourse = mongoose.model('CollegeCourse', CollegeCourseSchema);
export default CollegeCourse;
