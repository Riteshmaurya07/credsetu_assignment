import { describe, expect, it } from 'vitest';
import { buildEnv, parseDurationToSeconds } from '../../src/config/env.js';

describe('parseDurationToSeconds', () => {
  it('parses plain seconds', () => {
    expect(parseDurationToSeconds('3600')).toBe(3600);
  });

  it('parses the usual units', () => {
    expect(parseDurationToSeconds('30s')).toBe(30);
    expect(parseDurationToSeconds('15m')).toBe(900);
    expect(parseDurationToSeconds('12h')).toBe(43_200);
    expect(parseDurationToSeconds('7d')).toBe(604_800);
    expect(parseDurationToSeconds('1w')).toBe(604_800);
  });

  it('rejects invalid durations', () => {
    expect(() => parseDurationToSeconds('soon')).toThrow();
    expect(() => parseDurationToSeconds('7y')).toThrow();
  });
});

describe('buildEnv', () => {
  it('provides safe development defaults', () => {
    const env = buildEnv({});
    expect(env.nodeEnv).toBe('development');
    expect(env.port).toBe(4000);
    expect(env.otpExpiryMinutes).toBe(5);
    expect(env.otpMaxAttempts).toBe(5);
    expect(env.appTimeZone).toBe('Asia/Kolkata');
    expect(env.databaseUrl).toContain('postgres://');
  });

  it('refuses the placeholder JWT secret in production', () => {
    expect(() => buildEnv({ NODE_ENV: 'production' })).toThrow(/JWT_SECRET/);
  });

  it('refuses a too short JWT secret', () => {
    expect(() => buildEnv({ JWT_SECRET: 'short' })).toThrow(/at least 16 characters/);
  });

  it('reads the values from the environment', () => {
    const env = buildEnv({
      NODE_ENV: 'test',
      PORT: '5555',
      DATABASE_URL: 'postgres://u:p@localhost:1234/db',
      JWT_SECRET: 'a-sufficiently-long-secret',
      OTP_EXPIRY_MINUTES: '9',
      CORS_ORIGINS: 'http://a.test, http://b.test',
    });
    expect(env.nodeEnv).toBe('test');
    expect(env.port).toBe(5555);
    expect(env.databaseUrl).toBe('postgres://u:p@localhost:1234/db');
    expect(env.otpExpiryMinutes).toBe(9);
    expect(env.corsOrigins).toEqual(['http://a.test', 'http://b.test']);
  });

  it('throws when a numeric variable is not a number', () => {
    expect(() => buildEnv({ PORT: 'abc' })).toThrow(/must be an integer/);
  });

  it('parses OTP_LOG_ENABLED as a boolean and defaults it on outside production', () => {
    expect(buildEnv({}).otpLogEnabled).toBe(true);
    expect(buildEnv({ OTP_LOG_ENABLED: 'true' }).otpLogEnabled).toBe(true);
    expect(buildEnv({ OTP_LOG_ENABLED: 'TRUE' }).otpLogEnabled).toBe(true);
    expect(buildEnv({ OTP_LOG_ENABLED: '1' }).otpLogEnabled).toBe(true);
    expect(buildEnv({ OTP_LOG_ENABLED: 'false' }).otpLogEnabled).toBe(false);
    expect(buildEnv({ OTP_LOG_ENABLED: '0' }).otpLogEnabled).toBe(false);
    expect(buildEnv({ OTP_LOG_ENABLED: '' }).otpLogEnabled).toBe(true);
  });
});
