import { COUNTRIES } from '../types/api';

/**
 * Client side validation.
 *
 * The server is always the authority - these checks only make the form feel
 * responsive and give immediate, friendly feedback.
 */

export interface CountryRule {
  dialCode: string;
  nationalLength: number;
}

export function getCountryRule(iso: string): CountryRule {
  const country = COUNTRIES.find((item) => item.iso === iso) ?? COUNTRIES[0];
  return { dialCode: country?.dialCode ?? '91', nationalLength: country?.nationalLength ?? 10 };
}

/** Removes everything that is not a digit. */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Validates the national part of a phone number.
 * Returns an error message or `null` when the number is valid.
 */
export function validatePhone(value: string, iso: string): string | null {
  const digits = onlyDigits(value);
  const rule = getCountryRule(iso);
  if (digits.length === 0) return 'Enter your phone number.';
  if (digits.length < rule.nationalLength) {
    return `Enter the ${rule.nationalLength} digit phone number.`;
  }
  if (digits.length > rule.nationalLength) {
    return `The phone number must be exactly ${rule.nationalLength} digits.`;
  }
  if (digits.startsWith('0')) return 'Phone numbers cannot start with 0.';
  return null;
}

/** Builds the international phone number that is sent to the API. */
export function toInternationalPhone(value: string, iso: string): string {
  const rule = getCountryRule(iso);
  return `+${rule.dialCode}${onlyDigits(value)}`;
}

/** Validates the friend name of a loan. */
export function validateFriendName(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return "Enter your friend's name.";
  if (trimmed.length > 80) return "Friend name must be 80 characters or fewer.";
  return null;
}

/**
 * Validates the amount and returns the canonical decimal string.
 * The server enforces the same rules - this is only for instant feedback.
 */
export function validateAmount(value: string): { error: string | null; amount: string | null } {
  const trimmed = value.trim();
  if (trimmed.length === 0) return { error: 'Enter the amount you lent.', amount: null };
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return { error: 'Enter a valid amount with up to 2 decimal places.', amount: null };
  }
  const [whole = '0', fraction = ''] = trimmed.split('.');
  const normalizedWhole = whole.replace(/^0+(?=\d)/, '');
  if (normalizedWhole.length > 12) {
    return { error: 'That amount is too large.', amount: null };
  }
  const canonicalFraction = fraction.padEnd(2, '0');
  const canonical = `${normalizedWhole}.${canonicalFraction}`;
  if (canonical === '0.00') return { error: 'The amount must be greater than zero.', amount: null };
  return { error: null, amount: canonical };
}

/** Validates the six digit OTP. */
export function validateOtp(value: string): string | null {
  const digits = onlyDigits(value);
  if (digits.length === 0) return 'Enter the 6-digit code.';
  if (digits.length < 6) return `The code has ${digits.length} of 6 digits.`;
  return null;
}
