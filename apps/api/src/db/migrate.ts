/**
 * Minimal, dependency free migration runner.
 *
 * Every `migrations/*.sql` file is applied once, in lexicographic order, inside
 * its own transaction. Applied versions are tracked in `schema_migrations`
 * together with a checksum so edited migrations are detected instead of being
 * silently ignored.
 *
 * Usage:
 *   npm run migrate            # apply pending migrations
 *   npm run migrate:status     # show applied / pending migrations
 */
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDotEnv } from '../config/env.js';import { closePool, query } from './pool.js';
import { logger } from '../utils/logger.js';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
export const MIGRATIONS_DIR = path.resolve(moduleDir, '..', '..', 'migrations');

interface MigrationFile {
  version: string;
  name: string;
  fileName: string;
  sql: string;
  checksum: string;
}

export interface MigrationRecord {
  version: string;
  name: string;
  checksum: string;
  appliedAt: Date;
}

async function ensureMigrationsTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version     TEXT PRIMARY KEY,
      name        TEXT        NOT NULL,
      checksum    TEXT        NOT NULL,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function loadMigrationFiles(): Promise<MigrationFile[]> {
  const entries = await readdir(MIGRATIONS_DIR);
  const sqlFiles = entries.filter((file) => file.endsWith('.sql')).sort();
  const migrations: MigrationFile[] = [];
  for (const fileName of sqlFiles) {
    const sql = await readFile(path.join(MIGRATIONS_DIR, fileName), 'utf8');
    const version = fileName.split('_')[0] ?? fileName;
    migrations.push({
      version,
      name: fileName.replace(/\.sql$/, ''),
      fileName,
      sql,
      checksum: createHash('sha256').update(sql).digest('hex'),
    });
  }
  return migrations;
}

export async function getAppliedMigrations(): Promise<MigrationRecord[]> {
  await ensureMigrationsTable();
  const result = await query<{
    version: string;
    name: string;
    checksum: string;
    applied_at: Date;
  }>('SELECT version, name, checksum, applied_at FROM schema_migrations ORDER BY version');
  return result.rows.map((row) => ({
    version: row.version,
    name: row.name,
    checksum: row.checksum,
    appliedAt: row.applied_at,
  }));
}

/** Applies every pending migration. Returns the versions that were applied. */
export async function runMigrations(): Promise<string[]> {
  await ensureMigrationsTable();
  const migrations = await loadMigrationFiles();
  const applied = await getAppliedMigrations();
  const appliedByVersion = new Map(applied.map((record) => [record.version, record]));
  const pending = migrations.filter((migration) => !appliedByVersion.has(migration.version));

  for (const migration of pending) {
    logger.info(`Applying migration ${migration.fileName}`);
    await query('BEGIN');
    try {
      await query(migration.sql);
      await query(
        'INSERT INTO schema_migrations (version, name, checksum) VALUES ($1, $2, $3)',
        [migration.version, migration.name, migration.checksum],
      );
      await query('COMMIT');
    } catch (error) {
      await query('ROLLBACK');
      logger.error(`Migration ${migration.fileName} failed`, error);
      throw error;
    }
  }

  // Detect drift: a migration that was already applied but has been edited.
  for (const migration of migrations) {
    const record = appliedByVersion.get(migration.version);
    if (record && record.checksum !== migration.checksum) {
      logger.warn(
        `Migration ${migration.fileName} was modified after it was applied (checksum mismatch).`,
      );
    }
  }

  return pending.map((migration) => migration.version);
}

async function main(): Promise<void> {
  loadDotEnv();
  const args = process.argv.slice(2);
  const statusOnly = args.includes('--status');

  try {
    if (statusOnly) {
      const migrations = await loadMigrationFiles();
      const applied = await getAppliedMigrations();
      const appliedVersions = new Set(applied.map((record) => record.version));
      logger.info('Migration status:');
      for (const migration of migrations) {
        const state = appliedVersions.has(migration.version) ? 'applied' : 'pending';
        logger.info(`  [${state}] ${migration.fileName}`);
      }
      return;
    }

    const appliedNow = await runMigrations();
    if (appliedNow.length === 0) {
      logger.info('Database is already up to date. No migrations applied.');
    } else {
      logger.info(`Applied ${appliedNow.length} migration(s): ${appliedNow.join(', ')}`);
    }
  } catch (error) {
    logger.error('Migration run failed', error);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  void main();
}
