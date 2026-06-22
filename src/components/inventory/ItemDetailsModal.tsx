'use client';

// ItemDetailsModal — at-a-glance detail view for a single inventory unit.
//
// Surfaces three things the inventory table can't show inline (MVP spec
// § Inventory Tab / § Change Tracking):
//   - QR code: encodes the unit's unique DRX code (unit-level identity) so a
//     unit can be scanned straight from the screen.
//   - Transaction history: a compact, most-recent-first view of the unit's
//     audit log (GET /inventory/items/{id}/transactions). "View full history"
//     hands off to the TransactionHistoryDrawer for the detailed diff view.
//   - Quick checkout: superadmin-gated per spec. Superadmins get a one-step
//     checkout (add-to-cart + approve, run by the parent); restricted users can
//     only add the unit to their cart for superadmin approval — never a direct
//     checkout. The button label/behavior is chosen by the parent via onCheckout.

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { AlertCircle, History, Loader2, ShoppingCart } from 'lucide-react';
import type {
  Item,
  Transaction,
  TransactionAction,
} from '@daana-health/inventory-core';
import { API_BASE, authHeaders } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { StatusChip } from '@/components/ui/status-chip';
import { cn } from '@/lib/utils';

// Accepts the page's InventoryRow (Item + optional denormalized display fields).
export type DetailsItem = Item & {
  dateReceived?: string | null;
  checkedInAt?: string | null;
  checkedInByName?: string | null;
  createdByName?: string | null;
  locationCode?: string | null;
};

interface ItemDetailsModalProps {
  item: DetailsItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSuperadmin: boolean;
  /** Runs the spec-compliant checkout/add-to-cart for this unit (parent-owned). */
  onCheckout: () => void;
  checkingOut?: boolean;
  /** Opens the full TransactionHistoryDrawer for the detailed diff view. */
  onViewFullHistory?: () => void;
}

interface TxRow extends Transaction {
  actorName?: string | null;
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

function readAttr(attrs: Item['attributes'] | undefined, key: string): string {
  if (!attrs) return '';
  const v = (attrs as Record<string, unknown>)[key];
  if (v === undefined || v === null) return '';
  return String(v);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

function isExpired(item: DetailsItem): boolean {
  if (!item.expiryDate) return false;
  const d = new Date(item.expiryDate);
  return !Number.isNaN(d.getTime()) && d.getTime() < Date.now();
}

export function ItemDetailsModal({
  item,
  open,
  onOpenChange,
  isSuperadmin,
  onCheckout,
  checkingOut = false,
  onViewFullHistory,
}: ItemDetailsModalProps) {
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the unit's audit log when the modal opens.
  useEffect(() => {
    if (!open || !item) return;
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
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Failed to load history: ${res.status}`);
        }
        const body = (await res.json()) as { transactions?: TxRow[] } | TxRow[];
        const list = Array.isArray(body) ? body : body.transactions ?? [];
        if (!cancelled) setTransactions(list);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load history.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, item]);

  if (!item) return null;

  const expired = isExpired(item);
  const terminal = item.status === 'checked_out' || item.status === 'removed';
  const medName = readAttr(item.attributes, 'medication_name') || 'Item';
  const recent = transactions.slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{medName}</DialogTitle>
          <DialogDescription>
            <span className="font-mono text-xs">{item.unitCode}</span> ·{' '}
            <StatusChip status={item.status} />
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-[auto_1fr]">
          {/* QR code — encodes the unit's unique DRX code for scanning. */}
          <div className="flex flex-col items-center gap-2">
            <div className="rounded-md border bg-white p-3">
              <QRCodeSVG value={item.unitCode} size={148} level="M" />
            </div>
            <span className="font-mono text-[11px] text-muted-foreground">{item.unitCode}</span>
          </div>

          {/* Key details */}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Dosage</dt>
            <dd>{readAttr(item.attributes, 'dosage') || '—'}</dd>
            <dt className="text-muted-foreground">Unit</dt>
            <dd>{readAttr(item.attributes, 'unit') || '—'}</dd>
            <dt className="text-muted-foreground">Form</dt>
            <dd>{readAttr(item.attributes, 'form') || '—'}</dd>
            <dt className="text-muted-foreground">Quantity</dt>
            <dd>{readAttr(item.attributes, 'quantity') || '—'}</dd>
            <dt className="text-muted-foreground">Location</dt>
            <dd>{item.locationCode ?? '—'}</dd>
            <dt className="text-muted-foreground">Expiry</dt>
            <dd className={cn(expired && 'font-medium text-destructive')}>
              {formatDate(item.expiryDate)}
            </dd>
            <dt className="text-muted-foreground">Date received</dt>
            <dd>{formatDate(item.dateReceived ?? item.createdAt)}</dd>
            <dt className="text-muted-foreground">Checked in</dt>
            <dd>{formatDateTime(item.checkedInAt ?? item.createdAt)}</dd>
            <dt className="text-muted-foreground">Checked in by</dt>
            <dd>{item.checkedInByName ?? item.createdByName ?? '—'}</dd>
          </dl>
        </div>

        {/* Transaction history (compact, most recent first) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              <History className="h-4 w-4" />
              Transaction history
            </h3>
            {onViewFullHistory && transactions.length > 0 ? (
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onViewFullHistory}>
                View full history
              </Button>
            ) : null}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : null}

          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {!loading && !error && recent.length === 0 ? (
            <p className="py-3 text-center text-sm text-muted-foreground">
              No transactions recorded yet for this item.
            </p>
          ) : null}

          {recent.length > 0 ? (
            <ul className="divide-y rounded-md border">
              {recent.map((tx) => (
                <li key={tx.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className="font-medium">{ACTION_LABELS[tx.action] ?? tx.action}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {tx.actorName ?? tx.actorId ?? 'system'}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDateTime(tx.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={checkingOut}>
            Close
          </Button>
          <Button onClick={onCheckout} disabled={checkingOut || terminal}>
            {checkingOut ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ShoppingCart className="mr-2 h-4 w-4" />
            )}
            {isSuperadmin ? 'Quick checkout' : 'Add to cart'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
