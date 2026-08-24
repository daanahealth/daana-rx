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

/**
 * Transaction actions — the audit-log vocabulary. inventory-core's
 * TransactionAction plus the request lifecycle actions added by backend
 * migration 005 (request_* / unit_returned). Additive: unknown actions still
 * render (see transactionActionMeta) so a newer backend never blanks a row.
 */
export type TransactionAction =
  | 'check_in'
  | 'check_out'
  | 'edit'
  | 'remove'
  | 'cart_approved'
  | 'cart_rejected'
  | 'expired_override'
  | 'request_created'
  | 'request_fulfilled'
  | 'request_denied'
  | 'request_cancelled'
  | 'request_expired'
  | 'unit_returned'
  // Legacy units-table transaction types (/transactions/all).
  | 'adjust';

export const TRANSACTION_ACTION: Record<TransactionAction, StatusMeta> = {
  check_in: { label: 'Check In', tone: 'ok', hint: 'Unit added to the shelf.' },
  check_out: { label: 'Check Out', tone: 'info', hint: 'Unit dispensed.' },
  edit: { label: 'Edit', tone: 'quiet', hint: 'Unit details changed.' },
  remove: { label: 'Remove', tone: 'danger', hint: 'Unit taken out of inventory.' },
  cart_approved: { label: 'Cart Approved', tone: 'ok', hint: 'Cart checkout approved.' },
  cart_rejected: { label: 'Cart Rejected', tone: 'danger', hint: 'Cart checkout declined.' },
  expired_override: {
    label: 'Expired Override',
    tone: 'warn',
    hint: 'Expired unit dispensed with an override.',
  },
  request_created: { label: 'Request Created', tone: 'warn', hint: 'Provider raised a request.' },
  request_fulfilled: { label: 'Request Fulfilled', tone: 'ok', hint: 'Request dispensed.' },
  request_denied: { label: 'Request Denied', tone: 'danger', hint: 'Request declined.' },
  request_cancelled: {
    label: 'Request Cancelled',
    tone: 'quiet',
    hint: 'Request withdrawn by the provider.',
  },
  request_expired: {
    label: 'Request Expired',
    tone: 'quiet',
    hint: 'Request timed out at end of day.',
  },
  unit_returned: {
    label: 'Unit Returned',
    tone: 'info',
    hint: 'Reserved unit put back on the shelf.',
  },
  adjust: { label: 'Adjustment', tone: 'quiet', hint: 'Quantity adjusted.' },
};

/** Human label for any action string; unknown actions are title-cased. */
export function transactionActionMeta(action: string | null | undefined): StatusMeta {
  if (action && action in TRANSACTION_ACTION)
    return TRANSACTION_ACTION[action as TransactionAction];
  const label = (action ?? '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
  return { label: label || 'Unknown', tone: 'quiet', hint: 'Unrecognised transaction action.' };
}

/**
 * Who wrote a transaction (spec B4). Humans are 'user'; automated jobs are
 * labelled so the log never shows a blank actor.
 */
export type ActorKind = 'user' | 'system_ttl' | 'system_expiry_sweep';

export const ACTOR_KIND_LABEL: Record<Exclude<ActorKind, 'user'>, string> = {
  system_ttl: 'System (TTL)',
  system_expiry_sweep: 'System (expiry sweep)',
};

export const ITEM_STATUSES = Object.keys(ITEM_STATUS) as ItemStatus[];
export const TRANSACTION_ACTIONS = Object.keys(TRANSACTION_ACTION) as TransactionAction[];
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
