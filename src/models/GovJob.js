/**
 * CareerPulse AI - Government Job Model
 * Stores public sector recruitment opportunities filtered by minimum qualification level.
 */

import mongoose from 'mongoose';

const GovJobSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    department: {
      type: String,
      required: true,
      trim: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    qualificationLevel: {
      type: String,
      required: true,
      enum: ['10th', '12th', 'Diploma', 'Degree'],
      index: true
    },
    minQualification: {
      type: String,
      default: ''
    },
    ageLimit: {
      type: String,
      default: 'Verify on official notification'
    },
    selectionProcess: {
      type: String,
      default: ''
    },
    examName: {
      type: String,
      default: ''
    },
    payLevel: {
      type: String,
      default: ''
    },
    officialSource: {
      type: String,
      default: 'Verify'
    },
    status: {
      type: String,
      default: 'Active / Periodic'
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

GovJobSchema.index({ title: 'text', department: 'text' });

export const GovJob = mongoose.model('GovJob', GovJobSchema);
export default GovJob;
