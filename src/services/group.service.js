/**
 * CareerPulse AI - Higher Secondary Groups Service
 * Query logic for Tamil Nadu groups and subject combinations.
 */

import Group from '../models/Group.js';

export const getAllGroups = async (search = '') => {
  const query = {};
  if (search && search.trim()) {
    const regex = new RegExp(search.trim(), 'i');
    query.$or = [{ name: regex }, { subjects: regex }, { suitableProfile: regex }];
  }

  return await Group.find(query).sort({ groupId: 1 });
};

export const getGroupByGroupId = async (groupId) => {
  return await Group.findOne({ groupId });
};
