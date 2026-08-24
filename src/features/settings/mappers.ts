/**
 * Settings — wire → view-model mappers and the classification-guide local
 * fallback. Pure where possible; unit-tested.
 */
import { MASS_CLASSIFICATION_GUIDE, type ClassificationEntry } from '@daana-health/domain-mass';

export const DEFAULT_CAPACITY = 50;
export const CAPACITY_ALERT_RATIO = 0.9;

export const FORM_TYPES = [
  'Bottle',
  'Card',
  'Cream',
  'Nasal Spray',
  'Insulin Pen',
  'Injection',
  'Other',
] as const;

export interface LocationRow {
  locationId: string;
  code: string;
  specialty: string;
  capacity: number;
  item_type: string;
  deactivated_at: string | null;
}

type Raw = Record<string, unknown>;

const str = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v));
const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);

/** Accepts a few aliases so the UI does not break when the backend shape evolves. */
export function normaliseLocation(input: unknown): LocationRow {
  const raw = (input ?? {}) as Raw;
  const capacity = typeof raw.capacity === 'number' ? raw.capacity : raw.maxCapacity;
  return {
    locationId: str(raw.locationId || raw.id || raw.code),
    code: str(raw.code || raw.name || raw.locationCode),
    specialty: str(raw.specialty || raw.specialty_class || raw.class_name),
    capacity: typeof capacity === 'number' ? capacity : DEFAULT_CAPACITY,
    item_type: str(raw.item_type || raw.itemType || raw.temp || 'Other'),
    deactivated_at: strOrNull(raw.deactivated_at ?? raw.deactivatedAt),
  };
}

export function capacityAlertAt(capacity: number): number {
  return Math.floor(capacity * CAPACITY_ALERT_RATIO);
}

// ─── Users ───────────────────────────────────────────────────────────────────

/** The spec's two-role model. Lane A4 extends the option list, not this type. */
export type SettingsRole = 'Superadmin' | 'Restricted User';

export interface RoleOption {
  value: string;
  label: string;
  description?: string;
}

export const ROLE_OPTIONS: RoleOption[] = [
  { value: 'Superadmin', label: 'Superadmin', description: 'Full access, approves checkouts.' },
  {
    value: 'Restricted User',
    label: 'Restricted User',
    description: 'Builds carts; checkout needs superadmin approval.',
  },
];

export interface UserRow {
  userId: string;
  email: string;
  username?: string;
  role: string;
  canCheckout: boolean;
  deactivated_at: string | null;
}

/** Legacy auth users (userRole: superadmin|admin|employee) → the settings role model. */
export function normaliseUser(input: unknown): UserRow {
  const raw = (input ?? {}) as Raw;
  const legacyRole = str(raw.userRole || raw.role).toLowerCase();
  const role: SettingsRole =
    legacyRole === 'superadmin' || legacyRole === 'admin' ? 'Superadmin' : 'Restricted User';
  return {
    userId: str(raw.userId || raw.id),
    email: str(raw.email),
    username: typeof raw.username === 'string' ? raw.username : undefined,
    role,
    // Default: Superadmin can checkout, Restricted cannot.
    canCheckout: typeof raw.canCheckout === 'boolean' ? raw.canCheckout : role === 'Superadmin',
    deactivated_at: strOrNull(raw.deactivated_at ?? raw.deactivatedAt),
  };
}

export function userDisplayName(u: Pick<UserRow, 'email' | 'username'>): string {
  return u.email || u.username || '—';
}

// ─── Classification guide ────────────────────────────────────────────────────

export interface MutableClassificationEntry {
  class_name: string;
  common_examples: string[];
  location_code: string;
  two_digit_code: string;
  supervisor_review: boolean;
  deactivated_at: string | null;
}

export type { ClassificationEntry };

export const CLASSIFICATION_STORAGE_KEY = 'daana.settings.classification.overrides';
export const CLASSIFICATION_UPDATED_EVENT = 'daana:classification:updated';

export function seedFromGuide(): MutableClassificationEntry[] {
  return MASS_CLASSIFICATION_GUIDE.map((e) => ({
    class_name: e.class_name,
    common_examples: [...e.common_examples],
    location_code: e.location_code,
    two_digit_code: e.two_digit_code,
    supervisor_review: e.supervisor_review,
    deactivated_at: null,
  }));
}

/**
 * Read the current guide (seed + local overrides). Check In can call this to
 * apply superadmin edits live while the backend endpoint is pending.
 */
export function loadClassificationOverrides(): MutableClassificationEntry[] {
  if (typeof window === 'undefined') return seedFromGuide();
  try {
    const raw = window.localStorage.getItem(CLASSIFICATION_STORAGE_KEY);
    if (!raw) return seedFromGuide();
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MutableClassificationEntry[]) : seedFromGuide();
  } catch {
    return seedFromGuide();
  }
}

export function saveClassificationLocal(rows: MutableClassificationEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CLASSIFICATION_STORAGE_KEY, JSON.stringify(rows));
    // `storage` only fires across tabs; notify same-tab listeners (Check In).
    window.dispatchEvent(new CustomEvent(CLASSIFICATION_UPDATED_EVENT));
  } catch {}
}

export interface ClassificationFormValues {
  className: string;
  examples: string;
  locationCode: string;
  twoDigit: string;
  supervisorReview: boolean;
}

export function classificationFromForm(
  values: ClassificationFormValues,
  editing: MutableClassificationEntry | null
): MutableClassificationEntry {
  return {
    class_name: values.className.trim().toUpperCase(),
    common_examples: values.examples
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    location_code: values.locationCode.trim(),
    two_digit_code: values.twoDigit.trim().toUpperCase().slice(0, 2) || 'XX',
    supervisor_review: values.supervisorReview,
    deactivated_at: editing?.deactivated_at ?? null,
  };
}

export function classificationToForm(row: MutableClassificationEntry): ClassificationFormValues {
  return {
    className: row.class_name,
    examples: row.common_examples.join(', '),
    locationCode: row.location_code,
    twoDigit: row.two_digit_code,
    supervisorReview: row.supervisor_review,
  };
}

// ─── Legacy admin locations ──────────────────────────────────────────────────

export type LegacyTemp = 'room_temp' | 'fridge';

/** The legacy API returns 'room temp' with a space on read but expects 'room_temp' on write. */
export function legacyTempToForm(temp: string | undefined): LegacyTemp {
  return temp === 'fridge' ? 'fridge' : 'room_temp';
}

export function legacyTempLabel(temp: string | undefined): string {
  return temp === 'fridge' ? 'Refrigerated' : 'Room temperature';
}
