'use client';

import * as React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { EmptyState } from './EmptyState';

/**
 * DataTable — the generic, sortable, responsive table for inventory,
 * queues and logs.
 *
 *   <DataTable
 *     rows={items} rowKey={(r) => r.id}
 *     columns={[
 *       { key: 'name', header: 'Medication', primary: true, cell: (r) => r.name, sortValue: (r) => r.name },
 *       { key: 'qty', header: 'Qty', kind: 'number', cell: (r) => r.quantity, sortValue: (r) => r.quantity },
 *       { key: 'expiry', header: 'Expiry', kind: 'date', cell: (r) => <DateText value={r.expiryDate} expiry />, sortValue: (r) => r.expiryDate },
 *       { key: 'code', header: 'DRX code', kind: 'code', cell: (r) => r.unitCode, hideOnMobile: true },
 *     ]}
 *     rowActions={(r) => <Button size="sm" variant="outline">Details</Button>}
 *     loading={loading} error={error} onRetry={refetch}
 *     empty={{ title: 'No units match', description: 'Try clearing a filter.' }}
 *   />
 *
 * - `lg` and up: a real <table> (sticky header inside its scroll container).
 * - Below `lg`: each row is a stacked card — the `primary` column as the
 *   title, the rest as a two-column key/value grid, actions at the bottom.
 * - Sorting is client-side on `sortValue`; pass `sort`/`onSortChange` to
 *   control it (e.g. server-side sorting). Columns without `sortValue` are
 *   not sortable.
 * - `kind` sets alignment and numerals: number/date → right-aligned tabular,
 *   code → mono.
 */
export type ColumnKind = 'text' | 'number' | 'date' | 'code' | 'status';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  kind?: ColumnKind;
  sortValue?: (row: T) => string | number | null | undefined;
  /** The title line of the mobile card. Exactly one column should be primary. */
  primary?: boolean;
  /** Secondary line under the primary on mobile (e.g. dose · form). */
  secondary?: boolean;
  hideOnMobile?: boolean;
  /** Extra classes for the <th>/<td>. */
  className?: string;
  width?: string;
}

export interface SortState {
  key: string;
  dir: 'asc' | 'desc';
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: readonly T[];
  rowKey: (row: T, index: number) => string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  empty?: { title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode };
  sort?: SortState | null;
  defaultSort?: SortState;
  onSortChange?: (sort: SortState | null) => void;
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => React.ReactNode;
  /** Tighter rows for long logs. */
  dense?: boolean;
  /** Rows to render while loading. */
  skeletonRows?: number;
  caption?: string;
  className?: string;
}

function compare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

