/**
 * Provider feature — wire → view-model mappers.
 *
 * Every response from /inventory/provider/*, /auth/me (providerProfile) and
 * /inventory/settings/flags passes through here, so a backend field rename is
 * a one-file fix. Mappers are tolerant of camelCase and snake_case and never
 * throw on a missing field; they coerce to safe defaults instead.
 *
 * Hard rule (Provider spec, DESIGN.md): nothing here carries a location, bin,
 * DRX code or item id. If the API ever adds one, the mapper drops it.
 */

export interface MedicationCardVM {
  key: string;
  medicationName: string;
  dose: string | null;
  form: string | null;
  specialtyClass: string | null;
  availableUnits: number;
  availableQuantity: number;
  /** ISO YYYY-MM-DD, null when nothing is available. */
  earliestExpiry: string | null;
}

export interface ExpiryBucketVM {
  expiryDate: string;
  availableUnits: number;
  availableQuantity: number;
}

export interface MedicationDetailVM extends MedicationCardVM {
  /** FEFO order — the first entry is what a request would reserve. */
  nextExpiries: ExpiryBucketVM[];
}

export interface ProviderHomeVM {
  specialty: string | null;
  available: MedicationCardVM[];
  topRequested: MedicationCardVM[];
}

export interface MedicationListVM {
  medications: MedicationCardVM[];
  total: number;
}

export const PROVIDER_CREDENTIALS = ['MD', 'DO', 'NP', 'PA', 'PharmD', 'Other'] as const;
export type ProviderCredential = (typeof PROVIDER_CREDENTIALS)[number];

export interface ProviderProfileVM {
  fullName: string;
  credential: string;
  specialty: string;
  active: boolean;
}

export interface ProviderUserVM {
  userId: string;
  email: string;
  username: string;
  profile: ProviderProfileVM | null;
  createdAt: string | null;
}

export type AttestationMode = 'none' | 'checkbox' | 'signature';
export type RequestTtl = 'end_of_day' | number;

export interface ClinicFlagsVM {
  providerRequestsEnabled: boolean;
  patientRefEnabled: boolean;
  attestationMode: AttestationMode;
  requestTtl: RequestTtl;
}

export const DEFAULT_FLAGS: ClinicFlagsVM = {
  providerRequestsEnabled: false,
  patientRefEnabled: false,
  attestationMode: 'none',
  requestTtl: 'end_of_day',
};

// ----- tolerant readers -----------------------------------------------------

type Wire = Record<string, unknown>;

export function asRecord(value: unknown): Wire {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Wire) : {};
}

export function pick(obj: Wire, keys: string[]): unknown {
  for (const k of keys) if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  return undefined;
}

export function readString(obj: Wire, keys: string[]): string | null {
  const v = pick(obj, keys);
  if (typeof v === 'string') return v.trim() || null;
  if (typeof v === 'number') return String(v);
  return null;
}

