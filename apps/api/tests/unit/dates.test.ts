import { describe, expect, it } from 'vitest';
import { daysBetween, isOverdue, isValidDateString, todayDateString } from '../../src/utils/dates.js';

describe('isValidDateString', () => {
  it('accepts a valid calendar date', () => {
    expect(isValidDateString('2026-12-01')).toBe(true);
    expect(isValidDateString('2024-02-29')).toBe(true);
  });

  it('rejects impossible dates', () => {
    expect(isValidDateString('2026-13-01')).toBe(false);
    expect(isValidDateString('2026-02-30')).toBe(false);
    expect(isValidDateString('2023-02-29')).toBe(false);
    expect(isValidDateString('2026-1-1')).toBe(false);
    expect(isValidDateString('not-a-date')).toBe(false);
    expect(isValidDateString('')).toBe(false);
    expect(isValidDateString(20260101)).toBe(false);
  });
});

describe('isOverdue', () => {
  const today = '2026-10-22';

  it('is overdue when a pending loan was due in the past', () => {
    expect(isOverdue('2026-10-21', today, 'pending')).toBe(true);
    expect(isOverdue('2020-01-01', today, 'pending')).toBe(true);
  });

  it('is NOT overdue when the loan is due today', () => {
    expect(isOverdue('2026-10-22', today, 'pending')).toBe(false);
  });

  it('is NOT overdue for a future due date', () => {
    expect(isOverdue('2026-10-23', today, 'pending')).toBe(false);
  });

  it('is never overdue once repaid', () => {
    expect(isOverdue('2020-01-01', today, 'repaid')).toBe(false);
  });
});

describe('daysBetween', () => {
  it('counts whole calendar days', () => {
    expect(daysBetween('2026-10-17', '2026-10-22')).toBe(5);
    expect(daysBetween('2026-10-22', '2026-10-22')).toBe(0);
    expect(daysBetween('2026-10-22', '2026-10-23')).toBe(1);
  });
});

describe('todayDateString', () => {
  it('resolves the calendar date inside the requested timezone', () => {
    // 2026-10-21T20:00:00Z is already the 22nd in Asia/Kolkata (+05:30).
    const instant = new Date('2026-10-21T20:00:00.000Z');
    expect(todayDateString(instant, 'Asia/Kolkata')).toBe('2026-10-22');
    expect(todayDateString(instant, 'UTC')).toBe('2026-10-21');
  });

  it('returns a sortable YYYY-MM-DD string', () => {
    expect(todayDateString(new Date('2026-01-05T00:00:00Z'), 'UTC')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
