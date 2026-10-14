/**
 * CareerPulse AI - School Service
 * Query, filter, sorting, and pagination logic for schools.
 */

import School from '../models/School.js';

export const getSchools = async ({
  district = '',
  search = '',
  sort = 'passPercentage',
  page = 1,
  limit = 10
}) => {
  const query = {};

  if (district && district.trim() && district !== 'All') {
    query.district = district.trim();
  }

  if (search && search.trim()) {
    const regex = new RegExp(search.trim(), 'i');
    query.$or = [{ name: regex }, { district: regex }, { type: regex }];
  }

  // Determine sort order
  let sortOption = { passPercentage12th: -1, centumCount: -1 };
  if (sort === 'centumCount') {
    sortOption = { centumCount: -1, passPercentage12th: -1 };
  } else if (sort === 'name') {
    sortOption = { name: 1 };
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const [schools, total] = await Promise.all([
    School.find(query).sort(sortOption).skip(skip).limit(limitNum),
    School.countDocuments(query)
  ]);

  return {
    schools,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1
    }
  };
};

export const getSchoolById = async (schoolId) => {
  return await School.findOne({ schoolId });
};
