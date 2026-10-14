/**
 * CareerPulse AI - Groups Routes
 * Exposes endpoints for browsing and reading details of TN groups.
 */

import express from 'express';
import { param, query } from 'express-validator';
import * as groupController from '../controllers/group.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect); // All routes protected by JWT middleware

router.get(
  '/',
  validate([query('search').optional().trim()]),
  groupController.getGroups
);

router.get(
  '/:groupId',
  validate([param('groupId').trim().notEmpty().withMessage('groupId is required')]),
  groupController.getGroupById
);

export default router;
