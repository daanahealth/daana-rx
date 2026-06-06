'use client';

import Link from 'next/link';
import { Calendar, MapPin, Pill, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusChip } from '@/components/ui/status-chip';
import { cn } from '@/lib/utils';
import type { Item } from '@daana-health/inventory-core';

interface ResultCardProps {
  item: Item;
}

interface MedAttributes {
  medication_name?: string;
  dosage?: number | string;
  dosage_unit?: string;
  form?: string;
  location_code?: string;
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diffMs = d.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ResultCard({ item }: ResultCardProps) {
  const attrs = (item.attributes ?? {}) as MedAttributes;
  const name = attrs.medication_name ?? 'Unknown medication';
  const dosage = attrs.dosage != null ? `${attrs.dosage} ${attrs.dosage_unit ?? ''}`.trim() : null;
  const form = attrs.form ?? null;
  const locationCode = attrs.location_code ?? null;

  const days = daysUntil(item.expiryDate);
  const expiringSoon = days !== null && days >= 0 && days < 30;

  return (
    <article
      className={cn(
        'rounded-xl border border-border/60 bg-card/80 backdrop-blur-md',
        'shadow-soft hover:shadow-md transition-shadow duration-200',
        'p-4 sm:p-5',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold tracking-tight text-foreground truncate">
              {name}
            </h3>
            <StatusChip status={item.status} />
            {expiringSoon ? (
              <span className="inline-flex items-center rounded-full border border-destructive/40 bg-destructive/10 text-destructive px-2.5 py-0.5 text-xs font-medium">
                Expiring soon
              </span>
            ) : null}
          </div>
          {(dosage || form) && (
            <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1.5">
              <Pill className="h-3.5 w-3.5" aria-hidden />
              {[dosage, form].filter(Boolean).join(' • ')}
            </p>
          )}
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm">
        <div className="min-w-0">
          <dt className="text-xs uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Expiry
          </dt>
          <dd className="font-medium truncate">{formatDate(item.expiryDate)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1">
            <MapPin className="h-3 w-3" /> Location
          </dt>
          <dd className="font-medium truncate">{locationCode ?? '—'}</dd>
        </div>
        <div className="min-w-0 col-span-2 sm:col-span-1">
          <dt className="text-xs uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1">
            <Hash className="h-3 w-3" /> DRX Code
          </dt>
          <dd className="font-mono text-xs sm:text-sm font-medium truncate">{item.unitCode}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild size="sm" className="flex-1 sm:flex-none">
          <Link href={`/checkout?item=${encodeURIComponent(item.id)}`}>Check Out</Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="flex-1 sm:flex-none">
          <Link href={`/inventory?focus=${encodeURIComponent(item.id)}`}>View in Inventory</Link>
        </Button>
      </div>
    </article>
  );
}
