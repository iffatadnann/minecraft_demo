import { Router } from 'express';
import authRoutes from './authRoutes.js';
import statsRoutes from './statsRoutes.js';
import worldRoutes from './worldRoutes.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ ok: true }));
router.use('/auth', authRoutes);
router.use('/stats', statsRoutes);
router.use('/worlds', worldRoutes);

export default router;