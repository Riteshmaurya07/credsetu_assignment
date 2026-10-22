import { describe, expect, it } from 'vitest';
import {
  generateOtpCode,
  generateOtpSalt,
  hashOtpCode,
  isOtpShape,
  verifyOtpCode,
} from '../../src/utils/otp.js';

describe('generateOtpCode', () => {
  it('always produces six digits, including leading zeros', () => {
    for (let i = 0; i < 500; i += 1) {
      const code = generateOtpCode();
      expect(code).toMatch(/^\d{6}$/);
    }
  });

  it('produces different codes', () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateOtpCode()));
    expect(codes.size).toBeGreaterThan(90);
  });
});

describe('generateOtpSalt', () => {
  it('produces unique salts', () => {
    const salts = new Set(Array.from({ length: 50 }, () => generateOtpSalt()));
    expect(salts.size).toBe(50);
  });
});

describe('hashOtpCode / verifyOtpCode', () => {
  it('verifies the correct code', async () => {
    const salt = generateOtpSalt();
    const hash = await hashOtpCode('123456', salt);
    await expect(verifyOtpCode('123456', salt, hash)).resolves.toBe(true);
  });

  it('rejects an incorrect code', async () => {
    const salt = generateOtpSalt();
    const hash = await hashOtpCode('123456', salt);
    await expect(verifyOtpCode('654321', salt, hash)).resolves.toBe(false);
  });

  it('never stores the plaintext code', async () => {
    const salt = generateOtpSalt();
    const hash = await hashOtpCode('123456', salt);
    expect(hash).not.toContain('123456');
    expect(hash).toHaveLength(64);
  });

  it('produces different hashes for the same code with different salts', async () => {
    const hashA = await hashOtpCode('123456', generateOtpSalt());
    const hashB = await hashOtpCode('123456', generateOtpSalt());
    expect(hashA).not.toBe(hashB);
  });
});

describe('isOtpShape', () => {
  it('accepts six digits only', () => {
    expect(isOtpShape('123456')).toBe(true);
    expect(isOtpShape('12345')).toBe(false);
    expect(isOtpShape('1234567')).toBe(false);
    expect(isOtpShape('12345a')).toBe(false);
    expect(isOtpShape(123456)).toBe(false);
  });
});
