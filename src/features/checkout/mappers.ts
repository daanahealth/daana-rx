// Checkout mappers — pure helpers the screen and its tests share.

import {
  attrNumber,
  attrString,
  doseLabel,
  locationCodeOf,
  medicationNameOf,
  type PlatformItemDTO,
} from '@/features/cart/mappers';

/** Debounce: 300ms pause OR >=2 chars typed, whichever fires first. */
export const DEBOUNCE_MS = 300;
export const MIN_CHARS_FAST_PATH = 2;

/** How long to wait before searching for `query` (0 = fast path). */
export function searchDelayFor(query: string): number {
  return query.trim().length >= MIN_CHARS_FAST_PATH ? 0 : DEBOUNCE_MS;
}

/** Which statuses to ask the server for. Only superadmins see expired stock. */
export function searchStatusFor(isSuperadmin: boolean): string {
  return isSuperadmin ? 'active,expired' : 'active';
}

/** "Rithik" from a username like "rithik.g" or an email like "rithik@x.org". */
export function deriveFirstName(username?: string | null, email?: string | null): string {
  if (username && username.trim()) {
    // Split on whitespace, dot, or underscore; take first non-empty token.
    const tok = username.split(/[\s._]+/).find((t) => t.length > 0);
    if (tok) return tok.charAt(0).toUpperCase() + tok.slice(1);
  }
  if (email) {
    const local = email.split('@')[0];
    if (local) {
      const tok = local.split(/[._-]+/).find((t) => t.length > 0);
      if (tok) return tok.charAt(0).toUpperCase() + tok.slice(1);
    }
  }
  return 'there';
}

/** What a result card renders for one unit. */
export interface ResultView {
  readonly id: string;
  readonly unitCode: string;
  readonly status: PlatformItemDTO['status'];
  readonly isExpired: boolean;
  readonly medicationName: string;
  /** "500 mg" */
  readonly dose: string | null;
  readonly form: string | null;
  readonly quantity: number | null;
  readonly expiryDate: string | null;
  readonly locationCode: string | null;
}

export function toResultView(item: PlatformItemDTO): ResultView {
  const attrs = item.attributes ?? {};
  return {
    id: item.id,
    unitCode: item.unit_code,
    status: item.status,
    isExpired: item.status === 'expired',
    medicationName: medicationNameOf(item),
    dose: doseLabel(
      attrString(attrs, 'dose') ?? attrString(attrs, 'dosage'),
      attrString(attrs, 'unit')
    ),
    form: attrString(attrs, 'form'),
    quantity: attrNumber(attrs, 'quantity') ?? attrNumber(attrs, 'unit_count'),
    expiryDate: item.expiry_date,
    locationCode: locationCodeOf(item),
  };
}
