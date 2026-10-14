/**
 * CareerPulse AI - School Model
 * Stores Tamil Nadu schools performance data with district and text search indexes.
 */

import mongoose from 'mongoose';

const SchoolSchema = new mongoose.Schema(
  {
    schoolId: {
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
      default: 'Government'
    },
    passPercentage12th: {
      type: Number,
      default: 0,
      index: true
    },
    centumCount: {
      type: Number,
      default: 0,
      index: true
    },
    academicYear: {
      type: String,
      default: '2023-2024'
    },
    source: {
      type: String,
      default: 'DGE Tamil Nadu'
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

// Compound text index for fast search by name
SchoolSchema.index({ name: 'text' });

export const School = mongoose.model('School', SchoolSchema);
export default School;
