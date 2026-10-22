import { describe, expect, it } from 'vitest';
import {
  daysBetween,
  describeDueDate,
  formatAmountPlain,
  formatCurrency,
  formatDate,
  formatPhone,
  groupIndianDigits,
  maskPhone,
  parseDateString,
  toDateString,
  todayDateString,
} from '../format';

describe('groupIndianDigits', () => {
  it('keeps short numbers untouched', () => {
    expect(groupIndianDigits('12')).toBe('12');
    expect(groupIndianDigits('999')).toBe('999');
  });

  it('groups thousands', () => {
    expect(groupIndianDigits('1234')).toBe('1,234');
  });

  it('groups lakhs using the Indian numbering system', () => {
    expect(groupIndianDigits('123456')).toBe('1,23,456');
    expect(groupIndianDigits('12345678')).toBe('1,23,45,678');
  });
});

describe('formatCurrency', () => {
  it('formats whole amounts with two decimals', () => {
    expect(formatCurrency('1500')).toBe('₹1,500.00');
  });

  it('keeps the exact decimals of the API value', () => {
    expect(formatCurrency('1500.5')).toBe('₹1,500.50');
    expect(formatCurrency('0.09')).toBe('₹0.09');
  });

  it('groups lakhs', () => {
    expect(formatCurrency('123456.78')).toBe('₹1,23,456.78');
  });

  it('does not lose precision on large amounts', () => {
    expect(formatCurrency('999999999999.99')).toBe('₹9,99,99,99,99,999.99');
  });

  it('accepts numbers as well', () => {
    expect(formatCurrency(1500.5)).toBe('₹1,500.50');
  });

  it('falls back to the raw value for unexpected input', () => {
    expect(formatCurrency('abc')).toBe('₹abc');
  });
});

describe('formatAmountPlain', () => {
  it('normalises to two decimals', () => {
    expect(formatAmountPlain('1500')).toBe('1500.00');
    expect(formatAmountPlain('12.5')).toBe('12.50');
  });
});

describe('formatDate', () => {
  it('formats an ISO date', () => {
    expect(formatDate('2026-06-15')).toBe('15 Jun 2026');
  });

  it('accepts an ISO timestamp', () => {
    expect(formatDate('2026-01-02T10:00:00.000Z')).toBe('2 Jan 2026');
  });
});

describe('date helpers', () => {
  it('builds a calendar date from a Date', () => {
    expect(toDateString(new Date(2026, 5, 15))).toBe('2026-06-15');
  });

  it('reads today from a reference date', () => {
    expect(todayDateString(new Date(2026, 0, 9))).toBe('2026-01-09');
  });

  it('parses a calendar date at local midnight', () => {
    const parsed = parseDateString('2026-06-15');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(5);
    expect(parsed.getDate()).toBe(15);
  });

  it('counts whole days between two dates', () => {
    expect(daysBetween('2026-06-15', '2026-06-18')).toBe(3);
    expect(daysBetween('2026-06-18', '2026-06-15')).toBe(-3);
    expect(daysBetween('2026-06-15', '2026-06-15')).toBe(0);
  });
});

describe('describeDueDate', () => {
  const today = new Date(2026, 5, 15);

  it('reports a loan due today as due today', () => {
    expect(describeDueDate('2026-06-15', today)).toBe('Due today');
  });

  it('reports a past due date as overdue', () => {
    expect(describeDueDate('2026-06-12', today)).toBe('Overdue by 3 days');
  });

  it('reports a single overdue day without a plural', () => {
    expect(describeDueDate('2026-06-14', today)).toBe('Overdue by 1 day');
  });

  it('reports a future due date', () => {
    expect(describeDueDate('2026-06-20', today)).toBe('Due on 20 Jun 2026');
  });
});

describe('phone helpers', () => {
  it('formats an international number for display', () => {
    expect(formatPhone('+919876543210')).toBe('+91 98765 43210');
  });

  it('resolves the longest matching dial code', () => {
    expect(formatPhone('+971501234567')).toBe('+971 50123 4567');
    expect(formatPhone('+447700900123')).toBe('+44 77009 00123');
  });

  it('returns the raw value when the shape is unexpected', () => {
    expect(formatPhone('9876543210')).toBe('9876543210');
  });

  it('masks all but the last four digits', () => {
    expect(maskPhone('+919876543210')).toBe('•••••••••3210');
  });
});
