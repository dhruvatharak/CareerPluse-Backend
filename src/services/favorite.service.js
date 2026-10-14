/**
 * CareerPulse AI - Favorites Service
 * Manages user bookmarks with idempotent upserts and populated collection lookups.
 */

import Favorite from '../models/Favorite.js';
import Group from '../models/Group.js';
import School from '../models/School.js';
import DiplomaCourse from '../models/DiplomaCourse.js';
import DiplomaCollege from '../models/DiplomaCollege.js';
import College from '../models/College.js';

export const addFavorite = async (userId, itemType, itemId) => {
  return await Favorite.findOneAndUpdate(
    { user: userId, itemType, itemId: itemId.trim() },
    { $set: { user: userId, itemType, itemId: itemId.trim() } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

export const removeFavorite = async (userId, itemType, itemId) => {
  return await Favorite.findOneAndDelete({
    user: userId,
    itemType,
    itemId: itemId.trim()
  });
};

export const getFavoritesGrouped = async (userId) => {
  const favorites = await Favorite.find({ user: userId }).sort({ createdAt: -1 });

  const groupIds = favorites.filter((f) => f.itemType === 'group').map((f) => f.itemId);
  const schoolIds = favorites.filter((f) => f.itemType === 'school').map((f) => f.itemId);
  const diplomaIds = favorites.filter((f) => f.itemType === 'diploma').map((f) => f.itemId);
  const collegeIds = favorites.filter((f) => f.itemType === 'college').map((f) => f.itemId);
  const degreeCollegeIds = favorites.filter((f) => f.itemType === 'degreeCollege').map((f) => f.itemId);

  const [groups, schools, diplomas, colleges, degreeColleges] = await Promise.all([
    groupIds.length > 0 ? Group.find({ groupId: { $in: groupIds } }) : [],
    schoolIds.length > 0 ? School.find({ schoolId: { $in: schoolIds } }) : [],
    diplomaIds.length > 0 ? DiplomaCourse.find({ courseId: { $in: diplomaIds } }) : [],
    collegeIds.length > 0 ? DiplomaCollege.find({ collegeId: { $in: collegeIds } }) : [],
    degreeCollegeIds.length > 0 ? College.find({ collegeId: { $in: degreeCollegeIds } }) : []
  ]);

  return {
    raw: favorites,
    groups,
    schools,
    colleges,
    diplomas,
    degreeColleges
  };
};
