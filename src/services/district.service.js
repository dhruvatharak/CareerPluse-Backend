/**
 * CareerPulse AI - Districts Service
 * Returns list of Tamil Nadu districts for dropdown filters.
 */

import District from '../models/District.js';

export const getAllDistricts = async () => {
  return await District.find({}).sort({ name: 1 });
};
