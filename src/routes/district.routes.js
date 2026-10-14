/**
 * CareerPulse AI - District Routes
 */

import express from 'express';
import * as districtController from '../controllers/district.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.get('/', districtController.getDistricts);

export default router;
