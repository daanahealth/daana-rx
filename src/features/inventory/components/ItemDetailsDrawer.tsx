'use client';

// ItemDetailsDrawer — the full view of one unit: a QR code of its DRX code
// (scan to look it up), the attribute summary, its transaction history and a
// quick-checkout action (superadmin only). Read-only otherwise; quick checkout
// hands off to the screen's checkout confirmation so approval + logging stay
// in one place.

import { QRCodeSVG } from 'qrcode.react';
import { ShoppingCart } from 'lucide-react';
import { EntityDrawer, KeyValueList, DateText, StatusChip } from '@/components/composed';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { checkedInBy, isTerminal, medicationName, readAttr, type InventoryRow } from '../mappers';
import { TransactionHistoryList } from './TransactionHistory';

interface ItemDetailsDrawerProps {
  item: InventoryRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSuperadmin: boolean;
  onCheckout: () => void;
}

export function ItemDetailsDrawer({
  item,
  open,
  onOpenChange,
  isSuperadmin,
  onCheckout,
}: ItemDetailsDrawerProps) {
  const terminal = item ? isTerminal(item) : true;

  return (
    <EntityDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={item ? medicationName(item) : 'Item'}
      description={
        item ? (
          <span className="flex flex-wrap items-center gap-2">
            <StatusChip status={item.status} />
            <span className="font-mono text-[0.8125rem] text-foreground">{item.unitCode}</span>
          </span>
        ) : undefined
      }
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {isSuperadmin ? (
            <Button onClick={onCheckout} disabled={terminal}>
              <ShoppingCart aria-hidden />
              Quick checkout
            </Button>
          ) : null}
        </>
      }
    >
      {item ? (
        <div className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-[1fr_auto]">
            <KeyValueList
              items={[
                { label: 'Dosage', value: readAttr(item.attributes, 'dosage') || '—' },
                { label: 'Unit', value: readAttr(item.attributes, 'unit') || '—' },
                { label: 'Form', value: readAttr(item.attributes, 'form') || '—' },
                { label: 'Quantity', value: readAttr(item.attributes, 'quantity') || '—' },
                { label: 'Location', value: item.locationCode ?? '—' },
                { label: 'Expiry', value: <DateText value={item.expiryDate} expiry /> },
                {
                  label: 'Received',
                  value: <DateText value={item.dateReceived ?? item.createdAt} />,
                },
                {
                  label: 'Checked in',
                  value: <DateText value={item.checkedInAt ?? item.createdAt} withTime />,
                },
                { label: 'Checked in by', value: checkedInBy(item) ?? '—' },
                { label: 'Last edited by', value: item.lastEditedByName ?? '—' },
                { label: 'Last edited', value: <DateText value={item.lastEditedAt} withTime /> },
                ...(readAttr(item.attributes, 'notes')
                  ? [{ label: 'Notes', value: readAttr(item.attributes, 'notes'), wide: true }]
                  : []),
              ]}
            />
            {/* QR of the unique DRX code. The SVG paints its own white ground so it scans in dark mode too. */}
            <figure className="flex flex-col items-center gap-2 justify-self-center">
              <div className="rounded-md border border-border p-3">
                <QRCodeSVG value={item.unitCode} size={132} />
              </div>
              <figcaption className="text-xs text-muted-foreground">
                Scan to look up unit
              </figcaption>
            </figure>
          </div>

          <Separator />

          <section className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">Transaction history</h3>
            <TransactionHistoryList item={item} enabled={open} />
          </section>
        </div>
      ) : null}
    </EntityDrawer>
  );
}
