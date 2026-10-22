import { describe, expect, it } from 'vitest';
import {
  getCountryRule,
  onlyDigits,
  toInternationalPhone,
  validateAmount,
  validateFriendName,
  validateOtp,
  validatePhone,
} from '../validation';

describe('onlyDigits', () => {
  it('strips everything that is not a digit', () => {
    expect(onlyDigits('+91 98765-43210')).toBe('919876543210');
  });
});

describe('getCountryRule', () => {
  it('returns the rule of the given country', () => {
    expect(getCountryRule('IN')).toEqual({ dialCode: '91', nationalLength: 10 });
  });

  it('falls back to the first country for unknown codes', () => {
    expect(getCountryRule('ZZ')).toEqual({ dialCode: '91', nationalLength: 10 });
  });
});

describe('validatePhone', () => {
  it('requires a value', () => {
    expect(validatePhone('', 'IN')).toBe('Enter your phone number.');
  });

  it('requires the exact national length', () => {
    expect(validatePhone('98765', 'IN')).toBe('Enter the 10 digit phone number.');
    expect(validatePhone('98765432101', 'IN')).toBe(
      'The phone number must be exactly 10 digits.',
    );
  });

  it('rejects a leading zero', () => {
    expect(validatePhone('0987654321', 'IN')).toBe('Phone numbers cannot start with 0.');
  });

  it('accepts a valid number', () => {
    expect(validatePhone('9876543210', 'IN')).toBeNull();
  });

  it('uses the rule of the selected country', () => {
    expect(validatePhone('12345678', 'SG')).toBeNull();
    expect(validatePhone('1234567', 'SG')).toBe('Enter the 8 digit phone number.');
    expect(validatePhone('123456789', 'SG')).toBe(
      'The phone number must be exactly 8 digits.',
    );
  });
});

describe('toInternationalPhone', () => {
  it('prefixes the national number with the dial code', () => {
    expect(toInternationalPhone('9876543210', 'IN')).toBe('+919876543210');
  });

  it('removes formatting characters', () => {
    expect(toInternationalPhone('98765 43210', 'IN')).toBe('+919876543210');
  });
});

describe('validateFriendName', () => {
  it('requires a name', () => {
    expect(validateFriendName('   ')).toBe("Enter your friend's name.");
  });

  it('rejects very long names', () => {
    expect(validateFriendName('a'.repeat(81))).toBe('Friend name must be 80 characters or fewer.');
  });

  it('accepts a normal name', () => {
    expect(validateFriendName('Rahul')).toBeNull();
  });
});

describe('validateAmount', () => {
  it('requires a value', () => {
    expect(validateAmount('').error).toBe('Enter the amount you lent.');
  });

  it('rejects more than two decimals', () => {
    expect(validateAmount('10.999').error).toBe(
      'Enter a valid amount with up to 2 decimal places.',
    );
  });

  it('rejects negative and non numeric input', () => {
    expect(validateAmount('-10').error).toBeTruthy();
    expect(validateAmount('ten').error).toBeTruthy();
  });

  it('rejects zero', () => {
    expect(validateAmount('0').error).toBe('The amount must be greater than zero.');
    expect(validateAmount('0.00').error).toBe('The amount must be greater than zero.');
  });

  it('normalises the amount to an exact decimal string', () => {
    expect(validateAmount('1500')).toEqual({ error: null, amount: '1500.00' });
    expect(validateAmount('1500.5')).toEqual({ error: null, amount: '1500.50' });
    expect(validateAmount(' 12.34 ')).toEqual({ error: null, amount: '12.34' });
  });

  it('removes leading zeros', () => {
    expect(validateAmount('007.5').amount).toBe('7.50');
  });
});

describe('validateOtp', () => {
  it('requires a code', () => {
    expect(validateOtp('')).toBe('Enter the 6-digit code.');
  });

  it('reports how many digits are missing', () => {
    expect(validateOtp('123')).toBe('The code has 3 of 6 digits.');
  });

  it('accepts a complete code', () => {
    expect(validateOtp('123456')).toBeNull();
  });
});
