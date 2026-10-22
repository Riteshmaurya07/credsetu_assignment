/**
 * Injectable clock.
 *
 * Every time-dependent code path reads the current time through `now()` so
 * tests can freeze time and assert deterministic behaviour (OTP expiry, loan
 * due dates, rate limit windows).
 */

let provider: (() => Date) | null = null;

export function now(): Date {
  return provider ? provider() : new Date();
}

/** Installs a deterministic clock (tests only). */
export function setClock(fn: () => Date): void {
  provider = fn;
}

/** Restores the real system clock. */
export function resetClock(): void {
  provider = null;
}

/** Advances a frozen clock by the given number of milliseconds. */
export function advanceClock(milliseconds: number): void {
  const current = now().getTime();
  setClock(() => new Date(current + milliseconds));
}
