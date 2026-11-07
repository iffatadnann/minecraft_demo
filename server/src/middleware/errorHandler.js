import { AppError } from '../utils/AppError.js';

const send = (res, status, code, message, details) =>
  res.status(status).json({ error: { code, message, details } });

// The last middleware: turns any error into a safe JSON response (never a stack trace).
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof AppError) return send(res, err.status, err.code, err.message, err.details);
  if (err.type === 'entity.parse.failed') return send(res, 400, 'BAD_JSON', 'Invalid JSON body');
  if (err.type === 'entity.too.large') return send(res, 413, 'TOO_LARGE', 'Request body is too large');

  console.error(err); // full details stay in the server log only
  return send(res, 500, 'INTERNAL', 'Something went wrong');
}