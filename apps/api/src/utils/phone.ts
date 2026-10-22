/**
 * Phone number normalisation.
 *
 * Every phone number is stored in a canonical E.164-like form (`+919876543210`)
 * so that the unique index on `users.phone` cannot be bypassed by formatting
 * differences (`+91 98765 43210` and `919876543210` are the same user).
 */

export interface CountrySpec {
  /** ISO 3166-1 alpha-2 code. */
  iso: string;
  /** Human readable country name. */
  name: string;
  /** International dialling code without the leading `+`. */
  dialCode: string;
  /** Accepted length(s) of the national significant number. */
  nationalLength: number | [number, number];
}

export const SUPPORTED_COUNTRIES: CountrySpec[] = [
  { iso: 'IN', name: 'India', dialCode: '91', nationalLength: 10 },
  { iso: 'US', name: 'United States', dialCode: '1', nationalLength: 10 },
  { iso: 'CA', name: 'Canada', dialCode: '1', nationalLength: 10 },
  { iso: 'GB', name: 'United Kingdom', dialCode: '44', nationalLength: 10 },
  { iso: 'AE', name: 'United Arab Emirates', dialCode: '971', nationalLength: 9 },
  { iso: 'AU', name: 'Australia', dialCode: '61', nationalLength: 9 },
  { iso: 'SG', name: 'Singapore', dialCode: '65', nationalLength: 8 },
  { iso: 'DE', name: 'Germany', dialCode: '49', nationalLength: [10, 11] },
];

export const DEFAULT_COUNTRY_ISO = 'IN';

export type PhoneResult =
  | { ok: true; e164: string; countryIso: string; dialCode: string; nationalNumber: string }
  | { ok: false; error: string };

function nationalLengthRange(spec: CountrySpec): [number, number] {
  return typeof spec.nationalLength === 'number'
    ? [spec.nationalLength, spec.nationalLength]
    : spec.nationalLength;
}

function isValidNational(spec: CountrySpec, national: string): boolean {
  const [min, max] = nationalLengthRange(spec);
  if (national.length < min || national.length > max) return false;
  if (national.startsWith('0')) return false;
  return /^\d+$/.test(national);
}

/**
 * Normalises a user supplied phone number into a canonical `+<dial><national>`
 * string.
 *
 * Rules:
 *  - Spaces, dashes, dots, parentheses and slashes are ignored.
 *  - A leading `+` forces international interpretation.
 *  - A number that starts with a known dial code and has a valid national
 *    remainder is treated as international (`919876543210`).
 *  - Anything else is treated as a national number for `defaultCountryIso`,
 *    with a single leading `0` removed.
 */
export function normalizePhone(
  raw: unknown,
  defaultCountryIso: string = DEFAULT_COUNTRY_ISO,
): PhoneResult {
  if (typeof raw !== 'string') {
    return { ok: false, error: 'Phone number must be a string.' };
  }
  const cleaned = raw.replace(/[\s\-()./\u00A0\u2007\u202F]/g, '');
  if (cleaned.length === 0) {
    return { ok: false, error: 'Phone number is required.' };
  }
  if ((cleaned.match(/\+/g) ?? []).length > 1) {
    return { ok: false, error: 'Phone number contains an invalid "+" character.' };
  }
  const hasPlus = cleaned.startsWith('+');
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length === 0) {
    return { ok: false, error: 'Phone number must contain digits.' };
  }
  if (hasPlus) {
    const match = findInternationalMatch(digits);
    if (!match) {
      return { ok: false, error: 'Country code is not supported.' };
    }
    return match;
  }

  const international = findInternationalMatch(digits);
  if (international) return international;

  const fallbackSpec =
    SUPPORTED_COUNTRIES.find((country) => country.iso === defaultCountryIso) ??
    (SUPPORTED_COUNTRIES[0] as CountrySpec);
  const national = digits.replace(/^0+/, '');
  if (!isValidNational(fallbackSpec, national)) {
    const [min, max] = nationalLengthRange(fallbackSpec);
    return {
      ok: false,
      error:
        min === max
          ? `Phone number must be ${min} digits for ${fallbackSpec.name}.`
          : `Phone number must be between ${min} and ${max} digits for ${fallbackSpec.name}.`,
    };
  }
  return {
    ok: true,
    e164: `+${fallbackSpec.dialCode}${national}`,
    countryIso: fallbackSpec.iso,
    dialCode: fallbackSpec.dialCode,
    nationalNumber: national,
  };
}

/**
 * Finds the longest supported dial code that prefixes `digits` and leaves a
 * valid national number behind. Longest-prefix matching keeps `+971...`
 * (UAE) from being mis-read as `+97...`, while `+919876543210` correctly
 * resolves to India.
 */
function findInternationalMatch(digits: string): PhoneResult | null {
  const candidates = [...SUPPORTED_COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  for (const spec of candidates) {
    if (!digits.startsWith(spec.dialCode)) continue;
    const national = digits.slice(spec.dialCode.length);
    if (!isValidNational(spec, national)) continue;
    return {
      ok: true,
      e164: `+${spec.dialCode}${national}`,
      countryIso: spec.iso,
      dialCode: spec.dialCode,
      nationalNumber: national,
    };
  }
  return null;
}

/** Renders a canonical phone number for display, e.g. `+91 98765 43210`. */
export function formatPhoneForDisplay(e164: string): string {
  if (!e164.startsWith('+')) return e164;
  const digits = e164.slice(1);
  const spec = [...SUPPORTED_COUNTRIES]
    .sort((a, b) => b.dialCode.length - a.dialCode.length)
    .find((country) => digits.startsWith(country.dialCode));
  if (!spec) return e164;
  const national = digits.slice(spec.dialCode.length);
  const grouped = national.replace(/(\d{5})(\d+)$/, '$1 $2');
  return `+${spec.dialCode} ${grouped}`;
}
