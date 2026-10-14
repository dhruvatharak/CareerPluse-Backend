/**
 * CareerPulse AI - Authentication Service
 * Contains all business logic for student registration, login, and profile retrieval.
 */

import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { env } from '../config/env.js';

/**
 * Generate signed JWT token for user
 */
export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN
    }
  );
};

/**
 * Register a new Tamil Nadu student user
 */
export const registerUser = async ({ name, email, password, district, category, phone }) => {
  const cleanEmail = email.trim().toLowerCase();

  // Check if email already registered
  const existingUser = await User.findOne({ email: cleanEmail });
  if (existingUser) {
    const error = new Error(`An account with email '${cleanEmail}' is already registered. Please sign in instead.`);
    error.statusCode = 400;
    throw error;
  }

  // Create new user
  const user = await User.create({
    name: name.trim(),
    email: cleanEmail,
    password,
    district: district.trim(),
    category: category.trim(),
    phone: phone ? phone.trim() : ''
  });

  const token = generateToken(user);

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      district: user.district,
      category: user.category,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt
    },
    token
  };
};

/**
 * Authenticate existing student user
 */
export const loginUser = async ({ email, password }) => {
  const cleanEmail = email.trim().toLowerCase();

  // Look up user including password hash
  const user = await User.findOne({ email: cleanEmail }).select('+password');
  if (!user) {
    const error = new Error('Invalid email or password. Please check your credentials.');
    error.statusCode = 401;
    throw error;
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    const error = new Error('Invalid email or password. Please check your credentials.');
    error.statusCode = 401;
    throw error;
  }

  const token = generateToken(user);

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      district: user.district,
      category: user.category,
      phone: user.phone,
      role: user.role,
      tenthMarks: user.tenthMarks,
      twelfthMarks: user.twelfthMarks,
      createdAt: user.createdAt
    },
    token
  };
};

/**
 * Retrieve authenticated user profile
 */
export const getUserProfile = async (userId) => {
  const user = await User.findById(userId).select('-password');
  if (!user) {
    const error = new Error('User account not found.');
    error.statusCode = 404;
    throw error;
  }
  return user;
};
