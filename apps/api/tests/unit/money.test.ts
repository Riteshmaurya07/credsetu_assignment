import { describe, expect, it } from 'vitest';
import {
  addDecimalStrings,
  fromMinorUnits,
  normalizeDecimalString,
  parseAmountToDecimalString,
  toMinorUnits,
} from '../../src/utils/money.js';

describe('parseAmountToDecimalString', () => {
  it('canonicalises integer amounts', () => {
    expect(parseAmountToDecimalString(1500)).toBe('1500.00');
    expect(parseAmountToDecimalString('1500')).toBe('1500.00');
  });

  it('keeps two decimal places', () => {
    expect(parseAmountToDecimalString('1500.5')).toBe('1500.50');
    expect(parseAmountToDecimalString(1500.5)).toBe('1500.50');
    expect(parseAmountToDecimalString('1500.05')).toBe('1500.05');
  });

  it('removes insignificant leading zeros', () => {
    expect(parseAmountToDecimalString('01500.50')).toBe('1500.50');
  });

  it('does not lose precision on values that are not float safe', () => {
    // 0.1 + 0.2 === 0.30000000000000004 in JavaScript.
    expect(parseAmountToDecimalString(0.1 + 0.2)).toBeNull();
    expect(parseAmountToDecimalString('0.30')).toBe('0.30');
    expect(parseAmountToDecimalString(12345678.91)).toBe('12345678.91');
  });

  it('rejects zero and negative amounts', () => {
    expect(parseAmountToDecimalString(0)).toBeNull();
    expect(parseAmountToDecimalString('0')).toBeNull();
    expect(parseAmountToDecimalString('0.00')).toBeNull();
    expect(parseAmountToDecimalString(-100)).toBeNull();
    expect(parseAmountToDecimalString('-100.50')).toBeNull();
  });

  it('rejects more than two decimal places', () => {
    expect(parseAmountToDecimalString('10.005')).toBeNull();
    expect(parseAmountToDecimalString(10.005)).toBeNull();
  });

  it('rejects values that are not numbers', () => {
    expect(parseAmountToDecimalString('abc')).toBeNull();
    expect(parseAmountToDecimalString('')).toBeNull();
    expect(parseAmountToDecimalString(null)).toBeNull();
    expect(parseAmountToDecimalString(undefined)).toBeNull();
    expect(parseAmountToDecimalString({})).toBeNull();
    expect(parseAmountToDecimalString(Number.NaN)).toBeNull();
    expect(parseAmountToDecimalString(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it('rejects values that exceed the NUMERIC(14,2) range', () => {
    expect(parseAmountToDecimalString('9999999999999.00')).toBeNull();
  });
});

describe('normalizeDecimalString', () => {
  it('pads the fraction to two digits', () => {
    expect(normalizeDecimalString('10')).toBe('10.00');
    expect(normalizeDecimalString('10.4')).toBe('10.40');
  });

  it('rejects malformed values', () => {
    expect(normalizeDecimalString('1.234')).toBeNull();
    expect(normalizeDecimalString('-1')).toBeNull();
    expect(normalizeDecimalString('abc')).toBeNull();
  });
});

describe('minor unit arithmetic', () => {
  it('converts to and from paise without rounding errors', () => {
    expect(toMinorUnits('1500.50')).toBe(150050);
    expect(fromMinorUnits(150050)).toBe('1500.50');
    expect(fromMinorUnits(toMinorUnits('0.01'))).toBe('0.01');
    expect(fromMinorUnits(toMinorUnits('999999999999.99'))).toBe('999999999999.99');
  });

  it('adds exactly', () => {
    expect(addDecimalStrings('0.10', '0.20')).toBe('0.30');
    expect(addDecimalStrings('1500.50', '500.25')).toBe('2000.75');
    expect(addDecimalStrings('0.01', '0.02')).toBe('0.03');
  });
});
