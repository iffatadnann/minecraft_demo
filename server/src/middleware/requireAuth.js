import { getSessionUser } from '../services/sessionService.js';
import { SESSION_COOKIE } from '../utils/sessionCookie.js';
import { AppError } from '../utils/AppError.js';

// Put this before any route that needs a logged-in user. Sets req.user.
export async function requireAuth(req, res, next) {
  const user = await getSessionUser(req.cookies?.[SESSION_COOKIE]);
  if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Please log in');
  req.user = user;
  next();
}