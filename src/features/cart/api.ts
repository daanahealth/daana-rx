// Cart API — the only file that knows the /carts URLs.
// -----------------------------------------------------------------------------
// Thin client for the platform `/carts` + `/items` REST endpoints. Responses
// mirror the platform `Cart` / `Item` types from @daana-health/inventory-core
// and are mapped to view models in ./mappers.
//
// The 409 returned by the cart-add endpoint when the spec's concurrent-
// checkout race is lost carries the verbatim error string the FE must show.
// To preserve that string, `addItemToCart` rethrows a `ConcurrentConflictError`
// callers can `instanceof`-check instead of fishing the message out.

import type { ItemStatus } from '@daana-health/inventory-core';
import { API_BASE, authHeaders } from '@/lib/apiClient';
import { toServerCart, type CartDTO, type ServerCart } from './mappers';

// Gateway service prefix. Carts live in the transaction service; the gateway
// strips the prefix before forwarding (/transactions/carts -> /carts).
const TX_URL = `${API_BASE}/transactions`;

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  return body.error || `${fallback}: ${res.status}`;
}

// -----------------------------------------------------------------------------
// Error types
// -----------------------------------------------------------------------------

/**
 * Thrown when a cart-add request loses the spec's concurrent-checkout race.
 * The `message` is the spec's literal user-visible string.
 */
export class ConcurrentConflictError extends Error {
  readonly itemId: string;
  constructor(itemId: string, message?: string) {
    super(
      message ??
        'This medication has just been checked out. Please refresh and select another unit.'
    );
    this.name = 'ConcurrentConflictError';
    this.itemId = itemId;
  }
}

/** Thrown when an expired item add lacks the superadmin override flag/note. */
export class ExpiredOverrideRequiredError extends Error {
  readonly itemId: string;
  readonly needsNote: boolean;
  constructor(itemId: string, needsNote: boolean) {
    super(
      needsNote
        ? 'A mandatory note is required to override an expired medication.'
        : 'This medication is expired. Superadmin override required.'
    );
    this.name = 'ExpiredOverrideRequiredError';
    this.itemId = itemId;
    this.needsNote = needsNote;
  }
}

// -----------------------------------------------------------------------------
// Cart endpoints
// -----------------------------------------------------------------------------

/**
 * Resolve the caller's open cart, creating one server-side only if none
 * exists. This is the page bootstrap call (PR #11): `POST /carts` minted a NEW
 * cart on every mount, which diverged from the cart the server considers
 * "current" (the newest open one) — so items added from the inventory page and
 * items added here landed in different carts, and abandoned carts piled up
 * until their 24h TTL expired. Never bootstrap with `createCart()`.
 */
export async function getCurrentCart(): Promise<ServerCart> {
  const res = await fetch(`${TX_URL}/carts/current`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await errorMessage(res, 'Load cart failed'));
  return toServerCart((await res.json()) as CartDTO);
}

/** Explicitly mint a new cart. Not used for bootstrap — see getCurrentCart. */
export async function createCart(): Promise<ServerCart> {
  const res = await fetch(`${TX_URL}/carts`, { method: 'POST', headers: authHeaders() });
  if (!res.ok) throw new Error(await errorMessage(res, 'Create cart failed'));
  return toServerCart((await res.json()) as CartDTO);
}

export async function getCart(cartId: string): Promise<ServerCart> {
  const res = await fetch(`${TX_URL}/carts/${cartId}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await errorMessage(res, 'Get cart failed'));
  return toServerCart((await res.json()) as CartDTO);
}

export interface AddToCartOpts {
  /** Superadmin-only: enable expired override and include note. */
  override?: boolean;
  note?: string;
}

export async function addItemToCart(
  cartId: string,
  itemId: string,
  opts: AddToCartOpts = {}
): Promise<{ status: ItemStatus; addedAt: string }> {
  const qs = new URLSearchParams();
  if (opts.override) {
    qs.set('override', 'true');
    if (opts.note) qs.set('note', opts.note);
  }
  const url = `${TX_URL}/carts/${cartId}/items${qs.toString() ? `?${qs}` : ''}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ item_id: itemId }),
  });
  if (res.ok) {
    const body = (await res.json()) as { status: ItemStatus; added_at: string };
    return { status: body.status, addedAt: body.added_at };
  }
  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    conflict?: string;
    override_required?: boolean;
    override_required_note?: boolean;
  };
  if (res.status === 409 && body.conflict === 'concurrent_checkout') {
    throw new ConcurrentConflictError(itemId, body.error);
  }
  if (res.status === 403 && body.override_required) {
    throw new ExpiredOverrideRequiredError(itemId, false);
  }
  if (res.status === 400 && body.override_required_note) {
    throw new ExpiredOverrideRequiredError(itemId, true);
  }
  throw new Error(body.error || `Add to cart failed: ${res.status}`);
}

export async function removeItemFromCart(cartId: string, itemId: string): Promise<void> {
  const res = await fetch(`${TX_URL}/carts/${cartId}/items/${itemId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await errorMessage(res, 'Remove from cart failed'));
}

export async function submitCart(cartId: string): Promise<ServerCart> {
  const res = await fetch(`${TX_URL}/carts/${cartId}/submit`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await errorMessage(res, 'Submit cart failed'));
  return toServerCart((await res.json()) as CartDTO);
}

export async function approveCart(cartId: string): Promise<void> {
  const res = await fetch(`${TX_URL}/carts/${cartId}/approve`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await errorMessage(res, 'Approve cart failed'));
}

export async function rejectCart(cartId: string, reason: string): Promise<void> {
  const res = await fetch(`${TX_URL}/carts/${cartId}/reject`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, 'Reject cart failed'));
}

export async function listPendingCarts(): Promise<ServerCart[]> {
  // Endpoint convention: GET /carts?status=pending_approval. Returns an array.
  const res = await fetch(`${TX_URL}/carts?status=pending_approval`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    // Not-yet-implemented index endpoint returns 404; surface as empty list.
    if (res.status === 404) return [];
    throw new Error(await errorMessage(res, 'List pending carts failed'));
  }
  const body = (await res.json()) as { carts?: CartDTO[] } | CartDTO[];
  const arr = Array.isArray(body) ? body : (body.carts ?? []);
  return arr.map(toServerCart);
}
