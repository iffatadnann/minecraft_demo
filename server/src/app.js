import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { isProduction } from './config/env.js';
import routes from './routes/index.js';
import { apiLimiter } from './middleware/rateLimiters.js';
import { originGuard } from './middleware/originGuard.js';
import { errorHandler } from './middleware/errorHandler.js';
import { AppError } from './utils/AppError.js';

const app = express();

app.disable('x-powered-by');
// Behind a hosting proxy (production), trust its first hop so client IPs and Secure cookies work
if (isProduction) app.set('trust proxy', 1);

app.use(helmet());

// Order matters: cheap checks first, then body parsing, then routes
app.use('/api', apiLimiter, originGuard);
// Saves can be larger than other requests: this parser runs first, for that route only
app.post('/api/worlds/:worldId/save', express.json({ limit: '512kb' }));
app.use(express.json({ limit: '16kb' })); // world saves will get a bigger limit on their own route
app.use(cookieParser());

app.use('/api', routes);
app.use('/api', () => {
  throw new AppError(404, 'NOT_FOUND', 'Not found');
});

// Serve the built game (client/dist) from the same server
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
app.use(express.static(clientDist));

app.use(errorHandler);

export default app;