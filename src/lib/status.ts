/**
 * Status vocabulary — the closed set of statuses the UI knows how to render,
 * and the tone each one maps to. StatusChip, DataTable and the queue read
 * from here; nothing else invents a status colour (DESIGN.md: Status
 * Monopoly Rule).
 *
 * Item statuses come from @daana-health/inventory-core (the engine's state
 * machine). Request statuses are the provider dispense-request lifecycle
 * (Provider spec §6).
 */
import type { ItemStatus } from '@daana-health/inventory-core';

export type { ItemStatus };

export type RequestStatus = 'pending' | 'fulfilled' | 'denied' | 'expired' | 'cancelled';

export type CartStatus = 'active' | 'pending_approval' | 'approved' | 'rejected' | 'expired';

/** The five semantic tones defined in globals.css. */
export type Tone = 'ok' | 'info' | 'warn' | 'danger' | 'quiet';

export interface StatusMeta {
  label: string;
  tone: Tone;
  /** One-line meaning, for tooltips and empty states. */
  hint: string;
}

export const ITEM_STATUS: Record<ItemStatus, StatusMeta> = {
  active: { label: 'Active', tone: 'ok', hint: 'On the shelf and available.' },
  in_cart: { label: 'In Cart', tone: 'info', hint: 'Reserved in a superadmin cart.' },
  pending_approval: {
    label: 'Pending Approval',
    tone: 'warn',
    hint: 'Reserved for a request awaiting a superadmin.',
  },
  checked_out: { label: 'Checked Out', tone: 'quiet', hint: 'Dispensed; no longer on the shelf.' },
  removed: { label: 'Removed', tone: 'quiet', hint: 'Taken out of inventory with a reason.' },
  expired: { label: 'Expired', tone: 'danger', hint: 'Past its expiry date; not dispensable.' },
};

export const REQUEST_STATUS: Record<RequestStatus, StatusMeta> = {
  pending: { label: 'Pending', tone: 'warn', hint: 'Waiting for a volunteer to fulfill.' },
  fulfilled: { label: 'Fulfilled', tone: 'ok', hint: 'Dispensed by a volunteer.' },
  denied: { label: 'Denied', tone: 'danger', hint: 'Declined with a reason; units released.' },
  expired: { label: 'Expired', tone: 'quiet', hint: 'Not fulfilled by end of clinic day.' },
  cancelled: { label: 'Cancelled', tone: 'quiet', hint: 'Withdrawn by the provider.' },
};

export const CART_STATUS: Record<CartStatus, StatusMeta> = {
  active: { label: 'Open', tone: 'info', hint: 'Being built.' },
  pending_approval: { label: 'Pending Approval', tone: 'warn', hint: 'Submitted for approval.' },
  approved: { label: 'Approved', tone: 'ok', hint: 'Checked out.' },
  rejected: { label: 'Rejected', tone: 'danger', hint: 'Declined by a superadmin.' },
  expired: { label: 'Expired', tone: 'quiet', hint: 'Timed out; units released.' },
};

export const ITEM_STATUSES = Object.keys(ITEM_STATUS) as ItemStatus[];
export const REQUEST_STATUSES = Object.keys(REQUEST_STATUS) as RequestStatus[];

export function isItemStatus(value: unknown): value is ItemStatus {
  return typeof value === 'string' && value in ITEM_STATUS;
}

export function isRequestStatus(value: unknown): value is RequestStatus {
  return typeof value === 'string' && value in REQUEST_STATUS;
}

/** Tailwind classes for a tone: wash background + tone text. */
export const TONE_CLASSES: Record<Tone, { chip: string; dot: string; text: string }> = {
  ok: { chip: 'bg-ok-wash text-ok', dot: 'bg-ok', text: 'text-ok' },
  info: { chip: 'bg-info-wash text-info', dot: 'bg-info', text: 'text-info' },
  warn: { chip: 'bg-warn-wash text-warn', dot: 'bg-warn', text: 'text-warn' },
  danger: { chip: 'bg-danger-wash text-danger', dot: 'bg-danger', text: 'text-danger' },
  quiet: { chip: 'bg-quiet-wash text-quiet', dot: 'bg-quiet', text: 'text-quiet' },
};

/** Legacy export kept for existing imports of `statusLabels`. */
export const statusLabels: Record<ItemStatus, string> = Object.fromEntries(
  ITEM_STATUSES.map((s) => [s, ITEM_STATUS[s].label])
) as Record<ItemStatus, string>;