const KIND_CLASS: Record<ColumnKind, string> = {
  text: '',
  number: 'text-right tabular-nums',
  date: 'text-right tabular-nums whitespace-nowrap',
  code: 'font-mono text-[0.8125rem] whitespace-nowrap',
  status: 'whitespace-nowrap',
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  error = null,
  onRetry,
  empty,
  sort: controlledSort,
  defaultSort,
  onSortChange,
  onRowClick,
  rowActions,
  dense = false,
  skeletonRows = 6,
  caption,
  className,
}: DataTableProps<T>) {
  const [internalSort, setInternalSort] = React.useState<SortState | null>(defaultSort ?? null);
  const sort = controlledSort !== undefined ? controlledSort : internalSort;

  const setSort = (next: SortState | null) => {
    if (controlledSort === undefined) setInternalSort(next);
    onSortChange?.(next);
  };

  const toggleSort = (col: Column<T>) => {
    if (!col.sortValue) return;
    if (!sort || sort.key !== col.key) return setSort({ key: col.key, dir: 'asc' });
    if (sort.dir === 'asc') return setSort({ key: col.key, dir: 'desc' });
    return setSort(null);
  };

  const sorted = React.useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const get = col.sortValue;
    const out = [...rows].sort((a, b) => compare(get(a), get(b)));
    return sort.dir === 'desc' ? out.reverse() : out;
  }, [rows, sort, columns]);

  const primary = columns.find((c) => c.primary) ?? columns[0];
  const secondary = columns.find((c) => c.secondary);
  const mobileDetails = columns.filter((c) => c !== primary && c !== secondary && !c.hideOnMobile);

  // ----- non-data states -----
  if (error) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Couldn't load this list"
        description={error}
        action={
          onRetry ? (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Try again
            </Button>
          ) : undefined
        }
        className={className}
      />
    );
  }

  if (!loading && sorted.length === 0) {
    return (
      <EmptyState
        title={empty?.title ?? 'Nothing here yet'}
        description={empty?.description}
        action={empty?.action}
        className={className}
      />
    );
  }

  const skeleton = Array.from({ length: skeletonRows }, (_, i) => i);

  return (
    <div className={cn('w-full', className)} aria-busy={loading || undefined}>
      {/* ---------- desktop table ---------- */}
      <div className="hidden lg:block">
        <Table>
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <TableHeader className="sticky top-0 z-10">
            <TableRow className="hover:bg-panel">
              {columns.map((col) => {
                const active = sort?.key === col.key;
                const Icon = !active ? ArrowUpDown : sort?.dir === 'asc' ? ArrowUp : ArrowDown;
                return (
                  <TableHead
                    key={col.key}
                    style={col.width ? { width: col.width } : undefined}
                    aria-sort={
                      active ? (sort?.dir === 'asc' ? 'ascending' : 'descending') : undefined
                    }
                    className={cn(KIND_CLASS[col.kind ?? 'text'], 'font-medium', col.className)}
                  >
                    {col.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col)}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-xs hover:text-foreground',
                          active && 'text-foreground'
                        )}
                      >
                        {col.header}
                        <Icon className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    ) : (
                      col.header
                    )}
                  </TableHead>
                );
              })}
              {rowActions ? <TableHead className="w-px" /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? skeleton.map((i) => (
                  <TableRow key={`s-${i}`}>
                    {columns.map((col) => (
                      <TableCell key={col.key} className={dense ? 'h-9 py-1.5' : undefined}>
                        <Skeleton className="h-4 w-3/4" />
                      </TableCell>
                    ))}
                    {rowActions ? <TableCell /> : null}
                  </TableRow>
                ))
              : sorted.map((row, i) => (
                  <TableRow
                    key={rowKey(row, i)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(onRowClick && 'cursor-pointer')}
                  >
                    {columns.map((col) => (
                      <TableCell
                        key={col.key}
                        className={cn(
                          KIND_CLASS[col.kind ?? 'text'],
                          col.primary && 'font-medium text-foreground',
                          dense && 'h-9 py-1.5',
                          col.className
                        )}
                      >
                        {col.cell(row)}
                      </TableCell>
                    ))}
                    {rowActions ? (
                      <TableCell
                        className="whitespace-nowrap text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {rowActions(row)}
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      {/* ---------- mobile stacked rows ---------- */}
      <ul className="flex flex-col gap-2 lg:hidden" aria-label={caption}>
        {loading
          ? skeleton.map((i) => (
              <li key={`ms-${i}`} className="rounded-lg border border-border bg-card p-4">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="mt-2 h-3 w-1/3" />
              </li>
            ))
          : sorted.map((row, i) => (
              <li
                key={rowKey(row, i)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'rounded-lg border border-border bg-card p-4',
                  onRowClick && 'cursor-pointer active:bg-background'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-semibold leading-snug text-foreground">
                      {primary.cell(row)}
                    </div>
                    {secondary ? (
                      <div className="mt-0.5 text-sm text-muted-foreground">
                        {secondary.cell(row)}
                      </div>
                    ) : null}
                  </div>
                  {columns.find((c) => c.kind === 'status' && !c.primary) ? (
                    <div className="shrink-0">
                      {columns.find((c) => c.kind === 'status' && !c.primary)!.cell(row)}
                    </div>
                  ) : null}
                </div>
                {mobileDetails.filter((c) => c.kind !== 'status').length > 0 ? (
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    {mobileDetails
                      .filter((c) => c.kind !== 'status')
                      .map((col) => (
                        <div key={col.key} className="min-w-0">
                          <dt className="text-xs font-medium text-muted-foreground">
                            {col.header}
                          </dt>
                          <dd
                            className={cn(
                              'mt-0.5 truncate text-foreground',
                              col.kind === 'code' && 'font-mono text-[0.8125rem]',
                              (col.kind === 'number' || col.kind === 'date') && 'tabular-nums'
                            )}
                          >
                            {col.cell(row)}
                          </dd>
                        </div>
                      ))}
                  </dl>
                ) : null}
                {rowActions ? (
                  <div
                    className="mt-3 flex flex-wrap gap-2 [&>*]:flex-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {rowActions(row)}
                  </div>
                ) : null}
              </li>
            ))}
      </ul>
    </div>
  );
}
