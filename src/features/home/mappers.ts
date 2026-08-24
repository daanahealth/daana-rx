/**
 * Home — wire → view-model mappers. Pure, unit-tested.
 */
import type { Item } from '@daana-health/inventory-core';
import type { CapacityBin, ExpiringItem, HighUseRow, TransactionLogRow } from '@/lib/api';
import { formatDate } from '@/lib/format';

/** A search hit on the home page: one unit, superadmin-visible (location + code). */
export interface ResultRow {
  id: string;
  name: string;
  dose: string | null;
  form: string | null;
  locationCode: string | null;
  unitCode: string;
  expiryDate: string | null;
  status: Item['status'];
}

interface MedAttributes {
  medication_name?: string;
  dosage?: number | string;
  dosage_unit?: string;
  unit?: string;
  form?: string;
  location_code?: string;
}

export function itemToResult(item: Item): ResultRow {
  const attrs = (item.attributes ?? {}) as MedAttributes;
  const dosageUnit = attrs.dosage_unit ?? attrs.unit ?? '';
  return {
    id: item.id,
    name: attrs.medication_name ?? 'Unknown medication',
    dose: attrs.dosage != null ? `${attrs.dosage} ${dosageUnit}`.trim() : null,
    form: attrs.form ?? null,
    locationCode: attrs.location_code ?? null,
    unitCode: item.unitCode,
    expiryDate: item.expiryDate ?? null,
    status: item.status,
  };
}

/**
 * Derive a friendly first name from a username/email for the greeting
 * ("karol.patel@…" → "Karol"). Empty when nothing usable.
 */
export function friendlyFirstName(raw: string | null | undefined): string {
  if (!raw) return '';
  const head = raw.split(/[._@\s-]/)[0];
  if (!head) return '';
  return head.charAt(0).toUpperCase() + head.slice(1);
}

/** One line in an insight card. */
export interface InsightLine {
  primary: string;
  secondary?: string;
}

export function expiringLines(rows: ExpiringItem[]): InsightLine[] {
  return rows.slice(0, 3).map((r) => ({
    primary: [r.medicationName, r.dosage].filter(Boolean).join(' '),
    secondary: formatDate(r.expiryDate),
  }));
}

export function capacityLines(rows: CapacityBin[]): InsightLine[] {
  return [...rows]
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 3)
    .map((r) => ({ primary: r.name, secondary: `${r.current}/${r.capacity}` }));
}

export function highUseLines(rows: HighUseRow[]): InsightLine[] {
  return rows.slice(0, 3).map((r) => ({
    primary: [r.medicationName, r.dosage].filter(Boolean).join(' '),
    secondary: `${r.checkoutCount}×`,
  }));
}

export function recentCheckoutLines(rows: TransactionLogRow[]): InsightLine[] {
  return rows.slice(0, 3).map((r) => ({
    primary: [r.medicationName ?? 'Unit', r.dosage].filter(Boolean).join(' '),
    secondary: formatDate(r.timestamp),
  }));
}
