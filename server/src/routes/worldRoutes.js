import { Router } from 'express';
import { z } from 'zod';
import * as worldController from '../controllers/worldController.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate } from '../middleware/validate.js';
import { saveLimiter } from '../middleware/rateLimiters.js';
import { AppError } from '../utils/AppError.js';
import { createWorldSchema, renameWorldSchema, saveWorldSchema } from '../validators/worldValidators.js';

const router = Router();

// Every world route needs a logged-in user
router.use(requireAuth);

// A world id that is not a UUID is "not found" (it never reaches the database)
router.param('worldId', (req, res, next, value) => {
  if (!z.string().uuid().safeParse(value).success) {
    throw new AppError(404, 'WORLD_NOT_FOUND', 'World not found');
  }
  next();
});

router.get('/', worldController.list);
router.post('/', validate(createWorldSchema), worldController.create);
router.get('/:worldId', worldController.get);
router.patch('/:worldId', validate(renameWorldSchema), worldController.rename);
router.delete('/:worldId', worldController.remove);
router.post('/:worldId/save', saveLimiter, validate(saveWorldSchema), worldController.save);

export default router;