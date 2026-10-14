/**
 * CareerPulse AI - Quiz Question Model
 * Stores aptitude, interest, and subject strength assessment questions.
 */

import mongoose from 'mongoose';

const QuizQuestionSchema = new mongoose.Schema(
  {
    questionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    category: {
      type: String,
      required: true,
      enum: ['Aptitude', 'Interest', 'Subject Strength']
    },
    question: {
      type: String,
      required: true
    },
    optionA: { type: String, required: true },
    optionB: { type: String, required: true },
    optionC: { type: String, required: true },
    optionD: { type: String, required: true },
    mapsToA: { type: String, required: true },
    mapsToB: { type: String, required: true },
    mapsToC: { type: String, required: true },
    mapsToD: { type: String, required: true },
    isSample: { type: Boolean, default: true }
  },
  {
    timestamps: true
  }
);

export const QuizQuestion = mongoose.model('QuizQuestion', QuizQuestionSchema);
export default QuizQuestion;
