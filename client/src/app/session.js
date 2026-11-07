import { fetchMe } from '../api/authApi.js';

// Holds "who is logged in" in memory only (the real session is the server cookie).
let currentUser = null;

export const getUser = () => currentUser;
export const setUser = (user) => {
  currentUser = user;
};

// Called once at startup. A 401 (or any error) simply means "not logged in".
export async function loadSession() {
  try {
    currentUser = await fetchMe();
  } catch {
    currentUser = null;
  }
}