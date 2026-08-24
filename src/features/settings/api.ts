/**
 * Settings — the only file in this feature that knows a URL.
 *
 * Several write endpoints are not live yet on the gateway; the UI degrades to
 * an "endpoint pending" notice instead of an error. That contract is encoded
 * here as `Pending` so screens never inspect a Response.
 */
import { API_BASE, authHeaders } from '@/lib/apiClient';
import { auth, inventory } from '@/lib/api';
import type { MutableClassificationEntry } from './mappers';

export type ApiResult<T> = { kind: 'ok'; data: T } | { kind: 'pending' };

async function request<T>(
  path: string,
  init: RequestInit & { signal?: AbortSignal } = {}
): Promise<ApiResult<T>> {
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers: authHeaders() });
  if (res.status === 404) return { kind: 'pending' };
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  const data = (await res.json().catch(() => ({}))) as T;
  return { kind: 'ok', data };
}

function listOf(body: unknown, key: string): unknown[] {
  if (Array.isArray(body)) return body;
  if (body && typeof body === 'object') {
    const inner = (body as Record<string, unknown>)[key];
    if (Array.isArray(inner)) return inner;
  }
  return [];
}

// ─── Locations (bins) ────────────────────────────────────────────────────────

export interface LocationPayload {
  code: string;
  specialty: string;
  capacity: number;
  item_type: string;
}

export const locationsApi = {
  list: async (signal?: AbortSignal): Promise<ApiResult<unknown[]>> => {
    const r = await request<unknown>('/inventory/locations', { signal });
    return r.kind === 'ok' ? { kind: 'ok', data: listOf(r.data, 'locations') } : r;
  },
  create: (payload: LocationPayload) =>
    request<unknown>('/inventory/locations', { method: 'POST', body: JSON.stringify(payload) }),
  // Backend exposes PUT for update, POST for create (no PATCH route).
  update: (locationId: string, payload: LocationPayload) =>
    request<unknown>(`/inventory/locations/${locationId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  // Soft-deactivates server-side (sets deactivated_at).
  deactivate: (locationId: string) =>
    request<unknown>(`/inventory/locations/${locationId}`, { method: 'DELETE' }),
};

// ─── Users ───────────────────────────────────────────────────────────────────

export const usersApi = {
  list: async (signal?: AbortSignal): Promise<ApiResult<unknown[]>> => {
    const r = await request<unknown>('/auth/users', { signal });
    return r.kind === 'ok' ? { kind: 'ok', data: listOf(r.data, 'users') } : r;
  },
  add: (email: string, role: string) =>
    request<unknown>('/api/users', { method: 'POST', body: JSON.stringify({ email, role }) }),
  update: (userId: string, patch: Record<string, unknown>) =>
    request<unknown>(`/api/users/${userId}`, { method: 'PATCH', body: JSON.stringify(patch) }),
};

// ─── Account ─────────────────────────────────────────────────────────────────

export const accountApi = {
  changePassword: (currentPassword: string, newPassword: string) =>
    request<unknown>('/auth/account/password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};

// ─── Classification guide ────────────────────────────────────────────────────

export const classificationApi = {
  list: async (signal?: AbortSignal): Promise<ApiResult<unknown[]>> => {
    const r = await request<unknown>('/inventory/settings/classification', { signal });
    return r.kind === 'ok' ? { kind: 'ok', data: listOf(r.data, 'entries') } : r;
  },
  save: (entries: MutableClassificationEntry[]) =>
    request<unknown>('/inventory/settings/classification', {
      method: 'PATCH',
      body: JSON.stringify({ entries }),
    }),
};

// ─── Legacy admin (clinic flags + name/temp locations) ───────────────────────

export const adminApi = {
  getClinic: () => auth.getClinic(),
  updateClinic: (data: Record<string, unknown>) => auth.updateClinic(data),
  listLocations: () => inventory.getLocations(),
  createLocation: (name: string, temp: string) => inventory.createLocation(name, temp),
  updateLocation: (locationId: string, name: string, temp: string) =>
    inventory.updateLocation(locationId, name, temp),
  deleteLocation: (locationId: string) => inventory.deleteLocation(locationId),
};
