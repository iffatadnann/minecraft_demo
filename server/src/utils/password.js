import argon2 from 'argon2';

// Argon2id with the OWASP-recommended minimum settings (19 MiB memory, 2 passes).
const OPTIONS = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 };

export function hashPassword(password) {
  return argon2.hash(password, OPTIONS);
}

export async function verifyPassword(hash, password) {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false; // a damaged hash counts as "wrong password"
  }
}

// A fake hash used when the username doesn't exist, so login takes about the
// same time either way (this hides which usernames are real).
let dummy;
export function getDummyHash() {
  dummy ??= argon2.hash('not-a-real-password', OPTIONS);
  return dummy;
}