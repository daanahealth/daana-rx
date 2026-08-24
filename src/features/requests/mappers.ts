/**
 * Dispense requests — wire → view-model mappers.
 *
 * Backend lane A2 (`/transactions/requests`) had not merged when this was
 * written, so the reader accepts both camelCase and snake_case and several
 * plausible nestings. When the contract lands, adjust ONLY this file.
 *
 * Provider-facing surfaces must never render `reservedUnits` (location, DRX
 * code): the API omits them for providers, and MyRequestsScreen ignores them.
 */
import { isRequestStatus, type RequestStatus } from '@/lib/status';
import {
  asRecord,
  pick,
  readBool,
  readISODate,
  readNumber,
  readString,
} from '@/features/provider/mappers';

export interface ReservedUnitVM {
  location: string | null;
  unitCode: string | null;
  expiryDate: string | null;
  released: boolean;
}

export interface DispenseRequestVM {
  id: string;
  status: RequestStatus;
  medicationKey: string | null;
  medicationName: string;
  dose: string | null;
  form: string | null;
  quantity: number;
  patientRef: string | null;
  createdAt: string | null;
  expiresAt: string | null;
  resolvedAt: string | null;
  /** Reason given on deny (`denialReason` on the wire). */
  reason: string | null;
  /** Server-computed age (queue rows only); NaN when absent. */
  ageSeconds: number;
  provider: { fullName: string; credential: string | null } | null;
  /** Superadmin queue only. */
  reservedUnits: ReservedUnitVM[];
}

export interface RequestNotificationVM {
  id: string;
  requestId: string | null;
  message: string;
  read: boolean;
  createdAt: string | null;
}

function readDateTime(w: Record<string, unknown>, keys: string[]): string | null {
  const v = readString(w, keys);
  if (!v) return null;
  return Number.isNaN(new Date(v).getTime()) ? null : v;
}

export function toDispenseRequest(raw: unknown): DispenseRequestVM {
  const outer = asRecord(raw);
  const w = asRecord(pick(outer, ['request']) ?? outer);
  const med = asRecord(pick(w, ['medication']));
  const providerRaw = asRecord(pick(w, ['provider', 'providerProfile', 'provider_profile']));
  const providerName = readString(providerRaw, ['fullName', 'full_name', 'name']);
  const unitsRaw = pick(w, ['units', 'reservedUnits', 'reserved_units']);
  const singleUnit = pick(w, ['reservedUnit', 'reserved_unit', 'unit']);
  const unitList = Array.isArray(unitsRaw) ? unitsRaw : singleUnit ? [singleUnit] : [];
  const statusRaw = readString(w, ['status'])?.toLowerCase();

  return {
    id: readString(w, ['id', 'requestId', 'request_id']) ?? '',
    status: isRequestStatus(statusRaw) ? statusRaw : 'pending',
    medicationKey: readString(w, ['medicationKey', 'medication_key']) ?? readString(med, ['key']),
    medicationName:
      readString(w, ['medicationName', 'medication_name']) ??
      readString(med, ['medicationName', 'medication_name', 'name']) ??
      'Unknown',
    dose: readString(w, ['dose', 'dosage']) ?? readString(med, ['dose', 'dosage']),
    form: readString(w, ['form']) ?? readString(med, ['form']),
    quantity: Math.max(1, readNumber(w, ['quantity', 'qty'], 1)),
    patientRef: readString(w, ['patientRef', 'patient_ref', 'patientReference']),
    createdAt: readDateTime(w, ['createdAt', 'created_at', 'requestedAt', 'requested_at']),
    expiresAt: readDateTime(w, ['expiresAt', 'expires_at', 'ttlExpiresAt']),
    resolvedAt: readDateTime(w, ['resolvedAt', 'resolved_at', 'fulfilledAt', 'deniedAt']),
    reason: readString(w, ['denialReason', 'denial_reason', 'reason']),
    provider: providerName
      ? { fullName: providerName, credential: readString(providerRaw, ['credential']) }
      : null,
    ageSeconds: readNumber(w, ['ageSeconds', 'age_seconds'], NaN),
    reservedUnits: unitList
      .map((u) => {
        const r = asRecord(u);
        const loc = pick(r, ['locationCode', 'location_code', 'location']);
        return {
          location:
            typeof loc === 'string'
              ? loc
              : (readString(asRecord(loc), ['name', 'code']) ??
                readString(r, ['locationName', 'location_name', 'bin'])),
          unitCode: readString(r, ['unitCode', 'unit_code', 'drxCode', 'code']),
          expiryDate: readISODate(r, ['expiryDate', 'expiry_date']),
          released: readBool(r, ['released'], false),
        };
      })
      // Released units are back on the shelf; the card shows what is still held.
      .filter((u, _, all) => !u.released || all.every((x) => x.released)),
  };
}

