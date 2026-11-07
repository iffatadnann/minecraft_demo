import { Router } from 'express';
import * as statsController from '../controllers/statsController.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

router.get('/', requireAuth, statsController.getStats);

export default router;