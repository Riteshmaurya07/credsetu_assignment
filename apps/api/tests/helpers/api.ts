import request from 'supertest';
import { vi } from 'vitest';
import type { Application } from 'express';
import { createApp } from '../../src/app.js';
import { logger } from '../../src/utils/logger.js';

export function buildTestApp(): Application {
  return createApp();
}

export interface OtpCapture {
  response: request.Response;
  /** The plaintext code as printed to the API terminal, or null when absent. */
  code: string | null;
  /** The raw log line that was printed. */
  logLine: string | null;
}

/**
 * Requests an OTP over HTTP and captures the code that the API prints to the
 * terminal. The code is deliberately not part of the HTTP response, so this
 * mirrors exactly what a human tester does.
 */
export async function requestOtp(
  app: Application,
  phone: string,
  countryCode?: string,
): Promise<OtpCapture> {
  const spy = vi.spyOn(logger, 'info');
  try {
    const response = await request(app)
      .post('/api/auth/request-otp')
      .send(countryCode ? { phone, countryCode } : { phone });
    const logLine =
      spy.mock.calls
        .map((call) => String(call[0] ?? ''))
        .find((message) => message.includes('[MOCK OTP]')) ?? null;
    const match = logLine ? /code=(\d{6})/.exec(logLine) : null;
    return { response, code: match?.[1] ?? null, logLine };
  } finally {
    spy.mockRestore();
  }
}

export interface Session {
  token: string;
  userId: string;
  phone: string;
}

/** Completes the full mock OTP login and returns the issued session. */
export async function login(
  app: Application,
  phone: string,
  countryCode?: string,
): Promise<Session> {
  const { response, code } = await requestOtp(app, phone, countryCode);
  if (!code) {
    throw new Error(`No OTP was printed for ${phone} (status ${response.status}).`);
  }
  const verify = await request(app)
    .post('/api/auth/verify-otp')
    .send(countryCode ? { phone, code, countryCode } : { phone, code });
  if (verify.status !== 200) {
    throw new Error(`Login failed for ${phone}: ${JSON.stringify(verify.body)}`);
  }
  return {
    token: verify.body.data.token as string,
    userId: verify.body.data.user.id as string,
    phone: verify.body.data.user.phone as string,
  };
}

/** Authorization header for a session. */
export function bearer(session: Session): Record<string, string> {
  return { Authorization: `Bearer ${session.token}` };
}
