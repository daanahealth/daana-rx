/**
 * Formatting — the single source for how dates and numbers render.
 *
 * Dates are a patient-safety surface (Provider spec B3 / T10): the clinic is
 * US and every date in the product renders as MM/DD/YYYY with a four-digit
 * year, regardless of the browser locale. Do not call toLocaleDateString()
 * anywhere in UI code; import from here (or render <DateText>).
 */

export const EMPTY = '—';

type DateInput = string | number | Date | null | undefined;

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') return null;
  // Date-only ISO strings (YYYY-MM-DD) are parsed as UTC by the Date
  // constructor, which shifts them a day back in US timezones. Parse them as
  // local calendar dates instead.
  if (typeof value === 'string') {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** MM/DD/YYYY. Invalid or missing → "—". */
export function formatDate(value: DateInput): string {
  const d = toDate(value);
  if (!d) return EMPTY;
  return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}/${d.getFullYear()}`;
}

/** MM/DD/YYYY, h:mm AM. Invalid or missing → "—". */
export function formatDateTime(value: DateInput): string {
  const d = toDate(value);
  if (!d) return EMPTY;
  const h24 = d.getHours();
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const ampm = h24 < 12 ? 'AM' : 'PM';
  return `${formatDate(d)}, ${h12}:${pad2(d.getMinutes())} ${ampm}`;
}

/** MM/YYYY — used on printed labels where space is tight. */
export function formatMonthYear(value: DateInput): string {
  const d = toDate(value);
  if (!d) return EMPTY;
  return `${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** YYYY-MM-DD for <input type="date"> values and API query params. */
export function toISODate(value: DateInput): string {
  const d = toDate(value);
  if (!d) return '';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * Whole days from today (local midnight) until `value`. Negative when past.
 * null when the value is missing/invalid.
 */
export function daysUntil(value: DateInput, now: Date = new Date()): number | null {
  const d = toDate(value);
  if (!d) return null;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

export type ExpiryTone = 'expired' | 'soon' | 'ok' | 'unknown';

/** The Expiry Rule (DESIGN.md): neutral until 30 days out, warn ≤30d, danger once past. */
export function expiryTone(value: DateInput, now: Date = new Date()): ExpiryTone {
  const days = daysUntil(value, now);
  if (days === null) return 'unknown';
  if (days < 0) return 'expired';
  if (days <= 30) return 'soon';
  return 'ok';
}

/** Short human suffix for an expiry: "expired", "today", "in 12 d". */
export function expiryHint(value: DateInput, now: Date = new Date()): string | null {
  const days = daysUntil(value, now);
  if (days === null) return null;
  if (days < 0) return 'expired';
  if (days === 0) return 'today';
  if (days <= 30) return `in ${days} d`;
  return null;
}

/** Relative age for queues/logs: "just now", "4 min", "2 h", "3 d". */
export function formatAge(value: DateInput, now: Date = new Date()): string {
  const d = toDate(value);
  if (!d) return EMPTY;
  const sec = Math.max(0, Math.round((now.getTime() - d.getTime()) / 1000));
  if (sec < 60) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min`;
  const hrs = Math.round(min / 60);
  if (hrs < 24) return `${hrs} h`;
  return `${Math.round(hrs / 24)} d`;
}

/** Thousands-grouped integer. */
export function formatCount(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return EMPTY;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
}

/** "1 unit" / "12 units". */
export function pluralize(n: number, singular: string, plural = `${singular}s`): string {
  return `${formatCount(n)} ${n === 1 ? singular : plural}`;
}
