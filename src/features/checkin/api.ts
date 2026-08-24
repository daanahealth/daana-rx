/**
 * Check-in API — the only file in this feature that knows a URL.
 *
 * - GET  /inventory/items/next-code?location=…&medication_name=…&dosage=…
 *     → the exact unit_code the server will assign (rendered on the sticker).
 * - POST /inventory/items → persists the unit; returns the stored unit_code.
 * - GET  /inventory/locations/v2 → bins configured in Settings.
 *
 * Every function throws an Error whose message the UI can show verbatim.
 */
import { API_BASE, authHeaders } from '@/lib/apiClient';

export interface NextCode {
  counter: number;
  unitCode: string | null;
}

export interface NextCodeParams {
  location: string;
  medicationName?: string;
  dosage?: string;
}

export interface BackendLocation {
  id: string;
  code: string;
  specialty: string | null;
  capacity: number;
}

export interface CreateItemPayload {
  typeName: string;
  locationCode: string;
  expiryDate: string | null;
  dateReceived: string;
  attributes: Record<string, unknown>;
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  return body.error || fallback;
}

/**
 * The DRX code is specialty-based and allocated server-side; this is the only
 * trustworthy source. No client fallback: a locally-built code is what once
 * produced stickers that did not match the stored unit.
 */
export async function fetchNextCode(
  { location, medicationName, dosage }: NextCodeParams,
  signal?: AbortSignal
): Promise<NextCode> {
  const params = new URLSearchParams({ location });
  if (medicationName) params.set('medication_name', medicationName);
  if (dosage) params.set('dosage', dosage);
  const res = await fetch(`${API_BASE}/inventory/items/next-code?${params.toString()}`, {
    cache: 'no-store',
    headers: authHeaders(),
    signal,
  });
  if (!res.ok) throw new Error(await errorMessage(res, `Code preview failed (${res.status})`));
  const json = (await res.json()) as { unit_code?: string; counter?: number };
  if (typeof json.counter !== 'number' || !Number.isFinite(json.counter)) {
    throw new Error('Code preview returned no counter');
  }
  return { counter: json.counter, unitCode: json.unit_code ?? null };
}

/** Persist the unit. Resolves to the unit_code the server actually stored. */
export async function createItem(payload: CreateItemPayload): Promise<{ unitCode: string | null }> {
  const res = await fetch(`${API_BASE}/inventory/items`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await errorMessage(res, `POST /inventory/items returned ${res.status}.`));
  }
  const body = (await res.json().catch(() => ({}))) as { unit_code?: string };
  return { unitCode: body.unit_code ?? null };
}

/** Bins configured in Settings → Locations. */
export async function listLocations(signal?: AbortSignal): Promise<BackendLocation[]> {
  const res = await fetch(`${API_BASE}/inventory/locations/v2`, {
    headers: authHeaders(),
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = (await res.json()) as BackendLocation[] | { locations?: BackendLocation[] };
  return Array.isArray(body) ? body : (body.locations ?? []);
}
