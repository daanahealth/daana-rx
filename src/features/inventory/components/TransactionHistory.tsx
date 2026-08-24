'use client';

// Transaction history — an item's append-only audit log. Per MVP spec
// § Change Tracking every entry shows: timestamp, action, actor, old → new
// diff (edits), reason (removals / expired overrides) and note.
//
// `TransactionHistoryList` is the fetch + render; `TransactionHistoryDrawer`
// wraps it in an EntityDrawer for the row action. The item-details drawer
// embeds the list directly so both surfaces share one implementation.

import { AlertCircle, ArrowRight } from 'lucide-react';
import type { Item, TransactionAction } from '@daana-health/inventory-core';
import { EntityDrawer, DateText, EmptyState } from '@/components/composed';
import { Skeleton } from '@/components/ui/skeleton';
import { useItemTransactions } from '../hooks';
import { diffEntries, medicationName, stringifyValue, type TransactionRow } from '../mappers';

const ACTION_LABELS: Record<TransactionAction, string> = {
  check_in: 'Check In',
  check_out: 'Check Out',
  edit: 'Edit',
  remove: 'Remove',
  cart_approved: 'Cart Approved',
  cart_rejected: 'Cart Rejected',
  expired_override: 'Expired Override',
};

export function TransactionHistoryList({ item, enabled }: { item: Item | null; enabled: boolean }) {
  const { transactions, loading, error } = useItemTransactions(item, enabled);

  if (loading) {
    return (
      <div className="space-y-2" aria-busy>
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState size="sm" icon={AlertCircle} title="Couldn't load history" description={error} />
    );
  }

  if (transactions.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No transactions recorded yet for this item.
      </p>
    );
  }

  return (
    <ol className="divide-y divide-border">
      {transactions.map((tx) => (
        <TxEntry key={tx.id} tx={tx} />
      ))}
    </ol>
  );
}

function TxEntry({ tx }: { tx: TransactionRow }) {
  const diffs = tx.action === 'edit' ? diffEntries(tx.oldValue, tx.newValue) : [];
  return (
    <li className="py-3 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="font-medium text-foreground">{ACTION_LABELS[tx.action] ?? tx.action}</span>
        <DateText value={tx.createdAt} withTime className="text-xs text-muted-foreground" />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        By <span className="text-foreground">{tx.actorName ?? tx.actorId ?? 'system'}</span>
      </p>
      {tx.reason ? (
        <p className="mt-1 text-xs">
          <span className="text-muted-foreground">Reason: </span>
          <span className="text-foreground">{tx.reason}</span>
        </p>
      ) : null}
      {tx.note ? (
        <p className="mt-1 text-xs">
          <span className="text-muted-foreground">Note: </span>
          <span className="text-foreground">{tx.note}</span>
        </p>
      ) : null}
      {diffs.length > 0 ? (
        <dl className="mt-2 space-y-1 rounded-sm border border-border bg-panel p-2">
          {diffs.map((d) => (
            <div key={d.key} className="flex items-start gap-2 text-xs">
              <dt className="min-w-[6rem] font-mono text-muted-foreground">{d.key}</dt>
              <dd className="flex min-w-0 flex-wrap items-center gap-1">
                <span className="break-all text-muted-foreground line-through">
                  {stringifyValue(d.before)}
                </span>
                <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
                <span className="break-all text-foreground">{stringifyValue(d.after)}</span>
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </li>
  );
}

export function TransactionHistoryDrawer({
  item,
  open,
  onOpenChange,
}: {
  item: Item | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <EntityDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Transaction history"
      description={
        item ? (
          <span>
            <span className="font-medium text-foreground">{medicationName(item)}</span>
            {' · '}
            <span className="font-mono text-[0.8125rem]">{item.unitCode}</span>
          </span>
        ) : (
          'Audit log for this inventory record.'
        )
      }
    >
      <TransactionHistoryList item={item} enabled={open} />
    </EntityDrawer>
  );
}
