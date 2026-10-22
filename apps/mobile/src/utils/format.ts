/**
 * Formatting helpers.
 *
 * Money is handled as an exact decimal string end to end - it is never
 * converted into a float, so `₹1,500.50` is always exact.
 */

import { COUNTRIES } from '../types/api';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/**
 * Groups the integer part using the Indian numbering system
 * (1,00,000 and 12,34,567).
 */
export function groupIndianDigits(digits: string): string {
  if (digits.length <= 3) return digits;
  const lastThree = digits.slice(-3);
  const rest = digits.slice(0, -3);
  return `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${lastThree}`;
}

/**
 * Formats a decimal amount as Indian Rupees, e.g. `₹12,34,567.89`.
 * Accepts the exact decimal string returned by the API.
 */
export function formatCurrency(amount: string | number): string {
  const normalized = typeof amount === 'number' ? String(amount) : amount.trim();
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) return `₹${normalized}`;

  const sign = match[1] ?? '';
  const whole = match[2] ?? '0';
  const fraction = (match[3] ?? '').padEnd(2, '0');
  return `${sign}₹${groupIndianDigits(whole)}.${fraction}`;
}

/** Formats an amount without the currency symbol (used for input fields). */
export function formatAmountPlain(amount: string): string {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(amount.trim());
  if (!match) return amount;
  const fraction = (match[3] ?? '').padEnd(2, '0');
  return `${match[2]}.${fraction}`;
}

/** Formats a `YYYY-MM-DD` calendar date as `15 Jun 2026`. */
export function formatDate(dateString: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateString);
  if (!match) return dateString;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const month = MONTHS[monthIndex] ?? match[2];
  return `${day} ${month} ${year}`;
}

/** Today's calendar date in the device timezone as `YYYY-MM-DD`. */
export function todayDateString(reference: Date = new Date()): string {
  const year = reference.getFullYear();
  const month = String(reference.getMonth() + 1).padStart(2, '0');
  const day = String(reference.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Converts a `Date` into the `YYYY-MM-DD` string the API expects. */
export function toDateString(date: Date): string {
  return todayDateString(date);
}

/** Converts a `YYYY-MM-DD` string into a local `Date` at midnight. */
export function parseDateString(dateString: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (!match) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** Whole days between two `YYYY-MM-DD` calendar dates. */
export function daysBetween(fromDate: string, toDate: string): number {
  const from = parseDateString(fromDate).getTime();
  const to = parseDateString(toDate).getTime();
  return Math.round((to - from) / 86_400_000);
}

/**
 * Human readable due date, e.g. `Overdue by 5 days`, `Due today` or
 * `Due on 15 Jun 2026`.
 */
export function describeDueDate(dueDate: string, reference: Date = new Date()): string {
  const today = todayDateString(reference);
  const diff = daysBetween(dueDate, today);
  if (diff > 0) return `Overdue by ${diff} day${diff === 1 ? '' : 's'}`;
  if (diff === 0) return 'Due today';
  return `Due on ${formatDate(dueDate)}`;
}

/**
 * Formats the masked phone number shown in the app, e.g. `+91 98765 43210`.
 *
 * The dial code is resolved with longest prefix matching so that `+971...`
 * (UAE) is never read as `+97...` and `+91...` stays India.
 */
export function formatPhone(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed.startsWith('+')) return phone;
  const digits = trimmed.slice(1);
  if (!/^\d+$/.test(digits)) return phone;

  const dialCode = [...COUNTRIES]
    .sort((a, b) => b.dialCode.length - a.dialCode.length)
    .map((country) => country.dialCode)
    .find((code) => digits.startsWith(code) && digits.length > code.length);

  if (!dialCode) return phone;

  const national = digits.slice(dialCode.length);
  const grouped = national.replace(/(\d{5})(\d+)$/, '$1 $2');
  return `+${dialCode} ${grouped}`;
}

/** Masks all but the last two digits of a phone number. */
export function maskPhone(phone: string): string {
  if (phone.length <= 4) return phone;
  return `${'•'.repeat(phone.length - 4)}${phone.slice(-4)}`;
}
