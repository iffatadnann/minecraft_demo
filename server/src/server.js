import app from './app.js';
import { env } from './config/env.js';
import { prisma } from './db/prisma.js';
import { deleteExpiredSessions } from './services/sessionService.js';

const server = app.listen(env.PORT, () => {
  console.log(`API running on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

// Remove expired sessions now and once an hour
const cleanup = () => deleteExpiredSessions().catch((e) => console.error('Session cleanup failed', e));
cleanup();
setInterval(cleanup, 60 * 60 * 1000).unref();

// Stop cleanly (Ctrl+C or a hosting restart)
async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);