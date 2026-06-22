'use client';

// ItemDetailsModal — full-detail view for a single inventory unit:
//   - a QR code encoding the unit's unique DRX code (scan to look it up)
//   - the unit's attribute/detail summary (incl. quantity)
//   - its full transaction history (reuses TransactionHistoryList)
//   - a quick-checkout action (superadmin only)
//
// The modal is read-only except for quick checkout, which hands off to the
// page's existing superadmin-gated checkout flow so the MVP spec rules
// (superadmin approval + transaction logging) are preserved in one place.

import { QRCodeSVG } from 'qrcode.react';
import { ShoppingCart } from 'lucide-react';
import type { Item } from '@daana-health/inventory-core';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { StatusChip } from '@/components/ui/status-chip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { TransactionHistoryList } from './TransactionHistoryDrawer';

// The inventory list hydrates a denormalized location code onto each row.
type DetailsItem = Item & { locationCode?: string | null };

interface ItemDetailsModalProps {
  item: DetailsItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSuperadmin: boolean;
  // Hands off to the page's superadmin-gated checkout confirmation flow.
  onCheckout: () => void;
}

function readAttr(attrs: Item['attributes'] | undefined, key: string): string {
  if (!attrs) return '';
  const v = (attrs as Record<string, unknown>)[key];
  if (v === undefined || v === null) return '';
  return String(v);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
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
}: ItemDetailsModalProps) {
  const terminal = item?.status === 'checked_out' || item?.status === 'removed';
  const medName = item ? readAttr(item.attributes, 'medication_name') || 'Item' : 'Item';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl gap-0 overflow-hidden p-0">
        <div className="flex max-h-[90vh] flex-col">
          <DialogHeader className="border-b p-6 text-left">
            <DialogTitle className="flex flex-wrap items-center gap-2">
              {medName}
              {item ? <StatusChip status={item.status} /> : null}
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">{item?.unitCode}</DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1">
            <div className="space-y-6 p-6">
              {item ? (
                <div className="grid gap-6 sm:grid-cols-[1fr_auto]">
                  {/* Detail summary */}
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
                    <dd className={cn(isExpired(item) && 'font-medium text-destructive')}>
                      {formatDate(item.expiryDate)}
                    </dd>
                  </dl>

                  {/* QR code of the unique DRX code */}
                  <div className="flex flex-col items-center gap-2 justify-self-center">
                    <div className="rounded-lg border bg-white p-3">
                      <QRCodeSVG value={item.unitCode} size={132} />
                    </div>
                    <span className="text-[11px] text-muted-foreground">Scan to look up unit</span>
                  </div>
                </div>
              ) : null}

              <Separator />

              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Transaction history</h3>
                <TransactionHistoryList item={item} enabled={open} />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="gap-2 border-t p-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {isSuperadmin ? (
              <Button onClick={onCheckout} disabled={terminal}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Quick checkout
              </Button>
            ) : null}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
