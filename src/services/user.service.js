/**
 * CareerPulse AI - User Service
 * Manages profile aggregation, statistics, profile settings updates, and password rotation.
 */

import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import CutoffRecord from '../models/CutoffRecord.js';
import Recommendation from '../models/Recommendation.js';
import * as favoriteService from './favorite.service.js';
import * as quizService from './quiz.service.js';

/**
 * Gathers complete user profile, academic cutoffs, linked recommendations, and statistics.
 */
export const getProfileData = async (userId) => {
  const user = await User.findById(userId).select('-password');
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const [favorites, rawAttempts, allRecommendations, cutoffRecord] = await Promise.all([
    favoriteService.getFavoritesGrouped(userId),
    quizService.getUserQuizAttempts(userId),
    Recommendation.find({ user: userId }).sort({ createdAt: -1 }).lean(),
    CutoffRecord.findOne({ user: userId }).lean()
  ]);

  // Link recommendations to corresponding quiz attempts (latest 10)
  const quizAttempts = rawAttempts.slice(0, 10).map((attempt) => {
    const attemptObj = attempt.toObject ? attempt.toObject() : attempt;
    const linkedRec = allRecommendations.find(
      (r) => r.sourceRef && r.sourceRef.toString() === attemptObj._id.toString()
    );
    return {
      ...attemptObj,
      recommendation: linkedRec || null
    };
  });

  // Group recommendations by type
  const recommendationsByType = {
    'quiz-group': allRecommendations.filter((r) => r.type === 'quiz-group'),
    diploma: allRecommendations.filter((r) => r.type === 'diploma'),
    'career-12th': allRecommendations.filter((r) => r.type === 'career-12th')
  };

  // Compute aggregate user statistics
  const favouritesCount =
    (favorites.groups?.length || 0) +
    (favorites.schools?.length || 0) +
    (favorites.diplomas?.length || 0) +
    (favorites.colleges?.length || 0) +
    (favorites.degreeColleges?.length || 0);

  const stats = {
    favouritesCount,
    quizzesTaken: rawAttempts.length,
    recommendationsCount: allRecommendations.length
  };

  return {
    user,
    cutoffRecord,
    favorites,
    quizAttempts,
    recommendations: recommendationsByType,
    stats
  };
};

/**
 * Updates student profile details (name, district, category, phone).
 */
export const updateProfile = async (userId, { name, district, category, phone }) => {
  const updates = {};
  if (name && name.trim()) updates.name = name.trim();
  if (district && district.trim()) updates.district = district.trim();
  if (category && category.trim()) updates.category = category.trim();
  if (phone !== undefined) updates.phone = phone ? phone.trim() : '';

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: updates },
    { new: true, runValidators: true }
  ).select('-password');

  if (!updatedUser) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  return updatedUser;
};

/**
 * Verifies current password and rotates to new password.
 */
export const updatePassword = async (userId, { currentPassword, newPassword }) => {
  if (!newPassword || newPassword.length < 8) {
    const error = new Error('New password must be at least 8 characters long');
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findById(userId).select('+password');
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    const error = new Error('Current password does not match');
    error.statusCode = 400;
    throw error;
  }

  user.password = newPassword;
  await user.save();

  return true;
};

export default {
  getProfileData,
  updateProfile,
  updatePassword
};
