/**
 * Reports mappers — raw gateway payloads → typed screen rows.
 *
 * The transaction-service report routes return snake_case records under one
 * collection key each (`items`, `locations`, `medications`, `edits`,
 * `transactions`). The previous components typed a camelCase `{ rows }` shape
 * instead and so rendered empty against the live gateway. Every mapper here
 * accepts both, so the screens work whichever the backend sends.
 */
import { ACTOR_KIND_LABEL, type ActorKind } from '@/lib/status';
import { daysUntil } from '@/lib/format';
import type { RawRecord } from './api';

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------

export interface ExpiringRow {
  unitId: string;
  medicationName: string;
  dosage: string | null;
  form: string | null;
  expiryDate: string;
  daysUntilExpiry: number | null;
  location: string | null;
  drxCode: string | null;
}

export interface CapacityRow {
  locationId: string;
  name: string;
  current: number;
  capacity: number;
  /** 0–100. */
  percent: number;
}

export interface HighUseRow {
  key: string;
  medicationName: string;
  dosage: string | null;
  form: string | null;
  checkoutCount: number;
}

export interface RecentlyRemovedRow {
  unitId: string;
  medicationName: string;
  dosage: string | null;
  location: string | null;
  drxCode: string | null;
  removedAt: string | null;
  removedBy: string | null;
  reason: string | null;
}

export interface InventoryEditRow {
  key: string;
  transactionId: string;
  timestamp: string;
  medicationName: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  actorId: string | null;
  actorKind: ActorKind | null;
  actor: string | null;
}

export interface TransactionRow {
  transactionId: string;
  timestamp: string;
  actionType: string;
  medicationName: string | null;
  dosage: string | null;
  form: string | null;
  location: string | null;
  drxCode: string | null;
  /** Raw actor id (or free-text user) from the payload. */
  actorId: string | null;
  /** Present once backend #12 lands; absent → treated as a human. */
  actorKind: ActorKind | null;
  reason: string | null;
  notes: string | null;
}

export interface TransactionPage {
  rows: TransactionRow[];
  nextCursor: string | null;
}

/** Legacy units-table transaction (/transactions/all). */
export interface LegacyTransactionRow {
  transactionId: string;
  timestamp: string;
  type: string;
  medicationName: string;
  strength: string | null;
  quantity: number;
  user: string | null;
  notes: string | null;
}

/** user id → display name. */
export type UserDirectory = Record<string, string>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const rec = (v: unknown): RawRecord | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as RawRecord) : null;

