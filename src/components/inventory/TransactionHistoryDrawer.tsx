'use client';

// TransactionHistoryDrawer — right-side drawer that loads an item's full
// transaction history. Per MVP spec § Change Tracking, every log entry shows:
//   - timestamp
//   - action type
//   - actor (user)
//   - old → new diff (for edits)
//   - reason (for removals / expired overrides)
//   - note (when present)
//
// GET /api/items/{id}/transactions on open. Closes via the sheet overlay or
// Esc; emits no side effects.

import { useEffect, useState } from 'react';
import { API_BASE, authHeaders } from '@/lib/apiClient';
import { AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import type { Item, Transaction, TransactionAction } from '@daana-health/inventory-core';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface TxRow extends Transaction {
  actorName?: string | null;
}

interface TransactionHistoryDrawerProps {
  item: Item | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ACTION_LABELS: Record<TransactionAction, string> = {
  check_in: 'Check In',
  check_out: 'Check Out',
  edit: 'Edit',
  remove: 'Remove',
  cart_approved: 'Cart Approved',
  cart_rejected: 'Cart Rejected',
  expired_override: 'Expired Override',
};

const ACTION_CLASSES: Record<TransactionAction, string> = {
  check_in: 'bg-success/10 text-success border-success/30',
  check_out: 'bg-muted text-muted-foreground border-border',
  edit: 'bg-primary/10 text-primary border-primary/30',
  remove: 'bg-destructive/10 text-destructive border-destructive/30',
  cart_approved: 'bg-success/10 text-success border-success/30',
  cart_rejected: 'bg-warning/10 text-warning border-warning/30',
  expired_override: 'bg-destructive/10 text-destructive border-destructive/30',
};

function readAttr(attrs: Item['attributes'] | undefined, key: string): string {
  if (!attrs) return '';
  const v = (attrs as Record<string, unknown>)[key];
  if (v === undefined || v === null) return '';
  return String(v);
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function stringifyValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return '∅';
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

function diffEntries(
  oldValue: Record<string, unknown> | null,
  newValue: Record<string, unknown> | null
): Array<{ key: string; before: unknown; after: unknown }> {
  const keys = new Set<string>([...Object.keys(oldValue ?? {}), ...Object.keys(newValue ?? {})]);
  const out: Array<{ key: string; before: unknown; after: unknown }> = [];
  for (const key of keys) {
    const before = oldValue?.[key];
    const after = newValue?.[key];
    if (JSON.stringify(before) === JSON.stringify(after)) continue;
    out.push({ key, before, after });
  }
  return out;
}

export function TransactionHistoryDrawer({
  item,
  open,
  onOpenChange,
}: TransactionHistoryDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-hidden p-0 sm:max-w-lg">
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b p-6">
            <SheetTitle>Transaction history</SheetTitle>
            <SheetDescription>
              {item ? (
                <span>
                  <span className="font-medium">
                    {readAttr(item.attributes, 'medication_name') || 'Item'}
                  </span>{' '}
                  · <span className="font-mono text-xs">{item.unitCode}</span>
                </span>
              ) : (
                'Audit log for this inventory record.'
              )}
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="p-6">
              <TransactionHistoryList item={item} enabled={open} />
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Fetches + renders an item's transaction log. Extracted from the drawer so the
// item-details modal can reuse the exact same implementation rather than
// duplicating the GET /inventory/items/{id}/transactions call and rendering.
export function TransactionHistoryList({ item, enabled }: { item: Item | null; enabled: boolean }) {
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !item) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setTransactions([]);
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/inventory/items/${item.id}/transactions`, {
          headers: authHeaders(),
        });
        if (!res.ok) {
          if (res.status === 404) {
            if (!cancelled) setTransactions([]);
            return;
          }
          const bodyErr = await res.json().catch(() => ({}));
          throw new Error(
            bodyErr.error || `GET /api/items/${item.id}/transactions failed: ${res.status}`
          );
        }
        const body = (await res.json()) as { transactions?: TxRow[] } | TxRow[];
        const list = Array.isArray(body) ? body : (body.transactions ?? []);
        if (!cancelled) setTransactions(list);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load history.';
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, item]);

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!loading && !error && transactions.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          No transactions recorded yet for this item.
        </p>
      ) : null}

      {transactions.map((tx) => (
        <TxEntry key={tx.id} tx={tx} />
      ))}
    </div>
  );
}

function TxEntry({ tx }: { tx: TxRow }) {
  const diffs = tx.action === 'edit' ? diffEntries(tx.oldValue, tx.newValue) : [];
  return (
    <div className="rounded-md border bg-card p-3 text-sm shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={cn(
            'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
            ACTION_CLASSES[tx.action]
          )}
        >
          {ACTION_LABELS[tx.action]}
        </span>
        <span className="text-xs text-muted-foreground">{formatDateTime(tx.createdAt)}</span>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Actor: <span className="text-foreground">{tx.actorName ?? tx.actorId ?? 'system'}</span>
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
        <div className="mt-3 space-y-1.5 rounded-sm border bg-muted/40 p-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Changes</p>
          {diffs.map((d) => (
            <div key={d.key} className="flex items-start gap-2 text-xs">
              <span className="min-w-[6rem] font-mono text-muted-foreground">{d.key}</span>
              <span className="text-muted-foreground line-through break-all">
                {stringifyValue(d.before)}
              </span>
              <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="break-all text-foreground">{stringifyValue(d.after)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
