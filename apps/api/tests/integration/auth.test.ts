import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildTestApp, bearer, login, requestOtp } from '../helpers/api.js';
import { advanceClock, resetClock, setClock } from '../../src/utils/clock.js';
import { getEnv, setEnv } from '../../src/config/env.js';

const app = buildTestApp();
const PHONE = '9876543210';

describe('POST /api/auth/request-otp', () => {
  beforeEach(() => {
    setClock(() => new Date('2026-06-15T09:00:00.000Z'));
  });

  afterEach(() => {
    resetClock();
  });

  it('accepts a valid phone number and never returns the OTP', async () => {
    const { response, code, logLine } = await requestOtp(app, PHONE);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.phone).toBe('+919876543210');
    expect(response.body.data.expiresInSeconds).toBe(300);
    expect(response.body.data.resendAvailableInSeconds).toBe(
      getEnv().otpResendCooldownSeconds,
    );

    // The code must not leak through the HTTP response in any shape.
    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain(code ?? '___');
    // Removing the phone number, no other six digit sequence may remain.
    expect(serialized.replaceAll('+919876543210', '')).not.toMatch(/\d{6}/);

    // ...but it must be printed to the API terminal.
    expect(code).toMatch(/^\d{6}$/);
    expect(logLine).toContain('[MOCK OTP]');
    expect(logLine).toContain('+919876543210');
  });

  it('rejects an invalid phone number', async () => {
    const response = await request(app).post('/api/auth/request-otp').send({ phone: '12345' });
    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a missing phone number', async () => {
    const response = await request(app).post('/api/auth/request-otp').send({});
    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('supersedes a previous code when a new one is requested', async () => {
    const first = await requestOtp(app, PHONE);
    advanceClock(60_000);
    const second = await requestOtp(app, PHONE);

    expect(second.code).not.toBe(first.code);

    // The first (superseded) code must no longer work.
    const verify = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phone: PHONE, code: first.code });
    expect(verify.status).toBe(400);
  });

  it('enforces the resend cooldown between two requests', async () => {
    const previous = getEnv().otpResendCooldownSeconds;
    setEnv({ otpResendCooldownSeconds: 30 });
    try {
      await requestOtp(app, PHONE);
      const second = await request(app)
        .post('/api/auth/request-otp')
        .send({ phone: PHONE });

      expect(second.status).toBe(429);
      expect(second.body.error.code).toBe('RATE_LIMITED');
      expect(second.body.error.details.retryAfterSeconds).toBeGreaterThan(0);
      expect(second.body.error.details.retryAfterSeconds).toBeLessThanOrEqual(30);

      // After the cooldown has passed a new code can be requested again.
      advanceClock(31_000);
      const third = await request(app).post('/api/auth/request-otp').send({ phone: PHONE });
      expect(third.status).toBe(200);
    } finally {
      setEnv({ otpResendCooldownSeconds: previous });
    }
  });
});

describe('POST /api/auth/verify-otp', () => {
  beforeEach(() => {
    setClock(() => new Date('2026-06-15T09:00:00.000Z'));
  });

  afterEach(() => {
    resetClock();
  });

  it('verifies a valid code and returns a token plus safe user details', async () => {
    const { code } = await requestOtp(app, PHONE);
    const response = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phone: PHONE, code });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(typeof response.body.data.token).toBe('string');
    expect(response.body.data.token.split('.')).toHaveLength(3);
    expect(response.body.data.tokenType).toBe('Bearer');
    expect(response.body.data.user.phone).toBe('+919876543210');
    expect(response.body.data.user.id).toMatch(/^[0-9a-f-]{36}$/);
    // No password or hash may be exposed.
    expect(JSON.stringify(response.body)).not.toMatch(/hash|salt|password/i);
  });

  it('rejects an incorrect code', async () => {
    const { code } = await requestOtp(app, PHONE);
    const wrong = code === '000000' ? '111111' : '000000';
    const response = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phone: PHONE, code: wrong });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('OTP_INVALID');
    expect(response.body.data).toBeUndefined();
  });

  it('rejects a code that has expired', async () => {
    const { code } = await requestOtp(app, PHONE);
    // Move past the five minute expiry.
    advanceClock(6 * 60 * 1000);

    const response = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phone: PHONE, code });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('OTP_EXPIRED');
  });

  it('accepts a code right before it expires', async () => {
    const { code } = await requestOtp(app, PHONE);
    advanceClock(4 * 60 * 1000 + 59 * 1000);

    const response = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phone: PHONE, code });

    expect(response.status).toBe(200);
  });

  it('rejects a code that is used twice', async () => {
    const { code } = await requestOtp(app, PHONE);

    const first = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phone: PHONE, code });
    expect(first.status).toBe(200);

    const second = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phone: PHONE, code });
    expect(second.status).toBe(400);
    expect(['OTP_USED', 'OTP_INVALID']).toContain(second.body.error.code);
  });

  it('locks the code after too many incorrect attempts', async () => {
    const { code } = await requestOtp(app, PHONE);
    const wrong = code === '000000' ? '111111' : '000000';

    let lastStatus = 0;
    let lastCode = '';
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: PHONE, code: wrong });
      lastStatus = response.status;
      lastCode = response.body.error.code;
    }

    expect(lastStatus).toBe(429);
    expect(lastCode).toBe('RATE_LIMITED');

    // Even the correct code no longer works.
    const correct = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phone: PHONE, code });
    expect(correct.status).not.toBe(200);
  });

  it('rejects a code for a phone number that never requested one', async () => {
    const response = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phone: '9000000000', code: '123456' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('OTP_INVALID');
  });

  it('rejects a malformed code', async () => {
    const response = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phone: PHONE, code: '12' });
    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns the same user for the same phone number', async () => {
    const first = await login(app, PHONE);
    const second = await login(app, PHONE);
    expect(second.userId).toBe(first.userId);
  });

  it('accepts the same phone number in different formats', async () => {
    const first = await login(app, PHONE);
    const second = await login(app, '+91 98765 43210');
    expect(second.userId).toBe(first.userId);
  });
});

describe('protected routes', () => {
  it('rejects a request without a token', async () => {
    const response = await request(app).get('/api/loans');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('TOKEN_MISSING');
  });

  it('rejects a malformed token', async () => {
    const response = await request(app)
      .get('/api/loans')
      .set('Authorization', 'Bearer not-a-real-token');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('TOKEN_INVALID');
  });

  it('accepts a token issued by the login flow', async () => {
    const session = await login(app, PHONE);
    const response = await request(app).get('/api/loans').set(bearer(session));
    expect(response.status).toBe(200);
  });
});
