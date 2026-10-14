/**
 * CareerPulse AI - Degree College Model
 * Represents engineering, medical, arts, and science colleges across Tamil Nadu.
 */

import mongoose from 'mongoose';

const CollegeSchema = new mongoose.Schema(
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
      enum: ['Government', 'Government-Aided', 'Private', 'University', 'Deemed'],
      default: 'Government',
      index: true
    },
    tier: {
      type: String,
      enum: ['Tier 1', 'Tier 2', 'Tier 3'],
      default: 'Tier 2',
      index: true
    },
    website: {
      type: String,
      default: ''
    },
    admissionRoute: {
      type: String,
      default: 'TNEA'
    },
    officialSource: {
      type: String,
      default: 'TNEA / DOTE'
    },
    academicYear: {
      type: String,
      default: '2024-2025'
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

CollegeSchema.index({ name: 'text' });

export const College = mongoose.model('College', CollegeSchema);
export default College;
