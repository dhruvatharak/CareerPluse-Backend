/**
 * CareerPulse AI - Degree Course Model
 * Represents undergraduate degree programs (Engineering, Medical, Commerce, Arts, Science, Law).
 */

import mongoose from 'mongoose';

const CourseSchema = new mongoose.Schema(
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
    stream: {
      type: String,
      required: true,
      enum: ['Engineering', 'Medical', 'Commerce', 'Arts', 'Science', 'Law', 'Other'],
      index: true
    },
    duration: {
      type: String,
      default: '4 Years'
    },
    requiresJEE: {
      type: Boolean,
      default: false,
      index: true
    },
    requiresNEET: {
      type: Boolean,
      default: false,
      index: true
    },
    description: {
      type: String,
      default: ''
    },
    whatYouStudy: {
      type: [String],
      default: []
    },
    careers: {
      type: [String],
      default: []
    },
    govtCareers: {
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

CourseSchema.index({ name: 'text', description: 'text' });

export const Course = mongoose.model('Course', CourseSchema);
export default Course;
