import * as authService from '../services/authService.js';
import { createSession, deleteSession } from '../services/sessionService.js';
import { SESSION_COOKIE, setSessionCookie, clearSessionCookie } from '../utils/sessionCookie.js';

// Starts a brand-new session (a new token every time) and sets the cookie
async function startSession(res, user) {
  const { token, expiresAt } = await createSession(user.id);
  setSessionCookie(res, token, expiresAt);
}

export async function signup(req, res) {
  const user = await authService.signup(req.body);
  await startSession(res, user);
  res.status(201).json({ user: authService.toPublicUser(user) });
}

export async function login(req, res) {
  const user = await authService.login(req.body);
  await startSession(res, user);
  res.json({ user: authService.toPublicUser(user) });
}

// Works even if the session is already gone, so the browser always ends up logged out
export async function logout(req, res) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token === 'string') await deleteSession(token);
  clearSessionCookie(res);
  res.json({ ok: true });
}

export function me(req, res) {
  res.json({ user: authService.toPublicUser(req.user) });
}