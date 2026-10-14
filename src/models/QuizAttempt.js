/**
 * CareerPulse AI - Quiz Attempt Model
 * Records student career aptitude assessments, response selections, category totals, and group weights.
 */

import mongoose from 'mongoose';

const QuizAttemptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    answers: [
      {
        questionId: {
          type: String,
          required: true
        },
        selectedOption: {
          type: String,
          required: true,
          enum: ['A', 'B', 'C', 'D']
        }
      }
    ],
    categoryScores: {
      Aptitude: { type: Number, default: 0 },
      Interest: { type: Number, default: 0 },
      'Subject Strength': { type: Number, default: 0 }
    },
    groupScores: {
      type: Map,
      of: Number,
      default: {}
    },
    tenthMarks: {
      maths: { type: Number, default: 0 },
      science: { type: Number, default: 0 },
      social: { type: Number, default: 0 },
      tamil: { type: Number, default: 0 },
      english: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    }
  },
  {
    timestamps: true
  }
);

QuizAttemptSchema.index({ user: 1, createdAt: -1 });

export const QuizAttempt = mongoose.model('QuizAttempt', QuizAttemptSchema);
export default QuizAttempt;
