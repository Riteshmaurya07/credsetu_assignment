import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
/** apps/api root directory (src/config -> ../../) */
export const API_ROOT = path.resolve(moduleDir, '..', '..');

let envLoaded = false;

/**
 * Loads apps/api/.env (if present) into process.env without overriding
 * variables that were already exported by the shell.
 */
export function loadDotEnv(): void {
  if (envLoaded) return;
  envLoaded = true;
  const candidates = [
    path.join(API_ROOT, '.env'),
    path.join(process.cwd(), '.env'),
    path.join(API_ROOT, '..', '..', '.env'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      dotenv.config({ path: candidate, override: false, quiet: true });
    }
  }
}

export type NodeEnv = 'development' | 'production' | 'test';

export interface AppEnv {
  nodeEnv: NodeEnv;
  isProduction: boolean;
  isTest: boolean;
  port: number;
  host: string;
  databaseUrl: string;
  databaseUrlTest: string | null;
  jwtSecret: string;
  jwtExpiresInSeconds: number;
  otpExpiryMinutes: number;
  otpMaxAttempts: number;
  otpResendCooldownSeconds: number;
  otpHashSecret: string;
  otpLogEnabled: boolean;
  otpRateLimitPerPhone: number;
  otpRateLimitPerIp: number;
  otpRateLimitWindowMs: number;
  appTimeZone: string;
  corsOrigins: string[];
  uploadDir: string;
  maxUploadBytes: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'silent';
}

export type EnvOverrides = Partial<Record<keyof AppEnv, unknown>>;

let cached: AppEnv | null = null;

function readString(source: NodeJS.ProcessEnv, key: string, fallback: string): string {
  const raw = source[key];
  return raw === undefined || raw === '' ? fallback : raw;
}

function readInt(source: NodeJS.ProcessEnv, key: string, fallback: number): number {
  const raw = source[key];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Environment variable ${key} must be an integer, received "${raw}".`);
  }
  return parsed;
}

function readBool(source: NodeJS.ProcessEnv, key: string, fallback: boolean): boolean {
  const raw = source[key];
  if (raw === undefined || raw === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
}

/**
 * Converts a JWT lifetime string such as `7d`, `12h`, `30m` or a raw number
 * of seconds into seconds.
 */
export function parseDurationToSeconds(value: string): number {
  const trimmed = value.trim().toLowerCase();
  if (/^\d+$/.test(trimmed)) return Number.parseInt(trimmed, 10);
  const match = /^(\d+)\s*([smhdw])$/.exec(trimmed);
  if (!match) {
    throw new Error(`Invalid duration "${value}". Use a number of seconds or a value like 7d, 12h, 30m.`);
  }
  const amount = Number.parseInt(match[1] as string, 10);
  const unit = match[2] as string;
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400, w: 604800 };
  return amount * (multipliers[unit] as number);
}

export function buildEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const nodeEnvRaw = readString(source, 'NODE_ENV', 'development');
  const nodeEnv: NodeEnv =
    nodeEnvRaw === 'production' || nodeEnvRaw === 'test' ? nodeEnvRaw : 'development';

  const defaultDatabaseUrl = 'postgres://miniledger:miniledger_dev_password@localhost:5432/miniledger';
  const databaseUrl = readString(source, 'DATABASE_URL', defaultDatabaseUrl);

  const defaultJwtSecret = 'miniledger-development-only-secret-change-me';
  const jwtSecret = readString(source, 'JWT_SECRET', defaultJwtSecret);
  if (nodeEnv === 'production' && jwtSecret === defaultJwtSecret) {
    throw new Error('JWT_SECRET must be set to a unique value when NODE_ENV=production.');
  }
  if (jwtSecret.length < 16) {
    throw new Error('JWT_SECRET must be at least 16 characters long.');
  }

  const jwtExpiresInSeconds = readInt(source, 'JWT_EXPIRES_IN_SECONDS', 7 * 24 * 60 * 60);

  const corsOriginsRaw = readString(source, 'CORS_ORIGINS', '*');
  const corsOrigins = corsOriginsRaw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  const logLevelRaw = readString(source, 'LOG_LEVEL', nodeEnv === 'test' ? 'silent' : 'info');
  const allowedLevels = ['debug', 'info', 'warn', 'error', 'silent'] as const;
  const logLevel = (allowedLevels as readonly string[]).includes(logLevelRaw)
    ? (logLevelRaw as AppEnv['logLevel'])
    : 'info';

  return {
    nodeEnv,
    isProduction: nodeEnv === 'production',
    isTest: nodeEnv === 'test',
    port: readInt(source, 'PORT', 4000),
    host: readString(source, 'HOST', '0.0.0.0'),
    databaseUrl,
    databaseUrlTest: source.DATABASE_URL_TEST ?? null,
    jwtSecret,
    jwtExpiresInSeconds,
    otpExpiryMinutes: readInt(source, 'OTP_EXPIRY_MINUTES', 5),
    otpMaxAttempts: readInt(source, 'OTP_MAX_ATTEMPTS', 5),
    otpResendCooldownSeconds: readInt(source, 'OTP_RESEND_COOLDOWN_SECONDS', 30),
    otpHashSecret: readString(source, 'OTP_HASH_SECRET', jwtSecret),
    // On by default outside production so local logins always work; production
    // must opt in explicitly rather than leaking codes into its logs.
    otpLogEnabled: readBool(source, 'OTP_LOG_ENABLED', nodeEnv !== 'production'),
    otpRateLimitPerPhone: readInt(source, 'OTP_RATE_LIMIT_PER_PHONE', 5),
    otpRateLimitPerIp: readInt(source, 'OTP_RATE_LIMIT_PER_IP', 30),
    otpRateLimitWindowMs: readInt(source, 'OTP_RATE_LIMIT_WINDOW_MS', 10 * 60 * 1000),
    appTimeZone: readString(source, 'APP_TIMEZONE', 'Asia/Kolkata'),
    corsOrigins,
    uploadDir: path.resolve(API_ROOT, readString(source, 'UPLOAD_DIR', 'uploads')),
    maxUploadBytes: readInt(source, 'MAX_UPLOAD_BYTES', 5 * 1024 * 1024),
    logLevel,
  };
}

export function getEnv(): AppEnv {
  if (!cached) {
    loadDotEnv();
    cached = buildEnv(process.env);
  }
  return cached;
}

/** Test helper: replaces the cached configuration. */
export function setEnv(overrides: EnvOverrides): AppEnv {
  const base = getEnv();
  cached = { ...base, ...overrides } as AppEnv;
  return cached;
}

/** Test helper: clears the cached configuration so it is re-read from process.env. */
export function resetEnvCache(): void {
  cached = null;
}
