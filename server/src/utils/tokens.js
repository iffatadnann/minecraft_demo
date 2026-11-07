import { randomBytes, createHash } from 'node:crypto';

// A random, unguessable token (sent to the user)
export const generateToken = () => randomBytes(32).toString('base64url');

// Only this hash is stored in the database, so a database leak can't be used to log in
export const hashToken = (token) => createHash('sha256').update(token).digest('hex');