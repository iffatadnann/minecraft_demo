import { ApiError } from './httpClient.js';

const STORAGE_KEY_USERS = 'lanternvale_users';
const STORAGE_KEY_CURRENT_USER = 'lanternvale_current_user';

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || '{}');
  } catch {
    return {};
  }
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
}

export async function signup({ username = '', email = '', password = '' }) {
  const trimmedName = username.trim();
  const trimmedEmail = email.trim().toLowerCase();
  const details = [];

  if (trimmedName.length < 3 || trimmedName.length > 20 || !/^[a-zA-Z0-9_]+$/.test(trimmedName)) {
    details.push({ field: 'username', message: 'Username must be 3-20 letters, numbers, or _' });
  }

  if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    details.push({ field: 'email', message: 'Please enter a valid email address' });
  }

  if (!password || password.length < 8) {
    details.push({ field: 'password', message: 'Password must be at least 8 characters' });
  }

  if (details.length > 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Validation failed', details);
  }

  const users = getUsers();
  const lowerName = trimmedName.toLowerCase();

  if (users[lowerName]) {
    throw new ApiError(409, 'USERNAME_TAKEN', 'Username already taken', [
      { field: 'username', message: 'Username is already taken' },
    ]);
  }

  const emailExists = Object.values(users).some((u) => u.email === trimmedEmail);
  if (emailExists) {
    throw new ApiError(409, 'EMAIL_TAKEN', 'Email already in use', [
      { field: 'email', message: 'Email is already in use' },
    ]);
  }

  const user = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `user_${Date.now()}`,
    username: trimmedName,
    usernameLower: lowerName,
    email: trimmedEmail,
    password, // Stored in browser localStorage
    createdAt: new Date().toISOString(),
  };

  users[lowerName] = user;
  saveUsers(users);

  const sessionUser = { id: user.id, username: user.username, email: user.email };
  localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(sessionUser));

  // Initialize stats if not present
  const statsKey = `lanternvale_stats_${user.id}`;
  if (!localStorage.getItem(statsKey)) {
    localStorage.setItem(
      statsKey,
      JSON.stringify({ blocksPlaced: 0, blocksMined: 0, distanceTravelled: 0, playTimeSeconds: 0 })
    );
  }

  return sessionUser;
}

export async function login({ username = '', password = '' }) {
  const trimmedName = username.trim();
  const lowerName = trimmedName.toLowerCase();
  const users = getUsers();
  const user = users[lowerName];

  if (!user || user.password !== password) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid username or password');
  }

  const sessionUser = { id: user.id, username: user.username, email: user.email };
  localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(sessionUser));
  return sessionUser;
}

export async function logout() {
  localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
  return { ok: true };
}

export async function fetchMe() {
  const raw = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
  if (!raw) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Not logged in');
  }
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
    throw new ApiError(401, 'UNAUTHORIZED', 'Session corrupted');
  }
}

export async function guestLogin() {
  const guestUser = {
    id: 'guest',
    username: 'Guest',
    email: 'guest@lanternvale.local',
  };
  localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(guestUser));

  const statsKey = 'lanternvale_stats_guest';
  if (!localStorage.getItem(statsKey)) {
    localStorage.setItem(
      statsKey,
      JSON.stringify({ blocksPlaced: 0, blocksMined: 0, distanceTravelled: 0, playTimeSeconds: 0 })
    );
  }

  return guestUser;
}
