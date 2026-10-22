import { afterAll, beforeAll, beforeEach } from 'vitest';
import { loadDotEnv, setEnv } from '../../src/config/env.js';
import { closePool, query } from '../../src/db/pool.js';
import { runMigrations } from '../../src/db/migrate.js';
import { logger } from '../../src/utils/logger.js';

/**
 * Integration test bootstrap.
 *
 * The suite always runs against the dedicated `miniledger_test` database so a
 * development database is never touched. If PostgreSQL is not reachable the
 * suite fails loudly instead of pretending to have passed.
 */
loadDotEnv();

const testDatabaseUrl = process.env.DATABASE_URL_TEST;

if (!testDatabaseUrl) {
  throw new Error(
    'DATABASE_URL_TEST is not set. Copy apps/api/.env.example to apps/api/.env and ' +
      'point DATABASE_URL_TEST at a dedicated test database before running the integration tests.',
  );
}

setEnv({
  databaseUrl: testDatabaseUrl,
  nodeEnv: 'test',
  isTest: true,
  isProduction: false,
  logLevel: 'silent',
  // A fixed timezone keeps "today" deterministic across machines.
  appTimeZone: 'UTC',
  // The integration tests exercise the rate limiters explicitly.
  otpResendCooldownSeconds: 0,
  otpRateLimitPerPhone: 1000,
  otpRateLimitPerIp: 1000,
});
logger.setLevel('silent');

beforeAll(async () => {
  try {
    await query('SELECT 1');
  } catch (error) {
    throw new Error(
      `Cannot reach the integration test database at ${testDatabaseUrl}. ` +
        'Start PostgreSQL with `npm run db:up` and try again. ' +
        `Original error: ${(error as Error).message}`,
    );
  }
  await runMigrations();
});

beforeEach(async () => {
  await query('TRUNCATE TABLE loans, otp_verifications, users RESTART IDENTITY CASCADE');
});

afterAll(async () => {
  await closePool();
});
