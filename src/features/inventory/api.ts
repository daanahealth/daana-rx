// Inventory API — the only file in this feature that knows a URL.
// Every call goes through the gateway with `authHeaders()`; errors surface as
// `Error` with a message the UI can show verbatim.

import type { Location } from '@daana-health/inventory-core';
import { API_BASE, authHeaders } from '@/lib/apiClient';
import {
  mapInventoryRow,
  type InventoryRow,
  type RawInventoryItem,
  type TransactionRow,
} from './mappers';

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  return body.error || fallback;
}

/**
 * GET /inventory/items?{query}. A 404 means the endpoint is not wired yet and
 * is treated as an empty inventory, not an error.
 */
export async function listItems(query: string, signal?: AbortSignal): Promise<InventoryRow[]> {
  const url = `${API_BASE}/inventory/items${query ? `?${query}` : ''}`;
  const res = await fetch(url, { headers: authHeaders(), signal });
  if (res.status === 404) return [];
  if (!res.ok) {
    throw new Error(await errorMessage(res, `GET /inventory/items failed: ${res.status}`));
  }
  const body = (await res.json()) as { items?: RawInventoryItem[] } | RawInventoryItem[];
  const list = Array.isArray(body) ? body : (body.items ?? []);
  return list.map(mapInventoryRow);
}

/**
 * GET /inventory/locations/v2 — the core-schema shape ({ id, code, … }) this
 * feature (and the edit form it feeds) consume. The legacy
 * GET /inventory/locations returns { locationId, name } and is not used here.
 * Non-OK responses resolve to [] (the filter just has no options).
 */
export async function listLocations(signal?: AbortSignal): Promise<Location[]> {
  const res = await fetch(`${API_BASE}/inventory/locations/v2`, { headers: authHeaders(), signal });
  if (!res.ok) return [];
  const body = (await res.json()) as { locations?: Location[] } | Location[];
  return Array.isArray(body) ? body : (body.locations ?? []);
}

/** GET /inventory/items/{id}/transactions. 404 → []. */
export async function listItemTransactions(
  itemId: string,
  signal?: AbortSignal
): Promise<TransactionRow[]> {
  const res = await fetch(`${API_BASE}/inventory/items/${itemId}/transactions`, {
    headers: authHeaders(),
    signal,
  });
  if (res.status === 404) return [];
  if (!res.ok) {
    throw new Error(
      await errorMessage(res, `GET /api/items/${itemId}/transactions failed: ${res.status}`)
    );
  }
  const body = (await res.json()) as { transactions?: TransactionRow[] } | TransactionRow[];
  return Array.isArray(body) ? body : (body.transactions ?? []);
}

export interface UpdateItemBody {
  attributes: Record<string, unknown>;
  locationId: string | null;
  expiryDate: string; // YYYY-MM-DD
  status: string;
}

/** PATCH /inventory/items/{id}. Every change is logged with old → new values. */
export async function updateItem(itemId: string, body: UpdateItemBody): Promise<void> {
  const res = await fetch(`${API_BASE}/inventory/items/${itemId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(
      await errorMessage(res, `PATCH /inventory/items/${itemId} failed: ${res.status}`)
    );
  }
}

/** POST /inventory/items/{id}/remove — soft delete with a required reason. */
export async function removeItem(
  itemId: string,
  body: { reason: string; note?: string }
): Promise<void> {
  const res = await fetch(`${API_BASE}/inventory/items/${itemId}/remove`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(
      await errorMessage(res, `POST /inventory/items/${itemId}/remove failed: ${res.status}`)
    );
  }
}

/**
 * Direct checkout from inventory (superadmin): add the unit to the caller's
 * current cart, then approve that cart immediately so the checkout is logged
 * through the same path as a normal cart approval.
 */
export async function directCheckout(itemId: string): Promise<void> {
  // Step 1: add to current cart. The backend resolves the caller's active
  // cart (creating one if needed) when the special id "current" is used.
  const addRes = await fetch(`${API_BASE}/transactions/carts/current/items`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ item_id: itemId }),
  });
  // Any non-OK here means the unit was not reserved — including 404, which
  // used to be swallowed and reported as a successful checkout.
  if (!addRes.ok) {
    throw new Error(await errorMessage(addRes, `Add to cart failed: ${addRes.status}`));
  }
  // The endpoint returns `cart_id`; it also returns `cart.id`. Reading only
  // `cart.id` used to yield undefined and fall back to the literal string
  // "current", which the approve route rejected — leaving the unit stranded
  // in `in_cart`: gone from active inventory but never checked out.
  const addBody = (await addRes.json().catch(() => ({}))) as {
    cart_id?: string;
    cart?: { id?: string };
  };
  const cartId = addBody.cart_id ?? addBody.cart?.id;
  if (!cartId) {
    throw new Error(
      'Checkout could not start: the server did not return a cart id. The unit is still reserved — refresh and try again.'
    );
  }

  // Step 2: immediately approve for superadmin.
  const approveRes = await fetch(`${API_BASE}/transactions/carts/${cartId}/approve`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!approveRes.ok) {
    throw new Error(
      await errorMessage(
        approveRes,
        `Approve failed: ${approveRes.status}. The unit is still reserved — refresh before retrying.`
      )
    );
  }
}
