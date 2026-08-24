// Checkout API — FEFO item search. The cart mutations live in features/cart.

import { API_BASE, authHeaders } from '@/lib/apiClient';
import type { PlatformItemDTO } from '@/features/cart/mappers';

const INV_URL = `${API_BASE}/inventory`;

export interface SearchItemsParams {
  q: string;
  /** Defaults to "active". Superadmins may pass "active,expired". */
  status?: string;
  limit?: number;
}

/**
 * GET /inventory/items?q=&status=&sort=fefo — the server FEFO-sorts (per spec
 * § "FEFO Logic and Sort Order") and excludes anything that isn't `active`
 * from restricted users; superadmins additionally receive `expired` items.
 */
export async function searchItems(
  params: SearchItemsParams,
  signal?: AbortSignal
): Promise<PlatformItemDTO[]> {
  const search = new URLSearchParams();
  search.set('q', params.q);
  search.set('status', params.status ?? 'active');
  search.set('sort', 'fefo');
  if (params.limit !== undefined) search.set('limit', String(params.limit));
  const res = await fetch(`${INV_URL}/items?${search.toString()}`, {
    headers: authHeaders(),
    signal,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `Search failed: ${res.status}`);
  }
  const body = (await res.json()) as { items?: PlatformItemDTO[] } | PlatformItemDTO[];
  return Array.isArray(body) ? body : (body.items ?? []);
}
