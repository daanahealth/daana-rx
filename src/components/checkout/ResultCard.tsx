'use client';

// ResultCard
// -----------------------------------------------------------------------------
// One card per medication unit in the Check Out search results, per spec
// § "Result Cards":
//   * Medication name
//   * Dosage and unit
//   * Form
//   * Quantity / unit count
//   * Expiry date
//   * Location
//   * DaanaRX code
// Actions: "Check Out" (adds to cart) and "View in Inventory".
//
// Restricted users never see expired units (the search endpoint filters them
// out), but if one slips through we hide it defensively here. Superadmins see
// expired units with the red chip + "!" indicator and can route them through
// the override modal (handled by the parent — this card emits an event).

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import type { PlatformItemDTO } from '@/lib/cartApi';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusChip } from '@/components/ui/status-chip';
import { AddToCartButton } from '@/components/cart/AddToCartButton';
import { cn } from '@/lib/utils';

function attrString(attrs: Record<string, unknown>, key: string): string | null {
  const v = attrs[key];
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return null;
}

function formatExpiry(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString();
}

export interface ResultCardProps {
  readonly item: PlatformItemDTO;
  readonly cartId: string | null;
  readonly isSuperadmin: boolean;
  /** If false, expired items are hidden. */
  readonly allowExpired?: boolean;
  /** Trigger expired-override modal upstream. */
  readonly onRequestExpiredOverride?: (item: PlatformItemDTO) => void;
}

export function ResultCard({
  item,
  cartId,
  isSuperadmin,
  allowExpired = false,
  onRequestExpiredOverride,
}: ResultCardProps) {
  const isExpired = item.status === 'expired';
  if (isExpired && !allowExpired) return null;

  const attrs = item.attributes ?? {};
  const medicationName = attrString(attrs, 'medication_name') ?? attrString(attrs, 'medicationName') ?? 'Unknown medication';
  const dose = attrString(attrs, 'dose') ?? attrString(attrs, 'dosage');
  const unit = attrString(attrs, 'unit');
  const form = attrString(attrs, 'form');
  const quantity = attrs.quantity ?? attrs.unit_count;
  const locationCode = item.location?.code ?? item.location_code ?? null;
  const locationName = item.location?.name ?? null;

  return (
    <Card
      className={cn(
        'transition-all duration-200 hover:shadow-large',
        isExpired && 'border-destructive/50 bg-destructive/5',
      )}
    >
      <CardContent className="pt-6 pb-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold leading-tight break-words">{medicationName}</h3>
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {dose && (
                <span>
                  {dose}
                  {unit ? ` ${unit}` : ''}
                </span>
              )}
              {form && <span className="capitalize">{form}</span>}
              {quantity !== undefined && quantity !== null && (
                <span>Qty: {String(quantity)}</span>
              )}
            </div>
          </div>
          <StatusChip status={item.status} />
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-4 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Expiry</dt>
            <dd className={cn('font-medium', isExpired && 'text-destructive')}>
              {formatExpiry(item.expiry_date)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Location</dt>
            <dd className="font-medium">{locationCode ?? locationName ?? '—'}</dd>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">DRX Code</dt>
            <dd className="font-mono text-xs break-all">{item.unit_code}</dd>
          </div>
        </dl>

        {isExpired && (
          <p className="text-sm text-destructive flex items-start gap-2">
            <span aria-hidden>!</span>
            <span>
              Expired medication. Superadmin override required with a mandatory note.
            </span>
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          {isExpired ? (
            isSuperadmin && (
              <Button
                size="lg"
                variant="destructive"
                onClick={() => onRequestExpiredOverride?.(item)}
                className="w-full sm:w-auto"
              >
                Override and Check Out
              </Button>
            )
          ) : (
            <AddToCartButton item={item} cartId={cartId} isSuperadmin={isSuperadmin} />
          )}
          <Link href={`/inventory?unitId=${encodeURIComponent(item.id)}`} className="w-full sm:w-auto">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              <ExternalLink className="mr-2 h-4 w-4" />
              View in Inventory
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
