/**
 * CareerPulse AI - Groups Controller
 * Thin controller: parses request query and params, calls group.service, formats response.
 */

import * as groupService from '../services/group.service.js';
import { successResponse, errorResponse } from '../helpers/apiResponse.js';
import asyncHandler from '../helpers/asyncHandler.js';

export const getGroups = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const groups = await groupService.getAllGroups(search);
  return successResponse(res, 'Higher secondary groups retrieved', groups);
});

export const getGroupById = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const group = await groupService.getGroupByGroupId(groupId);

  if (!group) {
    return errorResponse(res, `Higher secondary group '${groupId}' not found`, 404);
  }

  return successResponse(res, 'Group details retrieved', group);
});

export default {
  getGroups,
  getGroupById
};
