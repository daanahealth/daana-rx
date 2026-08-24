// Inventory mappers — wire rows (snake_case, from GET /inventory/items) → the
// camelCase `InventoryRow` view model the screen renders. Pure functions, no
// React, so they are unit-tested directly.

import type { Item, ItemStatus, Transaction } from '@daana-health/inventory-core';
import { isItemStatus } from '@/lib/status';

/**
 * The inventory list endpoint may join in some user/timestamp fields beyond
 * the bare `Item` shape. The extras are optional so the screen renders
 * gracefully whether or not the backend has hydrated them yet.
 */
export interface InventoryRow extends Item {
  dateReceived?: string | null; // ISO timestamptz; may equal createdAt
  checkedInAt?: string | null;
  checkedInByName?: string | null;
  createdByName?: string | null;
  lastEditedByName?: string | null;
  removedByName?: string | null;
  /** Denormalized bin code (e.g. CARDIO1) when locationId resolves. */
  locationCode?: string | null;
}

export interface TransactionRow extends Transaction {
  actorName?: string | null;
}

/** The raw shape the gateway returns for one item. Everything is optional. */
export interface RawInventoryItem {
  id: string;
  type_id?: string;
  status?: string;
  location_id?: string | null;
  location?: { code?: string | null } | null;
  location_code?: string | null;
  expiry_date?: string | null;
  unit_code?: string;
  attributes?: Record<string, unknown> | null;
  created_at?: string;
  created_by?: string | null;
  last_edited_at?: string | null;
  last_edited_by?: string | null;
  removed_at?: string | null;
  removed_by?: string | null;
  removed_reason?: string | null;
  date_received?: string | null;
  checked_in_at?: string | null;
  checked_in_by_name?: string | null;
  created_by_name?: string | null;
  last_edited_by_name?: string | null;
  removed_by_name?: string | null;
}

function str(v: unknown): string | null {
  return v === undefined || v === null ? null : String(v);
}

/** snake_case wire row → InventoryRow. Unknown statuses fall back to 'active'. */
export function mapInventoryRow(raw: RawInventoryItem): InventoryRow {
  const status: ItemStatus = isItemStatus(raw.status) ? raw.status : 'active';
  return {
    id: raw.id,
    typeId: raw.type_id ?? '',
    status,
    locationId: raw.location_id ?? null,
    locationCode: raw.location?.code ?? raw.location_code ?? null,
    expiryDate: raw.expiry_date ?? null,
    unitCode: raw.unit_code ?? '',
    attributes: (raw.attributes ?? {}) as Item['attributes'],
    createdAt: raw.created_at ?? '',
    createdBy: raw.created_by ?? null,
    lastEditedAt: raw.last_edited_at ?? null,
    lastEditedBy: raw.last_edited_by ?? null,
    removedAt: raw.removed_at ?? null,
    removedBy: raw.removed_by ?? null,
    removedReason: raw.removed_reason ?? null,
    dateReceived: raw.date_received ?? null,
    checkedInAt: raw.checked_in_at ?? null,
    checkedInByName: str(raw.checked_in_by_name),
    createdByName: str(raw.created_by_name),
    lastEditedByName: str(raw.last_edited_by_name),
    removedByName: str(raw.removed_by_name),
  } as InventoryRow;
}

/** Read one attribute as a display string ('' when missing). */
export function readAttr(attrs: Item['attributes'] | null | undefined, key: string): string {
  if (!attrs) return '';
  const v = (attrs as Record<string, unknown>)[key];
  if (v === undefined || v === null) return '';
  return String(v);
}

/** Medication name for headings/toasts, with a neutral fallback. */
export function medicationName(item: Pick<Item, 'attributes'>, fallback = 'Item'): string {
  return readAttr(item.attributes, 'medication_name') || fallback;
}

/** "10 mg · Tablet" — the secondary line under a medication name. */
export function doseLine(item: Pick<Item, 'attributes'>): string {
  const dose = [readAttr(item.attributes, 'dosage'), readAttr(item.attributes, 'unit')]
    .filter(Boolean)
    .join(' ');
  const form = readAttr(item.attributes, 'form');
  return [dose, form].filter(Boolean).join(' · ');
}

/** Past its expiry date (missing/invalid dates are never "expired"). */
export function isExpired(item: Pick<Item, 'expiryDate'>, now: number = Date.now()): boolean {
  if (!item.expiryDate) return false;
  const d = new Date(item.expiryDate);
  return !Number.isNaN(d.getTime()) && d.getTime() < now;
}

/** Checked out or removed: no further stock actions apply. */
export function isTerminal(item: Pick<Item, 'status'>): boolean {
  return item.status === 'checked_out' || item.status === 'removed';
}

/** Pick the display name for who checked the unit in. */
export function checkedInBy(row: InventoryRow): string | null {
  return row.checkedInByName ?? row.createdByName ?? null;
}

/** Filters the screen owns; `toQuery` turns them into the list endpoint's params. */
export interface InventoryFilters {
  q: string;
  status: ItemStatus | 'all';
  locationId: string; // 'all' or a location id
  expiryBefore: string; // YYYY-MM-DD or ''
}

export const DEFAULT_FILTERS: InventoryFilters = {
  q: '',
  status: 'all',
  locationId: 'all',
  expiryBefore: '',
};

/** How many filters differ from their defaults (search counts as one). */
export function activeFilterCount(f: InventoryFilters): number {
  let n = 0;
  if (f.q.trim().length > 0) n += 1;
  if (f.status !== 'all') n += 1;
  if (f.locationId !== 'all') n += 1;
  if (f.expiryBefore.length > 0) n += 1;
  return n;
}

/**
 * Query string for GET /inventory/items. Always asks for the backend's max
 * page (200) so client-side pagination has the full working set.
 */
export function toQuery(f: InventoryFilters): string {
  const params = new URLSearchParams();
  if (f.q.trim().length > 0) params.set('q', f.q.trim());
  if (f.status !== 'all') params.set('status', f.status);
  if (f.locationId !== 'all') params.set('locationId', f.locationId);
  if (f.expiryBefore) params.set('expiryBefore', f.expiryBefore);
  params.set('limit', '200');
  return params.toString();
}

/** Old → new diff for an edit transaction, one entry per changed key. */
export function diffEntries(
  oldValue: Record<string, unknown> | null,
  newValue: Record<string, unknown> | null
): Array<{ key: string; before: unknown; after: unknown }> {
  const keys = new Set<string>([...Object.keys(oldValue ?? {}), ...Object.keys(newValue ?? {})]);
  const out: Array<{ key: string; before: unknown; after: unknown }> = [];
  for (const key of keys) {
    const before = oldValue?.[key];
    const after = newValue?.[key];
    if (JSON.stringify(before) === JSON.stringify(after)) continue;
    out.push({ key, before, after });
  }
  return out;
}

/** Display form of a diff value: '∅' for empty, JSON for objects. */
export function stringifyValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return '∅';
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

/** Removal reasons (MVP spec § Remove from Inventory). */
export const REMOVAL_REASONS = [
  'expired',
  'damaged',
  'duplicate_entry',
  'incorrect_entry',
  'lost_or_missing',
  'disposed',
  'other',
] as const;
export type RemovalReason = (typeof REMOVAL_REASONS)[number];
