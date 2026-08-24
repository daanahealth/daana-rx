'use client';

// InventoryTable — the DataTable columns for the working set, sorted on the
// full set and paged on the client (10 per page), with the pager underneath.
// Columns (MVP spec § Inventory Tab): medication, dosage, unit, form,
// quantity, location, expiry, DRX code, status, date received, checked in,
// checked-in by, last edited by, last edited.

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  DataTable,
  DateText,
  StatusChip,
  compareCells,
  type Column,
  type SortState,
} from '@/components/composed';
import { Button } from '@/components/ui/button';
import { formatCount } from '@/lib/format';
import { checkedInBy, medicationName, readAttr, type InventoryRow } from '../mappers';
import { InventoryRowActions, type RowActionHandlers } from './InventoryRowActions';

export const PAGE_SIZE = 10;

interface InventoryTableProps extends RowActionHandlers {
  rows: InventoryRow[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  empty: { title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode };
  isSuperadmin: boolean;
  mayModify: boolean;
}

function buildColumns(onDetails: (row: InventoryRow) => void): Column<InventoryRow>[] {
  return [
    {
      key: 'medication',
      header: 'Medication',
      primary: true,
      cell: (r) => (
        <button
          type="button"
          onClick={() => onDetails(r)}
          className="rounded-xs text-left hover:underline focus-visible:underline focus-visible:outline-none"
        >
          {medicationName(r, '—')}
        </button>
      ),
      sortValue: (r) => readAttr(r.attributes, 'medication_name'),
    },
    {
      key: 'dosage',
      header: 'Dosage',
      cell: (r) => readAttr(r.attributes, 'dosage') || '—',
      sortValue: (r) => readAttr(r.attributes, 'dosage'),
    },
    { key: 'unit', header: 'Unit', cell: (r) => readAttr(r.attributes, 'unit') || '—' },
    {
      key: 'form',
      header: 'Form',
      cell: (r) => readAttr(r.attributes, 'form') || '—',
      sortValue: (r) => readAttr(r.attributes, 'form'),
    },
    {
      key: 'quantity',
      header: 'Quantity',
      kind: 'number',
      cell: (r) => readAttr(r.attributes, 'quantity') || '—',
      sortValue: (r) => {
        const n = Number(readAttr(r.attributes, 'quantity'));
        return Number.isFinite(n) && readAttr(r.attributes, 'quantity') !== '' ? n : null;
      },
    },
    {
      key: 'location',
      header: 'Location',
      cell: (r) => r.locationCode ?? '—',
      sortValue: (r) => r.locationCode ?? null,
    },
    {
      key: 'expiry',
      header: 'Expiry',
      kind: 'date',
      cell: (r) => <DateText value={r.expiryDate} expiry />,
      sortValue: (r) => r.expiryDate ?? null,
    },
    {
      key: 'code',
      header: 'DRX code',
      kind: 'code',
      cell: (r) => r.unitCode,
      sortValue: (r) => r.unitCode,
    },
    {
      key: 'status',
      header: 'Status',
      kind: 'status',
      cell: (r) => <StatusChip status={r.status} />,
      sortValue: (r) => r.status,
    },
    {
      key: 'received',
      header: 'Date received',
      kind: 'date',
      cell: (r) => <DateText value={r.dateReceived ?? r.createdAt} />,
      sortValue: (r) => r.dateReceived ?? r.createdAt,
    },
    {
      key: 'checkedIn',
      header: 'Checked in',
      kind: 'date',
      cell: (r) => <DateText value={r.checkedInAt ?? r.createdAt} withTime />,
      sortValue: (r) => r.checkedInAt ?? r.createdAt,
      hideOnMobile: true,
    },
    {
      key: 'checkedInBy',
      header: 'Checked in by',
      cell: (r) => checkedInBy(r) ?? '—',
      hideOnMobile: true,
    },
    {
      key: 'lastEditedBy',
      header: 'Last edited by',
      cell: (r) => r.lastEditedByName ?? '—',
      hideOnMobile: true,
    },
    {
      key: 'lastEdited',
      header: 'Last edited',
      kind: 'date',
      cell: (r) => <DateText value={r.lastEditedAt} withTime />,
      sortValue: (r) => r.lastEditedAt ?? null,
      hideOnMobile: true,
    },
  ];
}

export function InventoryTable({
  rows,
  loading,
  error,
  onRetry,
  empty,
  isSuperadmin,
  mayModify,
  onDetails,
  onEdit,
  onCheckout,
  onRemove,
  onHistory,
}: InventoryTableProps) {
  const columns = useMemo(() => buildColumns(onDetails), [onDetails]);
  const [sort, setSort] = useState<SortState | null>(null);
  const [rawPage, setPage] = useState(1);

  // Sort the whole working set, then slice the page.
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const get = col.sortValue;
    const out = [...rows].sort((a, b) => compareCells(get(a), get(b)));
    return sort.dir === 'desc' ? out.reverse() : out;
  }, [rows, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  // Clamp rather than sync: if the set shrinks (checkout/remove), the last
  // page is shown. The screen remounts this table (key={query}) so a new
  // query starts on page 1.
  const page = Math.min(rawPage, pageCount);
  const pagedRows = useMemo(
    () => sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [sorted, page]
  );

  const first = (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, sorted.length);

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-card max-lg:border-0 max-lg:bg-transparent">
        <DataTable<InventoryRow>
          columns={columns}
          rows={pagedRows}
          rowKey={(r) => r.id}
          loading={loading}
          error={error}
          onRetry={onRetry}
          empty={empty}
          sort={sort}
          onSortChange={setSort}
          caption="Inventory"
          rowActions={(row) => (
            <InventoryRowActions
              row={row}
              isSuperadmin={isSuperadmin}
              mayModify={mayModify}
              onDetails={onDetails}
              onEdit={onEdit}
              onCheckout={onCheckout}
              onRemove={onRemove}
              onHistory={onHistory}
            />
          )}
        />
      </div>

      {sorted.length > PAGE_SIZE ? (
        <nav
          aria-label="Pagination"
          className="flex flex-col items-center justify-between gap-3 sm:flex-row"
        >
          <p className="text-sm tabular-nums text-muted-foreground">
            Showing {first}–{last} of {formatCount(sorted.length)}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="max-lg:h-11"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft aria-hidden />
              Previous
            </Button>
            <span className="text-sm tabular-nums text-muted-foreground">
              Page {page} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="max-lg:h-11"
              onClick={() => setPage(Math.min(pageCount, page + 1))}
              disabled={page >= pageCount}
            >
              Next
              <ChevronRight aria-hidden />
            </Button>
          </div>
        </nav>
      ) : null}
    </div>
  );
}
