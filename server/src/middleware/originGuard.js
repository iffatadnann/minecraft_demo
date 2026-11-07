import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// CSRF protection for requests that change data:
// 1. The Origin header must be our own site (browsers add it to every POST/PUT/PATCH/DELETE).
// 2. If the request has a body, it must be JSON (a plain HTML form cannot send that).
export function originGuard(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  if (req.get('origin') !== env.APP_ORIGIN) {
    throw new AppError(403, 'BAD_ORIGIN', 'Request origin is not allowed');
  }

  // Only check the type when a body is actually being sent
  const length = Number(req.get('content-length') || 0);
  const hasBody = length > 0 || req.get('transfer-encoding') !== undefined;
  if (hasBody && !req.is('application/json')) {
    throw new AppError(415, 'BAD_CONTENT_TYPE', 'Content-Type must be application/json');
  }
  next();
}