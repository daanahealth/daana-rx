import * as React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ITEM_STATUS,
  REQUEST_STATUS,
  CART_STATUS,
  TRANSACTION_ACTION,
  transactionActionMeta,
  TONE_CLASSES,
  type ItemStatus,
  type RequestStatus,
  type CartStatus,
  type StatusMeta,
  type TransactionAction,
  statusLabels,
} from '@/lib/status';

/**
 * StatusChip — the one way a status is shown anywhere in the app.
 *
 *   <StatusChip status="active" />                    // item status (default)
 *   <StatusChip kind="request" status="fulfilled" />  // dispense request
 *   <StatusChip kind="cart" status="approved" />
 *   <StatusChip kind="transaction" status="check_out" />  // audit-log action
 *
 * Tone + label come from src/lib/status.ts; never pass colours in. Sets
 * `data-status` so e2e tests and tables can target it.
 */

type ChipProps<K extends string, S extends string> = {
  kind?: K;
  status: S;
  /** Override the label (e.g. "Pending · 2 units"). */
  label?: string;
  size?: 'sm' | 'md';
} & Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'>;

export type StatusChipProps =
  | ChipProps<'item', ItemStatus>
  | ChipProps<'request', RequestStatus>
  | ChipProps<'cart', CartStatus>
  // Any string: the log must render actions a newer backend adds.
  | ChipProps<'transaction', TransactionAction | (string & {})>;

function metaFor(props: StatusChipProps): StatusMeta {
  switch (props.kind) {
    case 'request':
      return REQUEST_STATUS[props.status];
    case 'cart':
      return CART_STATUS[props.status];
    case 'transaction':
      return props.status in TRANSACTION_ACTION
        ? TRANSACTION_ACTION[props.status as TransactionAction]
        : transactionActionMeta(props.status);
    default:
      return ITEM_STATUS[props.status as ItemStatus];
  }
}

export function StatusChip(props: StatusChipProps) {
  const { kind: _kind, status, label, size = 'md', className, ...rest } = props;
  const meta = metaFor(props);
  const tone = TONE_CLASSES[meta.tone];
  const isDanger = meta.tone === 'danger';

  return (
    <span
      data-status={status}
      title={meta.hint}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-medium',
        size === 'sm' ? 'h-5 px-2 text-xs' : 'h-[22px] px-2 text-xs',
        tone.chip,
        className
      )}
      {...rest}
    >
      {isDanger ? (
        <AlertCircle className="h-3 w-3" aria-hidden="true" />
      ) : (
        <span className={cn('h-1.5 w-1.5 rounded-full', tone.dot)} aria-hidden="true" />
      )}
      <span>{label ?? meta.label}</span>
    </span>
  );
}

export { statusLabels };