export function toDispenseRequestList(raw: unknown): DispenseRequestVM[] {
  const w = asRecord(raw);
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(w.requests)
      ? w.requests
      : Array.isArray(w.data)
        ? w.data
        : [];
  return list.map(toDispenseRequest).filter((r) => r.id);
}

export function toPendingCount(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  return Math.max(0, readNumber(asRecord(raw), ['pending', 'count'], 0));
}

const NOTIFICATION_COPY: Record<string, string> = {
  request_created: 'New request',
  request_fulfilled: 'Ready at the front desk',
  request_denied: 'Request denied',
  request_expired: 'Request expired',
  request_cancelled: 'Request cancelled',
};

export function toNotification(raw: unknown): RequestNotificationVM {
  const w = asRecord(raw);
  const payload = asRecord(pick(w, ['payload']));
  const kind = readString(w, ['kind']) ?? '';
  const med = readString(payload, ['medication']);
  const qty = readNumber(payload, ['quantity'], 0);
  const who = readString(payload, ['providerName']);
  const reason = readString(payload, ['reason']);
  const parts = [
    NOTIFICATION_COPY[kind] ?? kind,
    med ? `${med}${qty ? ` × ${qty}` : ''}` : null,
    who,
    reason,
  ]
    .filter(Boolean)
    .join(' · ');
  return {
    id: readString(w, ['id', 'notificationId', 'notification_id']) ?? '',
    requestId: readString(payload, ['requestId']) ?? readString(w, ['requestId', 'request_id']),
    message: readString(w, ['message']) ?? parts,
    read: pick(w, ['readAt', 'read_at']) != null || pick(w, ['read']) === true,
    createdAt: readDateTime(w, ['createdAt', 'created_at']),
  };
}

export function toNotificationList(raw: unknown): RequestNotificationVM[] {
  const w = asRecord(raw);
  const list = Array.isArray(raw) ? raw : Array.isArray(w.notifications) ? w.notifications : [];
  return list.map(toNotification).filter((n) => n.id);
}

// ----- derived helpers -------------------------------------------------------

export const ACTIVE_STATUSES: readonly RequestStatus[] = ['pending'];

export function hasPending(requests: readonly DispenseRequestVM[] | null | undefined): boolean {
  return !!requests?.some((r) => r.status === 'pending');
}

/** Oldest first, the queue order (spec §9). */
export function sortOldestFirst(requests: readonly DispenseRequestVM[]): DispenseRequestVM[] {
  return [...requests].sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));
}

/** Newest first, for My Requests and the resolved list. */
export function sortNewestFirst(requests: readonly DispenseRequestVM[]): DispenseRequestVM[] {
  return [...requests].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}

/**
 * Remaining time until `expiresAt`, for the TTL countdown.
 * Returns null when there is no TTL; `expired` when it has passed.
 */
export type Countdown = { expired: true } | { expired: false; label: string; minutes: number };

export function ttlCountdown(
  expiresAt: string | null | undefined,
  now: Date = new Date()
): Countdown | null {
  if (!expiresAt) return null;
  const end = new Date(expiresAt).getTime();
  if (Number.isNaN(end)) return null;
  const ms = end - now.getTime();
  if (ms <= 0) return { expired: true };
  const minutes = Math.ceil(ms / 60_000);
  if (minutes < 60) return { expired: false, minutes, label: `${minutes} min left` };
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return { expired: false, minutes, label: m ? `${h} h ${m} min left` : `${h} h left` };
}

/** Deny quick picks (spec §9). "other" requires free text; the rest prefill it. */
export const DENY_QUICK_PICKS = [
  { value: 'stock damaged', label: 'Stock damaged' },
  { value: 'could not locate', label: 'Could not locate' },
  { value: 'per provider', label: 'Per provider' },
  { value: 'other', label: 'Other' },
] as const;
