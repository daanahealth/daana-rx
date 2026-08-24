'use client';

import * as React from 'react';
import { AlertCircle, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MedicationCard, EmptyState } from '@/components/composed';
import type { MedicationCardVM } from '../mappers';

/**
 * MedicationGrid — the provider's medication-level card grid with the
 * loading / empty / error states built in. Cards carry no location or code.
 */
export interface MedicationGridProps {
  medications: readonly MedicationCardVM[] | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  /** When set, cards get a Request action (and tap-to-open). */
  onRequest?: (m: MedicationCardVM) => void;
  empty: { title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode };
  /** Horizontal strip (Top requested) instead of a grid. */
  layout?: 'grid' | 'strip';
  skeletonCount?: number;
  className?: string;
}

export function MedicationGrid({
  medications,
  loading = false,
  error = null,
  onRetry,
  onRequest,
  empty,
  layout = 'grid',
  skeletonCount = 6,
  className,
}: MedicationGridProps) {
  if (error && !medications?.length) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Couldn't load medications"
        description={error}
        action={
          onRetry ? (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Try again
            </Button>
          ) : undefined
        }
      />
    );
  }

  const wrap =
    layout === 'strip'
      ? 'flex snap-x gap-3 overflow-x-auto pb-2 [&>*]:w-64 [&>*]:shrink-0 [&>*]:snap-start'
      : 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3';

  if (loading && !medications?.length) {
    return (
      <div className={`${wrap} ${className ?? ''}`} aria-busy="true">
        {Array.from({ length: skeletonCount }, (_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="mt-2 h-4 w-1/3" />
            <div className="mt-4 grid grid-cols-2 gap-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!medications?.length) {
    return (
      <EmptyState
        icon={SearchX}
        title={empty.title}
        description={empty.description}
        action={empty.action}
      />
    );
  }

  return (
    <ul className={`${wrap} ${className ?? ''}`} aria-busy={loading || undefined}>
      {medications.map((m) => {
        const none = m.availableUnits <= 0;
        return (
          <li key={m.key} className="min-w-0 [&>*]:h-full">
            <MedicationCard
              name={m.medicationName}
              dose={m.dose}
              form={m.form}
              specialty={m.specialtyClass}
              availableUnits={m.availableUnits}
              availableQuantity={m.availableQuantity}
              earliestExpiry={m.earliestExpiry}
              onClick={onRequest && !none ? () => onRequest(m) : undefined}
              action={
                onRequest ? (
                  <Button
                    size="touch"
                    variant={none ? 'outline' : 'default'}
                    disabled={none}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRequest(m);
                    }}
                  >
                    {none ? 'None available' : 'Request dispense'}
                  </Button>
                ) : undefined
              }
            />
          </li>
        );
      })}
    </ul>
  );
}
