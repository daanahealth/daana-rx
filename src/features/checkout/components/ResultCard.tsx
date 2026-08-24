'use client';

// ResultCard
// -----------------------------------------------------------------------------
// One card per medication unit in the Check Out search results, per spec
// § "Result Cards": name, dose, form, quantity, expiry, location, DRX code.
// Actions: add to cart ("Check Out" for superadmins) and "View in Inventory".
//
// Restricted users never see expired units (the search endpoint filters them
// out), but if one slips through we hide it defensively here. Superadmins see
// expired units flagged and route them through the override dialog (the
// parent owns the dialog — this card emits an event).

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DateText, KeyValueList, StatusChip } from '@/components/composed';
import { AddToCartButton } from '@/features/cart/components/AddToCartButton';
import type { PlatformItemDTO } from '@/features/cart/mappers';
import { toResultView } from '../mappers';

export interface ResultCardProps {
  readonly item: PlatformItemDTO;
  readonly cartId: string | null;
  readonly isSuperadmin: boolean;
  /** If false, expired items are hidden. */
  readonly allowExpired?: boolean;
  readonly addedByName?: string | null;
  /** Trigger the expired-override dialog upstream. */
  readonly onRequestExpiredOverride?: (item: PlatformItemDTO) => void;
}

export function ResultCard({
  item,
  cartId,
  isSuperadmin,
  allowExpired = false,
  addedByName,
  onRequestExpiredOverride,
}: ResultCardProps) {
  const view = toResultView(item);
  if (view.isExpired && !allowExpired) return null;

  const subtitle = [view.dose, view.form, view.quantity != null ? `Qty ${view.quantity}` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <article
      data-status={view.status}
      className="space-y-4 rounded-md border border-border bg-card p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-base font-semibold leading-snug text-foreground">
            {view.medicationName}
          </h3>
          {subtitle ? <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        <StatusChip status={view.status} />
      </div>

      <KeyValueList
        columns={3}
        items={[
          { label: 'Expiry', value: <DateText value={view.expiryDate} expiry /> },
          { label: 'Location', value: view.locationCode },
          { label: 'DRX code', value: view.unitCode, code: true },
        ]}
      />

      {view.isExpired ? (
        <p className="text-sm text-danger">
          Expired medication. Superadmin override required with a mandatory note.
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        {view.isExpired ? (
          isSuperadmin ? (
            <Button
              variant="destructive"
              size="touch"
              className="sm:h-9 sm:text-sm"
              onClick={() => onRequestExpiredOverride?.(item)}
            >
              Override and Check Out
            </Button>
          ) : null
        ) : (
          <AddToCartButton
            item={item}
            cartId={cartId}
            isSuperadmin={isSuperadmin}
            addedByName={addedByName}
            onRequestOverride={onRequestExpiredOverride}
            className="sm:h-9 sm:text-sm"
          />
        )}
        <Button asChild variant="outline" size="touch" className="sm:h-9 sm:text-sm">
          <Link href={`/inventory?unitId=${encodeURIComponent(item.id)}`}>
            <ExternalLink aria-hidden />
            View in Inventory
          </Link>
        </Button>
      </div>
    </article>
  );
}
