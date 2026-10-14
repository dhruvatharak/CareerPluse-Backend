/**
 * CareerPulse AI - Async Handler Wrapper
 * Eliminates repetitive try-catch blocks in controllers and ensures unhandled errors route to error.middleware.
 */

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
