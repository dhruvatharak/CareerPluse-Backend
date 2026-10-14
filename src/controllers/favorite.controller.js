/**
 * CareerPulse AI - Favorites Controller
 */

import * as favoriteService from '../services/favorite.service.js';
import { successResponse } from '../helpers/apiResponse.js';
import asyncHandler from '../helpers/asyncHandler.js';

export const addFavorite = asyncHandler(async (req, res) => {
  const { itemType, itemId } = req.body;
  const favorite = await favoriteService.addFavorite(req.user._id, itemType, itemId);
  return successResponse(res, 'Item added to favorites', favorite, 201);
});

export const removeFavorite = asyncHandler(async (req, res) => {
  const { itemType, itemId } = req.params;
  await favoriteService.removeFavorite(req.user._id, itemType, itemId);
  return successResponse(res, 'Item removed from favorites', { itemType, itemId }, 200);
});

export const getFavorites = asyncHandler(async (req, res) => {
  const data = await favoriteService.getFavoritesGrouped(req.user._id);
  return successResponse(res, 'Favorites retrieved successfully', data, 200);
});

export default {
  addFavorite,
  removeFavorite,
  getFavorites
};
