import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { generateToken, hashToken } from '../utils/tokens.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// Creates a session. The token goes to the browser; only its hash is stored.
export async function createSession(userId) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_DAYS * DAY_MS);
  await prisma.session.create({ data: { userId, tokenHash: hashToken(token), expiresAt } });
  return { token, expiresAt };
}

// Returns the user for a cookie token, or null if it is missing, unknown or expired.
export async function getSessionUser(token) {
  if (typeof token !== 'string' || token.length === 0 || token.length > 100) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session) return null;

  if (session.expiresAt <= new Date()) {
    await prisma.session.deleteMany({ where: { id: session.id } });
    return null;
  }
  return session.user;
}

export function deleteSession(token) {
  return prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

export function deleteExpiredSessions() {
  return prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}