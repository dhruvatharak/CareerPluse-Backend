/**
 * CareerPulse AI - 404 Route Not Found Middleware
 */

import { errorResponse } from '../helpers/apiResponse.js';

export const notFound = (req, res, next) => {
  return errorResponse(res, `Route not found: [${req.method}] ${req.originalUrl}`, 404);
};
