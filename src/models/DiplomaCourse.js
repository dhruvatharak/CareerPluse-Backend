/**
 * CareerPulse AI - Diploma Course Model
 * Represents 3-year and 2-year polytechnic diploma courses for 10th/12th students.
 */

import mongoose from 'mongoose';

const DiplomaCourseSchema = new mongoose.Schema(
  {
    courseId: {
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
    duration: {
      type: String,
      default: '3 Years'
    },
    eligibility: {
      type: String,
      default: 'Pass in 10th Standard (SSLC)'
    },
    interestTags: {
      type: [String],
      default: [],
      index: true
    },
    careers: {
      type: [String],
      default: []
    },
    higherStudies: {
      type: [String],
      default: []
    },
    govtCareers: {
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

DiplomaCourseSchema.index({ name: 'text', interestTags: 'text' });

export const DiplomaCourse = mongoose.model('DiplomaCourse', DiplomaCourseSchema);
export default DiplomaCourse;
