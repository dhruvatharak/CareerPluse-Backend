/**
 * CareerPulse AI - Authentication Controller
 * Thin controller: parses request, delegates to auth.service, sends structured API response.
 */

import * as authService from '../services/auth.service.js';
import { successResponse } from '../helpers/apiResponse.js';
import asyncHandler from '../helpers/asyncHandler.js';

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, district, category, phone } = req.body;
  const result = await authService.registerUser({
    name,
    email,
    password,
    district,
    category,
    phone
  });

  return successResponse(
    res,
    'Registration successful! Welcome to CareerPulse AI.',
    result,
    201
  );
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.loginUser({ email, password });

  return successResponse(
    res,
    'Signed in successfully! Welcome back.',
    result,
    200
  );
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getUserProfile(req.user._id);

  return successResponse(
    res,
    'Profile retrieved successfully',
    { user },
    200
  );
});

export default {
  register,
  login,
  getMe
};
