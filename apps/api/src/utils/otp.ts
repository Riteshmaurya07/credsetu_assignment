import { randomInt, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
) => Promise<Buffer>;

export const OTP_LENGTH = 6;

/** Generates a cryptographically random six digit OTP. */
export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(OTP_LENGTH, '0');
}

/** Generates a random salt used to hash an OTP before it is stored. */
export function generateOtpSalt(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Hashes an OTP with scrypt and the given salt. Only the hash is persisted so
 * a database leak does not expose usable OTPs.
 */
export async function hashOtpCode(code: string, salt: string): Promise<string> {
  const derived = await scrypt(code, salt, 32);
  return derived.toString('hex');
}

/** Constant-time comparison of a candidate OTP against a stored hash. */
export async function verifyOtpCode(
  code: string,
  salt: string,
  expectedHash: string,
): Promise<boolean> {
  const candidate = Buffer.from(await hashOtpCode(code, salt), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  if (candidate.length === 0 || candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

/** True when the value looks like a six digit OTP. */
export function isOtpShape(value: unknown): value is string {
  return typeof value === 'string' && new RegExp(`^\\d{${OTP_LENGTH}}$`).test(value.trim());
}
