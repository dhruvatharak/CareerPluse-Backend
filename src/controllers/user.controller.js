/**
 * CareerPulse AI - User Controller
 * Thin controller managing user profile aggregation, profile updates, and password changes.
 */

import * as userService from '../services/user.service.js';
import { successResponse } from '../helpers/apiResponse.js';
import asyncHandler from '../helpers/asyncHandler.js';

export const getUserProfile = asyncHandler(async (req, res) => {
  const profile = await userService.getProfileData(req.user._id);
  return successResponse(res, 'User profile retrieved successfully', profile);
});

export const updateUserProfile = asyncHandler(async (req, res) => {
  const { name, district, category, phone } = req.body;
  const updatedUser = await userService.updateProfile(req.user._id, {
    name,
    district,
    category,
    phone
  });
  return successResponse(res, 'Profile updated successfully', updatedUser);
});

export const updateUserPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await userService.updatePassword(req.user._id, {
    currentPassword,
    newPassword
  });
  return successResponse(res, 'Password updated successfully', null);
});

export default {
  getUserProfile,
  updateUserProfile,
  updateUserPassword
};
