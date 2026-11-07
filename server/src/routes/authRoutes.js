import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { loginLimiter, signupLimiter } from '../middleware/rateLimiters.js';
import { signupSchema, loginSchema } from '../validators/authValidators.js';

const router = Router();

router.post('/signup', signupLimiter, validate(signupSchema), authController.signup);
router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);

export default router;