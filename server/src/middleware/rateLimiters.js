import rateLimit from 'express-rate-limit';

function makeLimiter({ windowMs, limit, message, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs,
    limit,
    skipSuccessfulRequests,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({ error: { code: 'RATE_LIMITED', message } });
    },
  });
}

const MINUTES = 60 * 1000;

// Everything under /api
export const apiLimiter = makeLimiter({
  windowMs: 15 * MINUTES,
  limit: 600,
  message: 'Too many requests. Please slow down.',
});

// Only FAILED logins count, so normal players are not affected
export const loginLimiter = makeLimiter({
  windowMs: 15 * MINUTES,
  limit: 10,
  skipSuccessfulRequests: true,
  message: 'Too many login attempts. Try again in a few minutes.',
});

export const signupLimiter = makeLimiter({
  windowMs: 60 * MINUTES,
  limit: 10,
  message: 'Too many sign-up attempts. Try again later.',
});

// Autosave runs about twice a minute, so this leaves plenty of room
export const saveLimiter = makeLimiter({
  windowMs: 15 * MINUTES,
  limit: 150,
  message: 'Saving too often. Please wait a moment.',
});