/** Scan mappers — legacy wire rows → the view models the screen renders. */
import type { LegacyTransactionRow, LegacyUnitRow } from './api';

export interface ScanUnit {
  unitId: string;
  medicationName: string;
  genericName: string | null;
  strength: string | null;
  form: string | null;
  source: string | null;
  expiryDate: string | null;
  availableQuantity: number;
  totalQuantity: number;
  notes: string | null;
}

export interface ScanTransaction {
  id: string;
  timestamp: string;
  type: string;
  quantity: number;
  notes: string | null;
}

function text(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
}

export function toScanUnit(row: LegacyUnitRow): ScanUnit {
  const strength = text(row.drug?.strength);
  const strengthUnit = text(row.drug?.strengthUnit);
  return {
    unitId: row.unitId,
    medicationName: row.drug?.medicationName ?? '—',
    genericName: text(row.drug?.genericName),
    strength: strength ? [strength, strengthUnit].filter(Boolean).join(' ') : null,
    form: text(row.drug?.form),
    source: text(row.lot?.source),
    expiryDate: text(row.expiryDate),
    availableQuantity: Number(row.availableQuantity ?? 0),
    totalQuantity: Number(row.totalQuantity ?? 0),
    notes: text(row.optionalNotes),
  };
}

export function toScanTransaction(row: LegacyTransactionRow): ScanTransaction {
  return {
    id: row.transactionId,
    timestamp: row.timestamp,
    type: row.type,
    quantity: Number(row.quantity ?? 0),
    notes: text(row.notes),
  };
}

/** "check_in" → "Check in". Transaction types are not in the status vocabulary. */
export function transactionTypeLabel(type: string): string {
  const words = type.replace(/_/g, ' ').trim();
  return words ? words[0].toUpperCase() + words.slice(1) : '—';
}

/** A 36-char input is a unit UUID → direct lookup; anything ≥3 chars searches. */
export function classifyLookupInput(raw: string): 'unit' | 'search' | 'none' {
  const q = raw.trim();
  if (q.length === 36) return 'unit';
  if (q.length >= 3) return 'search';
  return 'none';
}
