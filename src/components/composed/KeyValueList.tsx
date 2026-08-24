import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * KeyValueList — a definition list for item details, request cards and
 * drawers. Labels are Label type (12px, Ink 3); values are body text.
 *
 *   <KeyValueList items={[
 *     { label: 'DRX code', value: <code>DRX-MASS-CARDIO-00012</code> },
 *     { label: 'Expiry', value: <DateText value={item.expiryDate} expiry /> },
 *   ]} />
 *
 * `columns` = 1 (stacked), 2 (default, collapses to 1 under sm), 3 (collapses
 * to 2 under sm) or 'inline'
 * (label · value on one row, for compact cards).
 */
export interface KeyValueItem {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Render the value in the mono/code face (DRX codes, lot numbers). */
  code?: boolean;
  /** Span both columns. */
  wide?: boolean;
}

export interface KeyValueListProps {
  items: KeyValueItem[];
  columns?: 1 | 2 | 3 | 'inline';
  className?: string;
}

export function KeyValueList({ items, columns = 2, className }: KeyValueListProps) {
  if (columns === 'inline') {
    return (
      <dl className={cn('divide-y divide-border text-sm', className)}>
        {items.map((it, i) => (
          <div key={i} className="flex items-baseline justify-between gap-4 py-2">
            <dt className="shrink-0 text-xs font-medium text-muted-foreground">{it.label}</dt>
            <dd
              className={cn(
                'min-w-0 text-right text-foreground',
                it.code && 'font-mono text-[0.8125rem]'
              )}
            >
              {it.value ?? '—'}
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <dl
      className={cn(
        'grid gap-x-6 gap-y-3 text-sm',
        columns === 2
          ? 'grid-cols-1 sm:grid-cols-2'
          : columns === 3
            ? 'grid-cols-2 sm:grid-cols-3'
            : 'grid-cols-1',
        className
      )}
    >
      {items.map((it, i) => (
        <div
          key={i}
          className={cn(
            'min-w-0',
            it.wide && (columns === 3 ? 'col-span-2 sm:col-span-3' : 'sm:col-span-2')
          )}
        >
          <dt className="text-xs font-medium text-muted-foreground">{it.label}</dt>
          <dd
            className={cn(
              'mt-0.5 break-words text-foreground',
              it.code && 'font-mono text-[0.8125rem]'
            )}
          >
            {it.value ?? '—'}
          </dd>
        </div>
      ))}
    </dl>
  );
}
