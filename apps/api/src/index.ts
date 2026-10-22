import { createApp } from './app.js';
import { getEnv, loadDotEnv } from './config/env.js';
import { checkDatabaseConnection, closePool } from './db/pool.js';
import { logger } from './utils/logger.js';

loadDotEnv();

async function bootstrap(): Promise<void> {
  const env = getEnv();

  // The container database may still be starting up; retry before giving up.
  let databaseUp = false;
  const maxAttempts = 10;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    databaseUp = await checkDatabaseConnection();
    if (databaseUp) break;
    logger.warn(
      `PostgreSQL is not reachable yet (attempt ${attempt}/${maxAttempts}). Retrying in 2s...`,
    );
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  if (!databaseUp) {
    logger.error(
      `Cannot reach PostgreSQL at ${env.databaseUrl.replace(/:[^:@/]*@/, ':***@')}. ` +
        'Start it with `npm run db:up` and run `npm run api:migrate`.',
    );
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(env.port, env.host, () => {
    logger.info(`MiniLedger API listening on http://${env.host}:${env.port}`);
    logger.info(`Environment: ${env.nodeEnv} | Timezone: ${env.appTimeZone}`);
    logger.info(`Mock OTPs are printed to this terminal (OTP_LOG_ENABLED=${env.otpLogEnabled}).`);
  });

  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}, shutting down...`);
    server.close(() => {
      void closePool().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 5000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

void bootstrap();
