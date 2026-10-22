import { describe, expect, it } from 'vitest';
import { normalizePhone, formatPhoneForDisplay } from '../../src/utils/phone.js';

describe('normalizePhone', () => {
  it('normalises a plain Indian mobile number', () => {
    const result = normalizePhone('9876543210');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.e164).toBe('+919876543210');
      expect(result.countryIso).toBe('IN');
    }
  });

  it('ignores spaces, dashes, dots and parentheses', () => {
    const result = normalizePhone('+91 98765-43210');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.e164).toBe('+919876543210');
  });

  it('accepts the country code without a plus sign', () => {
    const result = normalizePhone('919876543210');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.e164).toBe('+919876543210');
  });

  it('removes a leading national trunk zero', () => {
    const result = normalizePhone('09876543210');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.e164).toBe('+919876543210');
  });

  it('prefers the longest matching dial code for UAE numbers', () => {
    const result = normalizePhone('+971501234567');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.e164).toBe('+971501234567');
      expect(result.countryIso).toBe('AE');
    }
  });

  it('uses the requested default country for national numbers', () => {
    const result = normalizePhone('2125551234', 'US');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.e164).toBe('+12125551234');
  });

  it('rejects an empty value', () => {
    expect(normalizePhone('').ok).toBe(false);
    expect(normalizePhone('   ').ok).toBe(false);
  });

  it('rejects a number with too few digits', () => {
    const result = normalizePhone('12345');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/digits/i);
  });

  it('rejects a number with too many digits', () => {
    expect(normalizePhone('987654321012345').ok).toBe(false);
  });

  it('rejects letters and other non numeric characters', () => {
    expect(normalizePhone('98abc543210').ok).toBe(false);
  });

  it('rejects a value that is not a string', () => {
    expect(normalizePhone(9876543210).ok).toBe(false);
  });

  it('rejects an unsupported country code', () => {
    const result = normalizePhone('+999123456789');
    expect(result.ok).toBe(false);
  });
});

describe('formatPhoneForDisplay', () => {
  it('groups the national number for readability', () => {
    expect(formatPhoneForDisplay('+919876543210')).toBe('+91 98765 43210');
  });

  it('returns the input unchanged when it is not canonical', () => {
    expect(formatPhoneForDisplay('nonsense')).toBe('nonsense');
  });
});
