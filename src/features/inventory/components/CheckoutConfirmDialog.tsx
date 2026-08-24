'use client';

// Direct checkout confirmation (superadmin only). Confirming adds the unit to
// the caller's cart and approves it immediately — the unit leaves active
// inventory and a transaction is logged.

import { EntityDrawer, KeyValueList, DateText } from '@/components/composed';
import { Button } from '@/components/ui/button';
import { doseLine, medicationName, type InventoryRow } from '../mappers';

interface CheckoutConfirmDialogProps {
  item: InventoryRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  busy: boolean;
  isSuperadmin: boolean;
}

export function CheckoutConfirmDialog({
  item,
  open,
  onOpenChange,
  onConfirm,
  busy,
  isSuperadmin,
}: CheckoutConfirmDialogProps) {
  return (
    <EntityDrawer
      open={open}
      onOpenChange={onOpenChange}
      desktop="dialog"
      title="Check out medication"
      description="Confirm the details below. This moves the unit out of active inventory and logs a transaction."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={onConfirm} loading={busy} disabled={!isSuperadmin}>
            Confirm checkout
          </Button>
        </>
      }
    >
      {item ? (
        <KeyValueList
          columns="inline"
          items={[
            { label: 'Medication', value: medicationName(item, '—') },
            { label: 'Dose', value: doseLine(item) || '—' },
            { label: 'Expiry', value: <DateText value={item.expiryDate} expiry /> },
            { label: 'Location', value: item.locationCode ?? '—' },
            { label: 'DRX code', value: item.unitCode, code: true },
          ]}
        />
      ) : null}
    </EntityDrawer>
  );
}