function str(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  return typeof v === 'string' ? v : String(v);
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** First present key, snake or camel. */
function pick(r: RawRecord | null, ...keys: string[]): unknown {
  if (!r) return undefined;
  for (const k of keys) {
    if (r[k] !== undefined && r[k] !== null) return r[k];
  }
  return undefined;
}

function list(payload: unknown, ...keys: string[]): RawRecord[] {
  if (Array.isArray(payload)) return payload.filter((x) => rec(x)) as RawRecord[];
  const r = rec(payload);
  if (!r) return [];
  for (const k of keys) {
    const v = r[k];
    if (Array.isArray(v)) return v.filter((x) => rec(x)) as RawRecord[];
  }
  return [];
}

/** Location may be a string, `{ name }` (legacy) or `{ code, specialty }` (core). */
function locationName(v: unknown): string | null {
  if (typeof v === 'string') return str(v);
  const r = rec(v);
  return str(pick(r, 'code', 'name')) ?? null;
}

function medication(r: RawRecord | null): string {
  return str(pick(r, 'medication_name', 'medicationName')) ?? 'Unknown medication';
}

function dose(r: RawRecord | null): string | null {
  const d = str(pick(r, 'dose', 'dosage'));
  if (!d) return null;
  const unit = str(pick(r, 'strength_unit', 'strengthUnit'));
  return unit && !d.endsWith(unit) ? `${d}${unit}` : d;
}

export function isActorKind(v: unknown): v is ActorKind {
  return v === 'user' || v === 'system_ttl' || v === 'system_expiry_sweep';
}

function actorKind(r: RawRecord | null): ActorKind | null {
  const v = pick(r, 'actor_kind', 'actorKind');
  return isActorKind(v) ? v : null;
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

export function mapExpiring(payload: unknown, now: Date = new Date()): ExpiringRow[] {
  return list(payload, 'items', 'rows').map((r, i) => {
    const expiryDate = str(pick(r, 'expiry_date', 'expiryDate')) ?? '';
    return {
      unitId: str(pick(r, 'item_id', 'unitId', 'id')) ?? `row-${i}`,
      medicationName: medication(r),
      dosage: dose(r),
      form: str(r.form),
      expiryDate,
      daysUntilExpiry:
        num(pick(r, 'days_until_expiry', 'daysUntilExpiry')) ?? daysUntil(expiryDate, now),
      location: locationName(r.location),
      drxCode: str(pick(r, 'unit_code', 'drxCode')),
    };
  });
}

export function mapCapacity(payload: unknown): CapacityRow[] {
  return list(payload, 'locations', 'rows').map((r, i) => {
    const loc = rec(r.location);
    const capacity = num(pick(loc, 'capacity')) ?? num(r.capacity) ?? 50;
    const current = num(pick(r, 'used', 'current')) ?? 0;
    const rawPct = num(r.percent);
    // Core returns a 0–1 ratio; legacy returned 0–100.
    const percent =
      rawPct === null
        ? capacity > 0
          ? (current / capacity) * 100
          : 0
        : rawPct <= 1
          ? rawPct * 100
          : rawPct;
    return {
      locationId: str(pick(loc, 'id')) ?? str(pick(r, 'locationId', 'location_id')) ?? `bin-${i}`,
      name: locationName(r.location) ?? str(r.name) ?? 'Unnamed bin',
      current,
      capacity,
      percent: Math.round(percent * 10) / 10,
    };
  });
}

export function mapHighUse(payload: unknown): HighUseRow[] {
  return list(payload, 'medications', 'rows').map((r, i) => ({
    key: str(pick(r, 'drugId', 'drug_id')) ?? `${medication(r)}-${i}`,
    medicationName: medication(r),
    dosage: str(pick(r, 'sample_dose', 'dosage', 'dose')),
    form: str(pick(r, 'sample_form', 'form')),
    checkoutCount: num(pick(r, 'count', 'checkoutCount')) ?? 0,
  }));
}

export function mapRecentlyRemoved(payload: unknown): RecentlyRemovedRow[] {
  return list(payload, 'items', 'rows').map((r, i) => ({
    unitId: str(pick(r, 'item_id', 'unitId', 'id')) ?? `row-${i}`,
    medicationName: medication(r),
    dosage: dose(r),
    location: locationName(r.location),
    drxCode: str(pick(r, 'unit_code', 'drxCode')),
    removedAt: str(pick(r, 'removed_at', 'removedAt')),
    removedBy: str(pick(r, 'removed_by', 'removedBy')),
    reason: str(pick(r, 'removed_reason', 'reason')),
  }));
}

/** One row per changed field: core nests `changes[]`; legacy was already flat. */
export function mapInventoryEdits(payload: unknown): InventoryEditRow[] {
  const out: InventoryEditRow[] = [];
  for (const r of list(payload, 'edits', 'rows')) {
    const transactionId = str(pick(r, 'transaction_id', 'transactionId')) ?? '';
    const timestamp = str(r.timestamp) ?? '';
    const item = rec(r.item);
    const medicationName = medication(item ?? r);
    const actorId = str(pick(r, 'actor_id', 'actorId', 'actor'));
    const base = { transactionId, timestamp, medicationName, actorId, actorKind: actorKind(r) };
    const changes = Array.isArray(r.changes) ? (r.changes as RawRecord[]) : null;
    if (changes && changes.length > 0) {
      changes.forEach((c, i) => {
        const field = str(c.field) ?? 'field';
        out.push({
          ...base,
          key: `${transactionId}:${field}:${i}`,
          field,
          oldValue: str(pick(c, 'old', 'oldValue')),
          newValue: str(pick(c, 'new', 'newValue')),
          actor: str(r.actor),
        });
      });
    } else {
      const field = str(r.field) ?? 'field';
      out.push({
        ...base,
        key: `${transactionId}:${field}`,
        field,
        oldValue: str(pick(r, 'old_value', 'oldValue')),
        newValue: str(pick(r, 'new_value', 'newValue')),
        actor: str(r.actor),
      });
    }
  }
  return out;
}

export function mapTransactionRow(r: RawRecord, index = 0): TransactionRow {
  return {
    transactionId: str(pick(r, 'transaction_id', 'transactionId')) ?? `row-${index}`,
    timestamp: str(r.timestamp) ?? str(pick(r, 'created_at', 'createdAt')) ?? '',
    actionType: str(pick(r, 'action_type', 'actionType', 'action', 'type')) ?? 'unknown',
    medicationName: str(pick(r, 'medication_name', 'medicationName')),
    dosage: dose(r),
    form: str(r.form),
    location: locationName(r.location),
    drxCode: str(pick(r, 'drx_code', 'drxCode', 'unit_code')),
    actorId: str(pick(r, 'actor_id', 'actorId', 'user')),
    actorKind: actorKind(r),
    reason: str(r.reason),
    notes: str(pick(r, 'notes', 'note')),
  };
}

export function mapTransactionPage(payload: unknown): TransactionPage {
  const r = rec(payload);
  return {
    rows: list(payload, 'transactions', 'rows').map(mapTransactionRow),
    nextCursor: str(pick(r, 'next_cursor', 'nextCursor')),
  };
}

export function mapLegacyTransaction(r: RawRecord, index = 0): LegacyTransactionRow {
  const unit = rec(r.unit);
  const drug = rec(unit?.drug) ?? rec(r.drug);
  const user = rec(r.user);
  const strength = str(pick(drug, 'strength'));
  const strengthUnit = str(pick(drug, 'strengthUnit', 'strength_unit'));
  return {
    transactionId: str(pick(r, 'transactionId', 'transaction_id')) ?? `row-${index}`,
    timestamp: str(r.timestamp) ?? '',
    type: str(r.type) ?? 'unknown',
    medicationName: str(pick(drug, 'medicationName', 'medication_name')) ?? 'Unknown medication',
    strength: strength ? `${strength}${strengthUnit ?? ''}` : null,
    quantity: num(r.quantity) ?? 0,
    user: str(pick(user, 'username', 'email')) ?? (typeof r.user === 'string' ? r.user : null),
    notes: str(r.notes),
  };
}

/** `/auth/users` → { userId: username }. */
export function mapUserDirectory(payload: unknown): UserDirectory {
  const dir: UserDirectory = {};
  for (const u of list(payload)) {
    const id = str(pick(u, 'userId', 'user_id', 'id'));
    const name = str(pick(u, 'username', 'email'));
    if (id && name) dir[id] = name;
  }
  return dir;
}

// ---------------------------------------------------------------------------
// Actor label (spec B4)
// ---------------------------------------------------------------------------

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Who did this? System writers are named explicitly from `actor_kind`; humans
 * resolve through the user directory, then fall back to whatever the payload
 * carried (a username, or a shortened id so two rows are still telling).
 */
export function actorLabel(
  row: { actorId: string | null; actorKind: ActorKind | null; actor?: string | null },
  directory: UserDirectory = {}
): string {
  if (row.actorKind && row.actorKind !== 'user') return ACTOR_KIND_LABEL[row.actorKind];
  if (row.actor) return row.actor;
  if (!row.actorId) return 'System';
  const named = directory[row.actorId];
  if (named) return named;
  return UUID.test(row.actorId) ? `User ${row.actorId.slice(0, 8)}` : row.actorId;
}

/** Resolve a typed actor filter (username / email) to a user id, if we can. */
export function resolveActorId(query: string, directory: UserDirectory): string | undefined {
  const needle = query.trim().toLowerCase();
  if (!needle) return undefined;
  if (UUID.test(needle)) return needle;
  const hit = Object.entries(directory).find(([, name]) => name.toLowerCase() === needle);
  return hit?.[0];
}
