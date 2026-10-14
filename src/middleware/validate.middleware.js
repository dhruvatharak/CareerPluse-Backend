/**
 * CareerPulse AI - Express Validator Runner Middleware
 * Extracts validation results and halts request with descriptive errors if invalid.
 */

import { validationResult } from 'express-validator';
import { errorResponse } from '../helpers/apiResponse.js';

export const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    for (const validation of validations) {
      const result = await validation.run(req);
      if (result.errors.length) break;
    }

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const errorArray = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg
    }));

    const firstMsg = errorArray[0]?.message || 'Invalid input data';
    return errorResponse(res, firstMsg, 400, errorArray);
  };
};
