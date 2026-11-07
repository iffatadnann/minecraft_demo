import { prisma } from '../db/prisma.js';
import { AppError } from '../utils/AppError.js';
import { hashPassword, verifyPassword, getDummyHash } from '../utils/password.js';

// The only user fields the browser ever receives (never the password hash)
export function toPublicUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    emailVerified: user.emailVerifiedAt !== null,
    createdAt: user.createdAt,
  };
}

export async function signup({ username, email, password }) {
  const passwordHash = await hashPassword(password);
  try {
    return await prisma.user.create({
      data: {
        username,
        usernameLower: username.toLowerCase(),
        email,
        passwordHash,
        stats: { create: {} }, // empty stats row for the dashboard
      },
    });
  } catch (error) {
    // P2002 = a unique value (username or email) already exists
    if (error.code === 'P2002') {
      throw new AppError(409, 'ACCOUNT_EXISTS', 'That username or email is already in use');
    }
    throw error;
  }
}

export async function login({ username, password }) {
  const user = await prisma.user.findUnique({ where: { usernameLower: username.toLowerCase() } });

  // Always run a hash check, even for unknown usernames, so timing doesn't give them away
  const hash = user ? user.passwordHash : await getDummyHash();
  const valid = await verifyPassword(hash, password);

  if (!user || !valid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid username or password');
  }
  return user;
}