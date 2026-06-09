// cartApi
// -----------------------------------------------------------------------------
// Thin client for the platform `/carts` + `/items` REST endpoints. The shape of
// the responses mirrors the platform `Cart` / `Item` types from
// @daana-health/inventory-core. We deliberately keep this file lightweight (no
// abstractions over fetch beyond the existing apiClient) so feature code can
// import named functions and use them ergonomically.
//
// The 409 returned by the cart-add endpoint when the spec's concurrent-
// checkout race is lost carries the verbatim error string the FE must show.
// To preserve that string, `addItemToCart` rethrows a `ConcurrentConflictError`
// callers can `instanceof`-check instead of fishing the message out.

import type { ItemStatus, CartStatus } from '@daana-health/inventory-core';
import type { CartItemView, ServerCart } from '@/components/cart/CartContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
// Gateway service prefixes. Carts/reports live in the transaction service;
// items/locations live in the inventory service. The gateway strips the
// prefix before forwarding (e.g. /transactions/carts -> transaction svc /carts).
const TX_URL = `${API_URL}/transactions`;
const INV_URL = `${API_URL}/inventory`;

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    try {
      const token = localStorage.getItem('authToken');
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const clinic = localStorage.getItem('clinic');
      if (clinic) {
        const parsed = JSON.parse(clinic) as { clinicId?: string };
        if (parsed.clinicId) headers['x-clinic-id'] = parsed.clinicId;
      }
    } catch {
      // ignore
    }
  }
  return headers;
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
        'This medication has just been checked out. Please refresh and select another unit.',
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
        : 'This medication is expired. Superadmin override required.',
    );
    this.name = 'ExpiredOverrideRequiredError';
    this.itemId = itemId;
    this.needsNote = needsNote;
  }
}

// -----------------------------------------------------------------------------
// Item search (FEFO-sorted active inventory)
// -----------------------------------------------------------------------------

/**
 * Wire-format item from GET /items. The server already FEFO-sorts the list
 * (per spec § "FEFO Logic and Sort Order") and excludes anything that isn't
 * `active` from restricted users; superadmins additionally see `expired` items
 * with the override gate.
 */
export interface PlatformItemDTO {
  id: string;
  unit_code: string;
  status: ItemStatus;
  expiry_date: string | null;
  location?: { code: string | null; name?: string | null } | null;
  location_code?: string | null;
  attributes: Record<string, unknown>;
  created_at: string;
}

export interface SearchItemsParams {
  q: string;
  /** Defaults to "active". Superadmins may pass "active,expired". */
  status?: string;
  limit?: number;
}

export async function searchItems(params: SearchItemsParams): Promise<PlatformItemDTO[]> {
  const search = new URLSearchParams();
  search.set('q', params.q);
  search.set('status', params.status ?? 'active');
  search.set('sort', 'fefo');
  if (params.limit !== undefined) search.set('limit', String(params.limit));
  const res = await fetch(`${INV_URL}/items?${search.toString()}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `Search failed: ${res.status}`);
  }
  const body = (await res.json()) as { items?: PlatformItemDTO[] } | PlatformItemDTO[];
  return Array.isArray(body) ? body : body.items ?? [];
}

// -----------------------------------------------------------------------------
// Cart endpoints
// -----------------------------------------------------------------------------

interface CartDTO {
  id: string;
  owner_id: string;
  owner_name?: string | null;
  status: CartStatus;
  submitted_at: string | null;
  decided_at: string | null;
  expires_at: string | null;
  items?: CartItemDTO[];
}

interface CartItemDTO {
  cart_id?: string;
  item_id: string;
  added_at: string;
  added_by?: string | null;
  added_by_name?: string | null;
  item?: PlatformItemDTO;
}

function toItemView(dto: CartItemDTO): CartItemView {
  const item = dto.item;
  const attrs = (item?.attributes ?? {}) as Record<string, unknown>;
  const str = (k: string): string | null => {
    const v = attrs[k];
    return typeof v === 'string' ? v : v == null ? null : String(v);
  };
  const num = (k: string): number | null => {
    const v = attrs[k];
    return typeof v === 'number' ? v : null;
  };
  return {
    itemId: dto.item_id,
    unitCode: item?.unit_code ?? dto.item_id,
    status: item?.status ?? 'in_cart',
    expiryDate: item?.expiry_date ?? null,
    locationCode: item?.location?.code ?? item?.location_code ?? null,
    medicationName: str('medication_name') ?? str('medicationName') ?? 'Unknown medication',
    dose: str('dose') ?? str('dosage'),
    unit: str('unit'),
    form: str('form'),
    quantity: num('quantity'),
    addedAt: dto.added_at,
    addedBy: dto.added_by_name ?? dto.added_by ?? null,
  };
}

function toServerCart(dto: CartDTO): ServerCart {
  return {
    id: dto.id,
    ownerId: dto.owner_id,
    ownerName: dto.owner_name ?? null,
    status: dto.status,
    submittedAt: dto.submitted_at,
    expiresAt: dto.expires_at,
    items: (dto.items ?? []).map(toItemView),
  };
}

export async function createCart(): Promise<ServerCart> {
  const res = await fetch(`${TX_URL}/carts`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `Create cart failed: ${res.status}`);
  }
  return toServerCart((await res.json()) as CartDTO);
}

export async function getCart(cartId: string): Promise<ServerCart> {
  const res = await fetch(`${TX_URL}/carts/${cartId}`, { headers: authHeaders() });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `Get cart failed: ${res.status}`);
  }
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
  opts: AddToCartOpts = {},
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
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `Remove from cart failed: ${res.status}`);
  }
}

export async function submitCart(cartId: string): Promise<ServerCart> {
  const res = await fetch(`${TX_URL}/carts/${cartId}/submit`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `Submit cart failed: ${res.status}`);
  }
  return toServerCart((await res.json()) as CartDTO);
}

export async function approveCart(cartId: string): Promise<void> {
  const res = await fetch(`${TX_URL}/carts/${cartId}/approve`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `Approve cart failed: ${res.status}`);
  }
}

export async function rejectCart(cartId: string, reason: string): Promise<void> {
  const res = await fetch(`${TX_URL}/carts/${cartId}/reject`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `Reject cart failed: ${res.status}`);
  }
}

export async function listPendingCarts(): Promise<ServerCart[]> {
  // Endpoint convention: GET /carts?status=pending_approval. Returns an array.
  const res = await fetch(`${TX_URL}/carts?status=pending_approval`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    // Not-yet-implemented index endpoint returns 404; surface as empty list.
    if (res.status === 404) return [];
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `List pending carts failed: ${res.status}`);
  }
  const body = (await res.json()) as { carts?: CartDTO[] } | CartDTO[];
  const arr = Array.isArray(body) ? body : body.carts ?? [];
  return arr.map(toServerCart);
}

// Convenience: map a search-result item to the cart-item view shape so the
// sidebar can render an optimistically-added row before the server returns.
export function platformItemToCartItem(
  item: PlatformItemDTO,
  addedAt: string,
  addedBy: string | null,
): CartItemView {
  return toItemView({ item_id: item.id, added_at: addedAt, added_by_name: addedBy, item });
}
