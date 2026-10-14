/**
 * CareerPulse AI - Diploma College Model
 * Represents polytechnic colleges across Tamil Nadu districts with affiliated diploma courses.
 */

import mongoose from 'mongoose';

const DiplomaCollegeSchema = new mongoose.Schema(
  {
    collegeId: {
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
    district: {
      type: String,
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['Government', 'Government-Aided', 'Self-Financing', 'Central Government'],
      default: 'Government',
      index: true
    },
    courses: {
      type: [String],
      default: [],
      index: true
    },
    website: {
      type: String,
      default: ''
    },
    academicYear: {
      type: String,
      default: '2024-2025'
    },
    source: {
      type: String,
      default: 'DOTE Tamil Nadu'
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

DiplomaCollegeSchema.index({ name: 'text' });

export const DiplomaCollege = mongoose.model('DiplomaCollege', DiplomaCollegeSchema);
export default DiplomaCollege;
