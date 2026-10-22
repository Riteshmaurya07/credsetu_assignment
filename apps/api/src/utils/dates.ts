/**
 * Date helpers.
 *
 * All due dates are calendar dates (`YYYY-MM-DD`) and are compared as such, so
 * a loan is never affected by clock-time or server timezone drift. "Today" is
 * resolved in the configured application timezone (`APP_TIMEZONE`, default
 * `Asia/Kolkata`) and passed into SQL queries as an explicit date so the
 * database and the API always agree.
 */

export type DateString = string; // YYYY-MM-DD

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** True when the value is a syntactically valid `YYYY-MM-DD` calendar date. */
export function isValidDateString(value: unknown): value is DateString {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map((part) => Number.parseInt(part, 10)) as [
    number,
    number,
    number,
  ];
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const asDate = new Date(Date.UTC(year, month - 1, day));
  return (
    asDate.getUTCFullYear() === year &&
    asDate.getUTCMonth() === month - 1 &&
    asDate.getUTCDate() === day
  );
}

/**
 * Returns the calendar date of `now` inside `timeZone` as `YYYY-MM-DD`.
 * `en-CA` formats as ISO-like year-month-day which sorts lexicographically.
 */
export function todayDateString(now: Date, timeZone: string): DateString {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now);
}

/**
 * A loan is overdue when it is still pending and its due date is strictly
 * before `today`. A loan due today is NOT overdue.
 */
export function isOverdue(dueDate: DateString, today: DateString, status: string): boolean {
  if (status !== 'pending') return false;
  return dueDate < today;
}

/** Whole days between two calendar dates (`to - from`). */
export function daysBetween(from: DateString, to: DateString): number {
  const fromMs = Date.parse(`${from}T00:00:00Z`);
  const toMs = Date.parse(`${to}T00:00:00Z`);
  return Math.round((toMs - fromMs) / 86_400_000);
}
