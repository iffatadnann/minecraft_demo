import { isProduction } from '../config/env.js';

export const SESSION_COOKIE = 'sid';

// HttpOnly: JavaScript can't read it. Secure: HTTPS only (in production).
// SameSite=Lax: not sent on cross-site POST requests.
const options = { httpOnly: true, secure: isProduction, sameSite: 'lax', path: '/' };

export function setSessionCookie(res, token, expiresAt) {
  res.cookie(SESSION_COOKIE, token, { ...options, expires: expiresAt });
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, options);
}

export default SESSION_COOKIE;