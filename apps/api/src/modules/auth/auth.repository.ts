import { query as dbQuery } from '../../db/pool.js';

export interface UserRow {
  id: string;
  phone: string;
  display_name: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface OtpRow {
  id: string;
  phone: string;
  code_hash: string;
  salt: string;
  expires_at: Date;
  max_attempts: number;
  attempts: number;
  consumed_at: Date | null;
  created_at: Date;
}

/** Finds a user by their canonical phone number. */
export async function findUserByPhone(phone: string): Promise<UserRow | null> {
  const { rows } = await dbQuery<UserRow>(
    'SELECT id, phone, display_name, created_at, updated_at FROM users WHERE phone = $1',
    [phone],
  );
  return rows[0] ?? null;
}

/** Finds a user by id. */
export async function findUserById(id: string): Promise<UserRow | null> {
  const { rows } = await dbQuery<UserRow>(
    'SELECT id, phone, display_name, created_at, updated_at FROM users WHERE id = $1',
    [id],
  );
  return rows[0] ?? null;
}

/**
 * Creates the user for a phone number or returns the existing one.
 * The unique index on `users.phone` guarantees a single account per number.
 */
export async function upsertUserByPhone(phone: string): Promise<UserRow> {
  const inserted = await dbQuery<UserRow>(
    `INSERT INTO users (phone) VALUES ($1)
     ON CONFLICT (phone) DO NOTHING
     RETURNING id, phone, display_name, created_at, updated_at`,
    [phone],
  );
  if (inserted.rows[0]) return inserted.rows[0];

  const existing = await findUserByPhone(phone);
  if (existing) return existing;
  throw new Error(`Unable to create or load the user for ${phone}.`);
}

/** Persists a new OTP verification record (only the hash is stored). */
export async function createOtpVerification(input: {
  phone: string;
  codeHash: string;
  salt: string;
  expiresAt: Date;
  maxAttempts: number;
  /** Explicit creation timestamp so OTP timing uses one single clock. */
  createdAt: Date;
}): Promise<OtpRow> {
  const { rows } = await dbQuery<OtpRow>(
    `INSERT INTO otp_verifications (phone, code_hash, salt, expires_at, max_attempts, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.phone,
      input.codeHash,
      input.salt,
      input.expiresAt,
      input.maxAttempts,
      input.createdAt,
    ],
  );
  return rows[0] as OtpRow;
}

/** Returns the most recent OTP record for a phone number that is not consumed. */
export async function findLatestActiveOtp(phone: string): Promise<OtpRow | null> {
  const { rows } = await dbQuery<OtpRow>(
    `SELECT * FROM otp_verifications
     WHERE phone = $1 AND consumed_at IS NULL
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [phone],
  );
  return rows[0] ?? null;
}

/** Marks every still-open OTP of a phone number as superseded. */
export async function supersedeActiveOtps(phone: string): Promise<number> {
  const result = await dbQuery(
    `UPDATE otp_verifications
     SET consumed_at = NOW()
     WHERE phone = $1 AND consumed_at IS NULL`,
    [phone],
  );
  return result.rowCount ?? 0;
}

/** Consumes an OTP record. Returns true only for the caller that won the race. */
export async function consumeOtp(id: string): Promise<boolean> {
  const result = await dbQuery(
    `UPDATE otp_verifications
     SET consumed_at = NOW()
     WHERE id = $1 AND consumed_at IS NULL`,
    [id],
  );
  return (result.rowCount ?? 0) === 1;
}

/** Increments the failed attempt counter of an OTP record. */
export async function incrementOtpAttempts(id: string): Promise<number> {
  const { rows } = await dbQuery<{ attempts: number }>(
    `UPDATE otp_verifications
     SET attempts = attempts + 1
     WHERE id = $1
     RETURNING attempts`,
    [id],
  );
  return rows[0]?.attempts ?? 0;
}

/**
 * Timestamp of the most recent OTP that has not been consumed yet.
 *
 * The expiry is evaluated by the service against the application clock, so
 * this query must not use the database clock for time comparisons.
 */
export async function findLastUnconsumedOtpCreatedAt(phone: string): Promise<Date | null> {
  const { rows } = await dbQuery<{ created_at: Date }>(
    `SELECT created_at FROM otp_verifications
     WHERE phone = $1 AND consumed_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    [phone],
  );
  return rows[0]?.created_at ?? null;
}
