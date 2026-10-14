/**
 * CareerPulse AI - Medical Cutoff Reference Model
 * Stores DME category-wise NEET score ranges for MBBS and BDS admissions.
 */

import mongoose from 'mongoose';

const MedicalCutoffSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      enum: ['OC', 'BC', 'BCM', 'MBC', 'SC', 'SCA', 'ST'],
      index: true
    },
    courseId: {
      type: String,
      required: true,
      index: true
    },
    minNeetScore: {
      type: Number,
      required: true
    },
    maxNeetScore: {
      type: Number,
      required: true
    },
    academicYear: {
      type: String,
      required: true,
      index: true
    },
    source: {
      type: String,
      default: 'DME Tamil Nadu'
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

MedicalCutoffSchema.index({ category: 1, courseId: 1, academicYear: 1 }, { unique: true });

export const MedicalCutoff = mongoose.model('MedicalCutoff', MedicalCutoffSchema);
export default MedicalCutoff;
