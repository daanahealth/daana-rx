import * as React from 'react';
import { Pill } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pluralize } from '@/lib/format';
import { DateText } from './DateText';

/**
 * MedicationCard — a medication-level card (name · dose · form, units
 * available, earliest expiry). This is the provider-safe unit of display:
 * it deliberately has no place for a location, bin, DRX code or item id.
 * Superadmin surfaces that need the unit use DataTable / KeyValueList instead.
 *
 *   <MedicationCard
 *     name="Metformin" dose="500 mg" form="Tablet" specialty="ENDOCRINE"
 *     availableUnits={12} earliestExpiry="2027-03-07"
 *     action={<Button size="touch">Request</Button>} />
 *
 * `availableUnits === 0` renders the disabled "none available" state (spec E1).
 */
export interface MedicationCardProps {
  name: string;
  dose?: string | null;
  form?: string | null;
  specialty?: string | null;
  availableUnits: number;
  /** Total quantity across units, when it differs from unit count. */
  availableQuantity?: number | null;
  earliestExpiry?: string | null;
  action?: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}

export function MedicationCard({
  name,
  dose,
  form,
  specialty,
  availableUnits,
  availableQuantity,
  earliestExpiry,
  action,
  onClick,
  selected = false,
  className,
}: MedicationCardProps) {
  const none = availableUnits <= 0;
  const subtitle = [dose, form].filter(Boolean).join(' · ');
  const Root: 'button' | 'article' = onClick ? 'button' : 'article';

  return (
    <Root
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={onClick ? selected : undefined}
      data-available={none ? 'none' : 'some'}
      className={cn(
        'flex w-full flex-col gap-3 rounded-xl border bg-card p-4 text-left',
        selected ? 'border-primary ring-2 ring-primary/30' : 'border-border',
        onClick && !none && 'hover:border-border-strong focus-visible:outline-none',
        none && 'bg-panel',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
            none ? 'bg-quiet-wash text-quiet' : 'bg-accent text-accent-foreground'
          )}
        >
          <Pill className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3
            className={cn('text-base font-semibold leading-snug', none && 'text-subtle-foreground')}
          >
            {name}
          </h3>
          {subtitle ? <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {specialty ? (
          <span className="shrink-0 rounded-xs bg-panel px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
            {specialty}
          </span>
        ) : null}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 text-sm">
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Available</dt>
          <dd
            className={cn(
              'mt-0.5 font-medium tabular-nums',
              none ? 'text-quiet' : 'text-foreground'
            )}
          >
            {none
              ? 'None available'
              : availableQuantity != null && availableQuantity !== availableUnits
                ? `${pluralize(availableUnits, 'unit')} · ${availableQuantity} qty`
                : pluralize(availableUnits, 'unit')}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Earliest expiry</dt>
          <dd className="mt-0.5">
            {none || !earliestExpiry ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              <DateText value={earliestExpiry} expiry />
            )}
          </dd>
        </div>
      </dl>

      {action ? <div className="[&>*]:w-full">{action}</div> : null}
    </Root>
  );
}
