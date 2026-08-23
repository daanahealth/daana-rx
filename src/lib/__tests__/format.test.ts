import {
  formatDate,
  formatDateTime,
  formatMonthYear,
  toISODate,
  daysUntil,
  expiryTone,
  expiryHint,
  formatAge,
  formatCount,
  pluralize,
} from '../format';

describe('formatDate (MM/DD/YYYY everywhere — spec B3/T10)', () => {
  it('renders a date-only ISO string as a local calendar date', () => {
    expect(formatDate('2027-03-07')).toBe('03/07/2027');
  });
  it('renders a full ISO timestamp', () => {
    expect(formatDate(new Date(2026, 11, 25, 14, 5))).toBe('12/25/2026');
  });
  it('zero-pads month and day and keeps a four-digit year', () => {
    expect(formatDate(new Date(2026, 0, 2))).toBe('01/02/2026');
  });
  it('returns the empty marker for missing or invalid input', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('')).toBe('—');
    expect(formatDate('not a date')).toBe('—');
  });
  it('is unambiguous: 3 July is never 03/07', () => {
    expect(formatDate('2027-07-03')).toBe('07/03/2027');
    expect(formatDate('2027-03-07')).not.toBe(formatDate('2027-07-03'));
  });
});

describe('formatDateTime / formatMonthYear / toISODate', () => {
  it('appends a 12-hour time', () => {
    expect(formatDateTime(new Date(2026, 7, 23, 0, 7))).toBe('08/23/2026, 12:07 AM');
    expect(formatDateTime(new Date(2026, 7, 23, 13, 30))).toBe('08/23/2026, 1:30 PM');
  });
  it('formats month/year for labels', () => {
    expect(formatMonthYear('2027-03-07')).toBe('03/2027');
  });
  it('round-trips to ISO date for inputs', () => {
    expect(toISODate('2027-03-07')).toBe('2027-03-07');
    expect(toISODate(null)).toBe('');
  });
});

describe('expiry rule', () => {
  const now = new Date(2026, 7, 23); // 08/23/2026

  it('counts whole days', () => {
    expect(daysUntil('2026-08-23', now)).toBe(0);
    expect(daysUntil('2026-08-24', now)).toBe(1);
    expect(daysUntil('2026-08-22', now)).toBe(-1);
    expect(daysUntil(null, now)).toBeNull();
  });
  it('is neutral beyond 30 days, warn within 30, danger once past', () => {
    expect(expiryTone('2026-12-01', now)).toBe('ok');
    expect(expiryTone('2026-09-22', now)).toBe('soon');
    expect(expiryTone('2026-09-23', now)).toBe('ok');
    expect(expiryTone('2026-08-22', now)).toBe('expired');
    expect(expiryTone(undefined, now)).toBe('unknown');
  });
  it('produces a short hint', () => {
    expect(expiryHint('2026-08-22', now)).toBe('expired');
    expect(expiryHint('2026-08-23', now)).toBe('today');
    expect(expiryHint('2026-09-04', now)).toBe('in 12 d');
    expect(expiryHint('2027-01-01', now)).toBeNull();
  });
});

describe('ages and counts', () => {
  it('formats relative age', () => {
    const now = new Date(2026, 7, 23, 12, 0, 0);
    expect(formatAge(new Date(2026, 7, 23, 11, 59, 40), now)).toBe('just now');
    expect(formatAge(new Date(2026, 7, 23, 11, 45), now)).toBe('15 min');
    expect(formatAge(new Date(2026, 7, 23, 9, 0), now)).toBe('3 h');
    expect(formatAge(new Date(2026, 7, 20, 12, 0), now)).toBe('3 d');
  });
  it('groups thousands and pluralises', () => {
    expect(formatCount(1805)).toBe('1,805');
    expect(formatCount(null)).toBe('—');
    expect(pluralize(1, 'unit')).toBe('1 unit');
    expect(pluralize(12, 'unit')).toBe('12 units');
  });
});
