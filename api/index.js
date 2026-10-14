/**
 * CareerPulse AI - Vercel Serverless Function Entrypoint
 * Exports the Express app instance for Vercel Serverless execution.
 * Database connections are managed lazily with global connection caching.
 * Local development uses src/server.js (which calls app.listen).
 */

import app from '../src/app.js';

export { app };
export default app;
