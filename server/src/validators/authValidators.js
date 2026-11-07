import { z } from 'zod';

const username = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_]{3,20}$/, 'Username must be 3-20 letters, numbers or underscores');

const email = z.string().trim().toLowerCase().max(254).email('Enter a valid email address');

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters');

// strictObject rejects any extra fields
export const signupSchema = z.strictObject({ username, email, password });

export const loginSchema = z.strictObject({
  username: z.string().trim().min(1).max(20),
  password: z.string().min(1).max(128),
});