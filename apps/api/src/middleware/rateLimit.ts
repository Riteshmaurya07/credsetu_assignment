import { rateLimit, ipKeyGenerator, type Options } from 'express-rate-limit';
import type { Request } from 'express';
import { getEnv } from '../config/env.js';
import { normalizePhone } from '../utils/phone.js';

function sendRateLimited(
  message: string,
  retryAfterSeconds: number,
): (req: Request, res: { status: (code: number) => { json: (body: unknown) => void } }) => void {
  return (_req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message,
        details: { retryAfterSeconds },
      },
    });
  };
}

/**
 * Limits how many OTP codes can be requested for a single phone number.
 * The key is the normalised phone number so formatting differences cannot be
 * used to bypass the limit.
 */
export function otpRequestPerPhoneLimiter() {
  const env = getEnv();
  const options: Partial<Options> = {
    windowMs: env.otpRateLimitWindowMs,
    limit: env.otpRateLimitPerPhone,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      const raw = (req.body as { phone?: unknown } | undefined)?.phone;
      const normalized = typeof raw === 'string' ? normalizePhone(raw) : null;
      return normalized?.ok ? `phone:${normalized.e164}` : `ip:${ipKeyGenerator(req.ip ?? '')}`;
    },
    handler: sendRateLimited(
      'Too many verification codes requested for this phone number. Try again later.',
      Math.ceil(env.otpRateLimitWindowMs / 1000),
    ),
  };
  return rateLimit(options);
}

/** Limits how many OTP requests a single IP address can make. */
export function otpRequestPerIpLimiter() {
  const env = getEnv();
  const options: Partial<Options> = {
    windowMs: env.otpRateLimitWindowMs,
    limit: env.otpRateLimitPerIp,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req: Request) => `ip:${ipKeyGenerator(req.ip ?? '')}`,
    handler: sendRateLimited(
      'Too many requests from this device. Try again later.',
      Math.ceil(env.otpRateLimitWindowMs / 1000),
    ),
  };
  return rateLimit(options);
}

/** Limits how many OTP verifications a single IP address can attempt. */
export function otpVerifyPerIpLimiter() {
  const env = getEnv();
  const options: Partial<Options> = {
    windowMs: env.otpRateLimitWindowMs,
    limit: env.otpRateLimitPerIp,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req: Request) => `ip:${ipKeyGenerator(req.ip ?? '')}`,
    handler: sendRateLimited(
      'Too many verification attempts. Try again later.',
      Math.ceil(env.otpRateLimitWindowMs / 1000),
    ),
  };
  return rateLimit(options);
}
