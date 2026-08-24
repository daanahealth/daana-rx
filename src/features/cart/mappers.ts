// Cart mappers — wire (platform /carts + /items DTOs) → view models.
// -----------------------------------------------------------------------------
// The only place that knows the snake_case shape of the transaction service's
// cart responses. Everything above (context, drawer, cards) reads the camelCase
// view types exported here.

import type { ItemStatus, CartStatus } from '@daana-health/inventory-core';

// -----------------------------------------------------------------------------
// Wire types
// -----------------------------------------------------------------------------

/**
 * Wire-format item from GET /items. The server already FEFO-sorts the list
 * (per spec § "FEFO Logic and Sort Order") and excludes anything that isn't
 * `active` from restricted users; superadmins additionally see `expired` items
 * behind the override gate.
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

export interface CartItemDTO {
  cart_id?: string;
  item_id: string;
  added_at: string;
  added_by?: string | null;
  added_by_name?: string | null;
  item?: PlatformItemDTO;
}

export interface CartDTO {
  id: string;
  owner_id: string;
  owner_name?: string | null;
  status: CartStatus;
  submitted_at: string | null;
  decided_at: string | null;
  expires_at: string | null;
  items?: CartItemDTO[];
}

// -----------------------------------------------------------------------------
// View types
// -----------------------------------------------------------------------------

export interface CartItemView {
  /** Server-side platform item id (uuid). */
  readonly itemId: string;
  /** DRX unit code, e.g. DRX-MASS-CARDIO1-00042. */
  readonly unitCode: string;
  readonly status: ItemStatus;
  readonly expiryDate: string | null;
  readonly locationCode: string | null;
  readonly medicationName: string;
  readonly dose: string | null;
  readonly unit: string | null;
  readonly form: string | null;
  readonly quantity: number | null;
  /** ISO timestamp the item was added to the cart. */
  readonly addedAt: string;
  /** Display name of the user who added the item. */
  readonly addedBy: string | null;
}

export interface ServerCart {
  readonly id: string;
  readonly ownerId: string;
  readonly ownerName?: string | null;
  readonly status: CartStatus;
  readonly submittedAt: string | null;
  readonly expiresAt: string | null;
  readonly items: readonly CartItemView[];
}

// -----------------------------------------------------------------------------
// Attribute readers (platform items keep medication fields in `attributes`)
// -----------------------------------------------------------------------------

export function attrString(attrs: Record<string, unknown>, key: string): string | null {
  const v = attrs[key];
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return null;
}

export function attrNumber(attrs: Record<string, unknown>, key: string): number | null {
  const v = attrs[key];
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return null;
}

export function medicationNameOf(item: Pick<PlatformItemDTO, 'attributes'>): string {
  const attrs = item.attributes ?? {};
  return (
    attrString(attrs, 'medication_name') ??
    attrString(attrs, 'medicationName') ??
    'Unknown medication'
  );
}

export function locationCodeOf(
  item: Pick<PlatformItemDTO, 'location' | 'location_code'>
): string | null {
  return item.location?.code ?? item.location_code ?? item.location?.name ?? null;
}

/** "500 mg" from separate dose + unit attributes; null when there is no dose. */
export function doseLabel(dose: string | null, unit: string | null): string | null {
  if (!dose) return null;
  return unit ? `${dose} ${unit}` : dose;
}

/** "500 mg · Tablet · Qty 3" — the one-line subtitle under a medication name. */
export function itemSubtitle(view: {
  dose: string | null;
  unit: string | null;
  form: string | null;
  quantity: number | null;
}): string {
  return [
    doseLabel(view.dose, view.unit),
    view.form,
    view.quantity != null ? `Qty ${view.quantity}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

// -----------------------------------------------------------------------------
// DTO → view
// -----------------------------------------------------------------------------

export function toItemView(dto: CartItemDTO): CartItemView {
  const item = dto.item;
  const attrs = (item?.attributes ?? {}) as Record<string, unknown>;
  return {
    itemId: dto.item_id,
    unitCode: item?.unit_code ?? dto.item_id,
    status: item?.status ?? 'in_cart',
    expiryDate: item?.expiry_date ?? null,
    locationCode: item ? (item.location?.code ?? item.location_code ?? null) : null,
    medicationName: item ? medicationNameOf(item) : 'Unknown medication',
    dose: attrString(attrs, 'dose') ?? attrString(attrs, 'dosage'),
    unit: attrString(attrs, 'unit'),
    form: attrString(attrs, 'form'),
    quantity: attrNumber(attrs, 'quantity'),
    addedAt: dto.added_at,
    addedBy: dto.added_by_name ?? dto.added_by ?? null,
  };
}

export function toServerCart(dto: CartDTO): ServerCart {
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

/**
 * Map a search-result item to the cart-item view shape so the drawer can
 * render an optimistically-added row before the server returns.
 */
export function platformItemToCartItem(
  item: PlatformItemDTO,
  addedAt: string,
  addedBy: string | null
): CartItemView {
  return toItemView({ item_id: item.id, added_at: addedAt, added_by_name: addedBy, item });
}

/**
 * A placeholder cart for when the server cart could not be loaded. Its empty
 * id keeps every Add button disabled until a refresh succeeds.
 */
export function unavailableCart(ownerId: string, ownerName: string | null): ServerCart {
  return {
    id: '',
    ownerId,
    ownerName,
    status: 'active',
    submittedAt: null,
    expiresAt: null,
    items: [],
  };
}