export function readNumber(obj: Wire, keys: string[], fallback = 0): number {
  const v = pick(obj, keys);
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export function readBool(obj: Wire, keys: string[], fallback = false): boolean {
  const v = pick(obj, keys);
  if (typeof v === 'boolean') return v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return fallback;
}

/** Date-only ISO (YYYY-MM-DD) or null. Trims a trailing time component. */
export function readISODate(obj: Wire, keys: string[]): string | null {
  const v = readString(obj, keys);
  if (!v) return null;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(v);
  return m ? m[1] : null;
}

// ----- medications ----------------------------------------------------------

export function toMedicationCard(raw: unknown): MedicationCardVM {
  const w = asRecord(raw);
  const availableUnits = Math.max(0, readNumber(w, ['availableUnits', 'available_units']));
  return {
    key: readString(w, ['key', 'medicationKey', 'medication_key']) ?? '',
    medicationName: readString(w, ['medicationName', 'medication_name', 'name']) ?? 'Unknown',
    dose: readString(w, ['dose', 'dosage']),
    form: readString(w, ['form']),
    specialtyClass: readString(w, ['specialtyClass', 'specialty_class', 'specialty']),
    availableUnits,
    availableQuantity: Math.max(
      0,
      readNumber(w, ['availableQuantity', 'available_quantity'], availableUnits)
    ),
    earliestExpiry:
      availableUnits > 0 ? readISODate(w, ['earliestExpiry', 'earliest_expiry']) : null,
  };
}

export function toMedicationList(raw: unknown): MedicationListVM {
  const w = asRecord(raw);
  const list = Array.isArray(w.medications) ? w.medications : Array.isArray(raw) ? raw : [];
  const medications = list.map(toMedicationCard).filter((m) => m.key);
  return { medications, total: readNumber(w, ['total'], medications.length) };
}

export function toMedicationDetail(raw: unknown): MedicationDetailVM {
  const w = asRecord(raw);
  const inner = asRecord(pick(w, ['medication']) ?? w);
  const card = toMedicationCard(inner);
  const buckets = Array.isArray(inner.nextExpiries)
    ? inner.nextExpiries
    : Array.isArray(inner.next_expiries)
      ? inner.next_expiries
      : [];
  const nextExpiries = buckets
    .map((b) => {
      const r = asRecord(b);
      const expiryDate = readISODate(r, ['expiryDate', 'expiry_date']);
      return expiryDate
        ? {
            expiryDate,
            availableUnits: readNumber(r, ['availableUnits', 'available_units']),
            availableQuantity: readNumber(r, ['availableQuantity', 'available_quantity']),
          }
        : null;
    })
    .filter((b): b is ExpiryBucketVM => b !== null)
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  return { ...card, nextExpiries };
}

export function toProviderHome(raw: unknown): ProviderHomeVM {
  const w = asRecord(raw);
  const available = (Array.isArray(w.available) ? w.available : [])
    .map(toMedicationCard)
    .filter((m) => m.key);
  const topRequested = (Array.isArray(w.topRequested) ? w.topRequested : [])
    .map(toMedicationCard)
    .filter((m) => m.key);
  return { specialty: readString(w, ['specialty']), available, topRequested };
}

// ----- profile + flags ------------------------------------------------------

export function toProviderProfile(raw: unknown): ProviderProfileVM | null {
  const w = asRecord(raw);
  const fullName = readString(w, ['fullName', 'full_name']);
  if (!fullName) return null;
  return {
    fullName,
    credential: readString(w, ['credential']) ?? '',
    specialty: readString(w, ['specialty']) ?? '',
    active: readBool(w, ['active'], true),
  };
}

export function toProviderUser(raw: unknown): ProviderUserVM {
  const w = asRecord(raw);
  return {
    userId: readString(w, ['userId', 'user_id', 'id']) ?? '',
    email: readString(w, ['email']) ?? '',
    username: readString(w, ['username']) ?? '',
    profile: toProviderProfile(pick(w, ['providerProfile', 'provider_profile'])),
    createdAt: readString(w, ['createdAt', 'created_at']),
  };
}

export function toClinicFlags(raw: unknown): ClinicFlagsVM {
  const outer = asRecord(raw);
  const w = asRecord(pick(outer, ['flags']) ?? outer);
  const mode = readString(w, ['attestation_mode', 'attestationMode']);
  const ttlRaw = pick(w, ['request_ttl', 'requestTtl']);
  const ttl: RequestTtl =
    typeof ttlRaw === 'number' && Number.isFinite(ttlRaw) && ttlRaw > 0
      ? ttlRaw
      : typeof ttlRaw === 'string' && /^\d+$/.test(ttlRaw)
        ? Number(ttlRaw)
        : 'end_of_day';
  return {
    providerRequestsEnabled: readBool(w, ['provider_requests_enabled', 'providerRequestsEnabled']),
    patientRefEnabled: readBool(w, ['patient_ref_enabled', 'patientRefEnabled']),
    attestationMode: mode === 'checkbox' || mode === 'signature' ? mode : 'none',
    requestTtl: ttl,
  };
}

/** View model → wire for PATCH /inventory/settings/flags (partial). */
export function flagsToWire(patch: Partial<ClinicFlagsVM>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (patch.providerRequestsEnabled !== undefined)
    out.provider_requests_enabled = patch.providerRequestsEnabled;
  if (patch.patientRefEnabled !== undefined) out.patient_ref_enabled = patch.patientRefEnabled;
  if (patch.attestationMode !== undefined) out.attestation_mode = patch.attestationMode;
  if (patch.requestTtl !== undefined) out.request_ttl = patch.requestTtl;
  return out;
}

// ----- labels ---------------------------------------------------------------

const SPECIALTY_LABELS: Record<string, string> = {
  CARDIO: 'Cardiology',
  PSYCH: 'Psychiatry',
  GASTRO: 'Gastroenterology',
  ENDOCRINE: 'Endocrinology',
  INFECT: 'Infectious disease',
  PAINFLAM: 'Pain & inflammation',
  UROL: 'Urology',
  NEURO: 'Neurology',
  VITSUP: 'Vitamins & supplements',
  RESP: 'Respiratory',
  DERM: 'Dermatology',
  ALLERGY: 'Allergy',
  OBGYN: 'OB/GYN',
  OPHTH: 'Ophthalmology',
  OTHER: 'Other',
};

/** "CARDIO" → "Cardiology"; unknown codes are returned in title case. */
export function specialtyLabel(code: string | null | undefined): string {
  if (!code) return '';
  const upper = code.trim().toUpperCase();
  if (SPECIALTY_LABELS[upper]) return SPECIALTY_LABELS[upper];
  return upper.charAt(0) + upper.slice(1).toLowerCase();
}

/** "Karol Patel, NP" — credential omitted when missing. */
export function providerDisplayName(profile: {
  fullName: string;
  credential?: string | null;
}): string {
  return profile.credential ? `${profile.fullName}, ${profile.credential}` : profile.fullName;
}

/** "500 mg · Tablet" */
export function doseForm(m: { dose?: string | null; form?: string | null }): string {
  return [m.dose, m.form].filter(Boolean).join(' · ');
}

/** "end_of_day" → "End of clinic day"; 4 → "4 hours". */
export function ttlLabel(ttl: RequestTtl): string {
  if (ttl === 'end_of_day') return 'End of clinic day';
  return ttl === 1 ? '1 hour' : `${ttl} hours`;
}
