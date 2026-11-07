import { z } from 'zod';

// Reads and checks environment variables once at startup.
// If something is missing or wrong, the server stops with a clear message.
const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1),
  APP_ORIGIN: z.string().url(),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:');
  for (const issue of parsed.error.issues) {
    console.error(` - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = { ...parsed.data, APP_ORIGIN: new URL(parsed.data.APP_ORIGIN).origin };
export const isProduction = env.NODE_ENV === 'production';
