/**
 * Home — the only file in this feature that knows a URL.
 *
 * Search hits the core items schema (`GET /inventory/items?q=…&status=active`);
 * the backend returns FEFO order, the UI never re-sorts. The insight cards
 * read the same report endpoints the Reports page uses (src/lib/api.ts › reports).
 */
import type { Item } from '@daana-health/inventory-core';
import { API_BASE, authHeaders } from '@/lib/apiClient';
import { reports } from '@/lib/api';

export type SearchResult =
  | { kind: 'api-missing' }
  | { kind: 'success'; items: ReadonlyArray<Item> };

export async function searchActiveItems(
  query: string,
  signal?: AbortSignal
): Promise<SearchResult> {
  const url = `${API_BASE}/inventory/items?q=${encodeURIComponent(query)}&status=active`;
  const res = await fetch(url, { signal, cache: 'no-store', headers: authHeaders() });
  if (res.status === 404) return { kind: 'api-missing' };
  if (!res.ok) throw new Error(`Items API returned ${res.status}`);
  const body: unknown = await res.json();
  return { kind: 'success', items: parseItems(body) };
}

export function parseItems(body: unknown): ReadonlyArray<Item> {
  if (Array.isArray(body)) return body as ReadonlyArray<Item>;
  if (body && typeof body === 'object' && 'items' in body) {
    const maybe = (body as { items?: unknown }).items;
    if (Array.isArray(maybe)) return maybe as ReadonlyArray<Item>;
  }
  return [];
}

export const insightApi = {
  expiring: () => reports.expiring(30),
  capacity: () => reports.capacity(),
  highUse: () => reports.highUse(),
  recentlyCheckedOut: () => reports.recentlyCheckedOut(),
};
