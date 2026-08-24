'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DataTable,
  DateText,
  FilterBar,
  PageHeader,
  StatusChip,
  type Column,
} from '@/components/composed';
import { EMPTY, formatCount, pluralize } from '@/lib/format';
import { TRANSACTION_ACTION } from '@/lib/status';
import type { LegacyTransactionRow } from './mappers';
import { useLegacyTransactions } from './hooks';

const ALL = 'all';
const PAGE_SIZE = 20;
const TYPES = ['check_in', 'check_out', 'adjust'] as const;

const COLUMNS: Column<LegacyTransactionRow>[] = [
  {
    key: 'when',
    header: 'Date & time',
    kind: 'date',
    secondary: true,
    cell: (r) => <DateText value={r.timestamp} withTime />,
    sortValue: (r) => r.timestamp,
  },
  {
    key: 'type',
    header: 'Type',
    kind: 'status',
    cell: (r) => <StatusChip kind="transaction" status={r.type} size="sm" />,
  },
  { key: 'medication', header: 'Medication', primary: true, cell: (r) => r.medicationName },
  { key: 'strength', header: 'Strength', cell: (r) => r.strength ?? EMPTY },
  { key: 'qty', header: 'Quantity', kind: 'number', cell: (r) => formatCount(r.quantity) },
  { key: 'user', header: 'User', cell: (r) => r.user ?? 'System' },
  {
    key: 'notes',
    header: 'Notes',
    cell: (r) => (
      <span className="block max-w-[28ch] truncate" title={r.notes ?? undefined}>
        {r.notes ?? EMPTY}
      </span>
    ),
  },
];

interface Filters {
  type: string;
  startDate: string;
  endDate: string;
  medicationName: string;
}
const EMPTY_FILTERS: Filters = { type: '', startDate: '', endDate: '', medicationName: '' };

/** /logs — legacy activity log over /transactions/all (page numbered). */
export function LogsScreen() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const result = useLegacyTransactions({ page, pageSize: PAGE_SIZE, ...filters });
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };
  const total = result.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const active = Object.values(filters).filter(Boolean).length;

  return (
    <>
      <PageHeader
        title="Activity Logs"
        description="Every check-in, checkout and adjustment on the legacy units log."
        actions={
          <Button variant="outline" onClick={result.refetch}>
            <RefreshCw aria-hidden /> Refresh
          </Button>
        }
      />
      <div className="space-y-4">
        <FilterBar
          search={{
            value: filters.medicationName,
            onChange: (v) => set('medicationName', v),
            placeholder: 'Search medication',
            label: 'Search medication',
          }}
          activeCount={active}
          onClear={() => {
            setFilters(EMPTY_FILTERS);
            setPage(1);
          }}
          trailing={result.loading ? null : pluralize(total, 'transaction')}
        >
          <Select
            value={filters.type || ALL}
            onValueChange={(v) => set('type', v === ALL ? '' : v)}
          >
            <SelectTrigger aria-label="Transaction type" className="w-full sm:w-44">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All types</SelectItem>
              {TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {TRANSACTION_ACTION[t].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            aria-label="Start date"
            className="w-full sm:w-40"
            value={filters.startDate}
            onChange={(e) => set('startDate', e.target.value)}
          />
          <Input
            type="date"
            aria-label="End date"
            className="w-full sm:w-40"
            value={filters.endDate}
            onChange={(e) => set('endDate', e.target.value)}
          />
        </FilterBar>

        <DataTable
          rows={result.data?.rows ?? []}
          rowKey={(r) => r.transactionId}
          columns={COLUMNS}
          loading={result.loading}
          error={result.error}
          onRetry={result.refetch}
          dense
          caption="Activity log"
          empty={{
            title: active > 0 ? 'No transactions match these filters' : 'No transactions yet',
            description:
              active > 0 ? 'Clear a filter or widen the date range.' : 'Activity will appear here.',
          }}
        />

        {totalPages > 1 ? (
          <nav aria-label="Pagination" className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || result.loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="min-h-11 lg:min-h-9"
            >
              Previous
            </Button>
            <span className="text-sm tabular-nums text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || result.loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="min-h-11 lg:min-h-9"
            >
              Next
            </Button>
          </nav>
        ) : null}
      </div>
    </>
  );
}
