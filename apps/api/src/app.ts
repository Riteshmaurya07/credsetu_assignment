import express, { type Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { getEnv } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

/**
 * Builds the Express application.
 * The factory keeps the app testable: tests can mount the same app with
 * supertest without binding a port.
 */
export function createApp(): Application {
  const env = getEnv();
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    helmet({
      // The API serves JSON and (optionally) receipt images; the default CSP
      // would not add value here.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        // Native mobile clients do not send an Origin header.
        if (!origin) {
          callback(null, true);
          return;
        }
        if (env.corsOrigins.includes('*')) {
          callback(null, true);
          return;
        }
        callback(null, env.corsOrigins.includes(origin));
      },
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 600,
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));

  app.use((req, _res, next) => {
    const startedAt = Date.now();
    _res.on('finish', () => {
      logger.debug(`${req.method} ${req.originalUrl} -> ${_res.statusCode} (${Date.now() - startedAt}ms)`);
    });
    next();
  });

  app.use('/api', apiRouter);

  app.get('/', (_req, res) => {
    res.json({
      success: true,
      data: {
        name: 'MiniLedger API',
        version: '1.0.0',
        docs: 'See README.md for the endpoint reference.',
      },
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
