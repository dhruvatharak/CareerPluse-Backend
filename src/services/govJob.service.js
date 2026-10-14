/**
 * CareerPulse AI - Government Jobs Service
 * Query and filter logic for government job opportunities by qualification level.
 */

import GovJob from '../models/GovJob.js';

export const getGovJobs = async ({ level = '10th', search = '' }) => {
  const query = {};

  if (level && level.trim() && level !== 'All') {
    query.qualificationLevel = level.trim();
  }

  if (search && search.trim()) {
    const regex = new RegExp(search.trim(), 'i');
    query.$or = [{ title: regex }, { department: regex }, { examName: regex }];
  }

  return await GovJob.find(query).sort({ jobId: 1 });
};
