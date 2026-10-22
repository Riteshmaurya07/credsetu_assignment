/**
 * Exact decimal helpers for monetary values.
 *
 * Money is never represented as a JavaScript float in this codebase.
 * Amounts travel over the wire as decimal strings ("1500.00") and are
 * persisted in PostgreSQL as `NUMERIC(14,2)`. Any arithmetic is performed on
 * integer minor units (paise) so no rounding error can accumulate.
 */

export type DecimalString = string;

/** Maximum number of integer digits accepted (matches NUMERIC(14,2)). */
export const MAX_AMOUNT_INTEGER_DIGITS = 12;

const DECIMAL_PATTERN = new RegExp(`^\\d{1,${MAX_AMOUNT_INTEGER_DIGITS}}(\\.\\d{1,2})?$`);

/**
 * Parses a user supplied amount into a canonical decimal string with exactly
 * two fractional digits, e.g. `"1500"` -> `"1500.00"`.
 *
 * Returns `null` when the value is not a valid, positive, at-most-2-decimal
 * amount. Numbers are converted through their shortest round-trip
 * representation so `1500.5` never becomes `1500.4999...`.
 */
export function parseAmountToDecimalString(value: unknown): DecimalString | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    if (value < 0) return null;
    const plain = String(value);
    // Exponential notation (or values we cannot represent exactly) are rejected.
    if (plain.includes('e') || plain.includes('E')) return null;
    return toCanonicalAmount(plain);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;
    if (trimmed.includes('e') || trimmed.includes('E')) return null;
    if (trimmed.startsWith('+')) return toCanonicalAmount(trimmed.slice(1));
    return toCanonicalAmount(trimmed);
  }

  return null;
}

/**
 * Canonicalises a plain decimal amount and rejects the non-positive values
 * (zero and below) that a loan may never have.
 */
function toCanonicalAmount(value: string): DecimalString | null {
  const normalized = normalizeDecimalString(value);
  if (normalized === null) return null;
  if (toMinorUnits(normalized) <= 0) return null;
  return normalized;
}

/**
 * Validates and canonicalises a decimal string that is already known to be a
 * plain decimal (no exponent). Returns `null` when invalid.
 */
export function normalizeDecimalString(value: string): DecimalString | null {
  const trimmed = value.trim();
  if (!DECIMAL_PATTERN.test(trimmed)) return null;
  const [whole = '0', fraction = ''] = trimmed.split('.');
  const canonicalWhole = whole.replace(/^0+(?=\d)/, '');
  const canonicalFraction = fraction.padEnd(2, '0');
  return `${canonicalWhole}.${canonicalFraction}`;
}

/**
 * Converts a canonical decimal string into integer minor units (paise).
 * Safe for every amount accepted by {@link parseAmountToDecimalString}
 * because the maximum value is below `Number.MAX_SAFE_INTEGER`.
 */
export function toMinorUnits(value: DecimalString): number {
  const [whole = '0', fraction = '00'] = value.split('.');
  const paise = Number.parseInt(fraction.padEnd(2, '0').slice(0, 2), 10);
  return Number.parseInt(whole, 10) * 100 + paise;
}

/** Converts integer minor units (paise) back into a canonical decimal string. */
export function fromMinorUnits(minorUnits: number): DecimalString {
  const sign = minorUnits < 0 ? '-' : '';
  const absolute = Math.abs(Math.trunc(minorUnits));
  const whole = Math.floor(absolute / 100);
  const paise = absolute % 100;
  return `${sign}${whole}.${String(paise).padStart(2, '0')}`;
}

/** Adds two canonical decimal strings exactly. */
export function addDecimalStrings(a: DecimalString, b: DecimalString): DecimalString {
  return fromMinorUnits(toMinorUnits(a) + toMinorUnits(b));
}

/** Formats a canonical decimal string for display (always two decimals). */
export function formatDecimalString(value: DecimalString): DecimalString {
  return normalizeDecimalString(value) ?? '0.00';
}
