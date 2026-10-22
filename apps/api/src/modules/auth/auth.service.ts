import { getEnv } from '../../config/env.js';
import { AppError, tooManyRequests, validationError } from '../../errors/AppError.js';
import { now } from '../../utils/clock.js';
import { logger } from '../../utils/logger.js';
import { generateOtpCode, generateOtpSalt, hashOtpCode, verifyOtpCode } from '../../utils/otp.js';
import { signAccessToken } from '../../utils/jwt.js';
import { normalizePhone } from '../../utils/phone.js';
import {
  createOtpVerification,
  findLastUnconsumedOtpCreatedAt,
  findLatestActiveOtp,
  consumeOtp,
  incrementOtpAttempts,
  supersedeActiveOtps,
  upsertUserByPhone,
  type UserRow,
} from './auth.repository.js';

export interface PublicUser {
  id: string;
  phone: string;
  createdAt: string;
}

export interface RequestOtpResult {
  phone: string;
  expiresInSeconds: number;
  resendAvailableInSeconds: number;
}

export interface VerifyOtpResult {
  token: string;
  expiresInSeconds: number;
  user: PublicUser;
}

function toPublicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    phone: user.phone,
    createdAt: user.created_at.toISOString(),
  };
}

function resolvePhone(rawPhone: unknown, countryCode: unknown): string {
  const defaultIso =
    typeof countryCode === 'string' && countryCode.trim().length > 0
      ? countryCode.trim().toUpperCase()
      : 'IN';
  const result = normalizePhone(rawPhone, defaultIso);
  if (!result.ok) {
    throw validationError(result.error, [{ field: 'phone', message: result.error }]);
  }
  return result.e164;
}

/**
 * Creates (or refreshes) an OTP for a phone number.
 *
 * The plaintext code is never returned over HTTP. It is printed to the API
 * terminal so a developer can complete the mock login flow manually.
 */
export async function requestOtp(input: {
  phone: unknown;
  countryCode?: unknown;
}): Promise<RequestOtpResult> {
  const env = getEnv();
  const phone = resolvePhone(input.phone, input.countryCode);
  const currentTime = now();

  const lastCreatedAt = await findLastUnconsumedOtpCreatedAt(phone);
  if (lastCreatedAt) {
    const elapsedMs = currentTime.getTime() - lastCreatedAt.getTime();
    const cooldownMs = env.otpResendCooldownSeconds * 1000;
    if (elapsedMs < cooldownMs) {
      const retryAfterSeconds = Math.max(1, Math.ceil((cooldownMs - elapsedMs) / 1000));
      throw tooManyRequests(
        `Please wait ${retryAfterSeconds}s before requesting another code.`,
        { retryAfterSeconds },
      );
    }
  }

  const code = generateOtpCode();
  const salt = generateOtpSalt();
  const codeHash = await hashOtpCode(code, salt);
  const expiresAt = new Date(currentTime.getTime() + env.otpExpiryMinutes * 60_000);

  // Only the newest code stays valid.
  await supersedeActiveOtps(phone);
  await createOtpVerification({
    phone,
    codeHash,
    salt,
    expiresAt,
    maxAttempts: env.otpMaxAttempts,
    createdAt: currentTime,
  });

  if (env.otpLogEnabled) {
    logger.info(
      `[MOCK OTP] phone=${phone} code=${code} expiresIn=${env.otpExpiryMinutes}m attempts=${env.otpMaxAttempts}`,
    );
  } else {
    logger.info(`[MOCK OTP] code for ${phone} generated (OTP logging disabled)`);
  }

  return {
    phone,
    expiresInSeconds: env.otpExpiryMinutes * 60,
    resendAvailableInSeconds: env.otpResendCooldownSeconds,
  };
}

/**
 * Verifies an OTP and issues an access token.
 *
 * Rejects invalid, expired, exhausted and already-used codes.
 */
export async function verifyOtp(input: {
  phone: unknown;
  code: unknown;
  countryCode?: unknown;
}): Promise<VerifyOtpResult> {
  const env = getEnv();
  const phone = resolvePhone(input.phone, input.countryCode);
  const code = typeof input.code === 'string' ? input.code.trim() : '';

  if (!/^\d{6}$/.test(code)) {
    throw validationError('Enter the 6-digit verification code.', [
      { field: 'code', message: 'The verification code must contain exactly 6 digits.' },
    ]);
  }

  const otp = await findLatestActiveOtp(phone);
  if (!otp) {
    throw new AppError(
      400,
      'OTP_INVALID',
      'That verification code is not valid. Request a new code and try again.',
    );
  }

  const currentTime = now();

  if (otp.expires_at.getTime() <= currentTime.getTime()) {
    await consumeOtp(otp.id);
    throw new AppError(
      400,
      'OTP_EXPIRED',
      'That verification code has expired. Request a new code and try again.',
    );
  }

  if (otp.attempts >= otp.max_attempts) {
    await consumeOtp(otp.id);
    throw tooManyRequests(
      'Too many incorrect attempts. Request a new verification code.',
      { retryAfterSeconds: env.otpResendCooldownSeconds },
    );
  }

  const matches = await verifyOtpCode(code, otp.salt, otp.code_hash);
  if (!matches) {
    const attempts = await incrementOtpAttempts(otp.id);
    const remaining = Math.max(0, otp.max_attempts - attempts);
    if (remaining === 0) {
      await consumeOtp(otp.id);
      throw tooManyRequests(
        'Too many incorrect attempts. Request a new verification code.',
        { retryAfterSeconds: env.otpResendCooldownSeconds },
      );
    }
    throw new AppError(
      400,
      'OTP_INVALID',
      `That verification code is not correct. ${remaining} attempt${
        remaining === 1 ? '' : 's'
      } remaining.`,
    );
  }

  // Single use: only the request that flips consumed_at wins.
  const consumed = await consumeOtp(otp.id);
  if (!consumed) {
    throw new AppError(
      400,
      'OTP_USED',
      'That verification code has already been used. Request a new code.',
    );
  }

  const user = await upsertUserByPhone(phone);
  const { token, expiresInSeconds } = signAccessToken({ id: user.id, phone: user.phone });

  return {
    token,
    expiresInSeconds,
    user: toPublicUser(user),
  };
}
