import pg from 'pg';
import type { Pool as PgPool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { getEnv } from '../config/env.js';
import { logger } from '../utils/logger.js';

const { Pool: PoolClass } = pg;

/**
 * PostgreSQL `DATE` columns are returned as the raw `YYYY-MM-DD` string.
 * The default pg parser converts them to a JS Date in the *server* timezone,
 * which can silently shift the calendar day. Due dates must never shift.
 */
pg.types.setTypeParser(pg.types.builtins.DATE, (value: string) => value);

/** `NUMERIC` stays a string so money never passes through a float. */
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value: string) => value);


let pool: PgPool | null = null;

export function getPool(): PgPool {
  if (!pool) {
    const env = getEnv();
    pool = new PoolClass({
      connectionString: env.databaseUrl,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      application_name: 'miniledger-api',
    });
    pool.on('error', (error) => {
      logger.error('Unexpected idle client error', error);
    });
  }
  return pool;
}

/**
 * Runs a parameterised query. Values are always passed as bind parameters so
 * untrusted input can never be interpolated into SQL text.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params as unknown[]);
}

/** Runs `fn` inside a transaction, rolling back on any thrown error. */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      logger.error('Transaction rollback failed', rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
}

/** Verifies the database is reachable; used by /api/health. */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch (error) {
    logger.error('Database health check failed', error);
    return false;
  }
}

export async function closePool(): Promise<void> {
  if (!pool) return;
  const current = pool;
  pool = null;
  await current.end();
}
