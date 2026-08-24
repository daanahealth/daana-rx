'use client';

import { useState } from 'react';
import { ClipboardList, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable, DateText, FilterBar, StatusChip, type Column } from '@/components/composed';
import { EMPTY, formatCount } from '@/lib/format';
import { TRANSACTION_ACTION, TRANSACTION_ACTIONS } from '@/lib/status';
import { actorLabel, type TransactionRow, type UserDirectory } from './mappers';
import { downloadCsv, transactionsCsvFileName, transactionsToCsv } from './export';
import {
  EMPTY_LOG_FILTERS,
  activeLogFilterCount,
  useTransactionLog,
  type TransactionLogFilters,
} from './hooks';
import { ReportSection } from './ReportSection';

/** Radix Select rejects an empty-string item value; 'all' stands in for it. */
const ALL = 'all';

/** Legacy `adjust` belongs to /logs, not the core audit log. */
const LOG_ACTIONS = TRANSACTION_ACTIONS.filter((a) => a !== 'adjust');

function columns(directory: UserDirectory): Column<TransactionRow>[] {
  return [
    {
      key: 'when',
      header: 'Date & time',
      kind: 'date',
      secondary: true,
      cell: (r) => <DateText value={r.timestamp} withTime />,
      sortValue: (r) => r.timestamp,
    },
    {
      key: 'action',
      header: 'Action',
      kind: 'status',
      cell: (r) => <StatusChip kind="transaction" status={r.actionType} size="sm" />,
      sortValue: (r) => r.actionType,
    },
    {
      key: 'medication',
      header: 'Medication',
      primary: true,
      cell: (r) => r.medicationName ?? EMPTY,
      sortValue: (r) => r.medicationName,
    },
    {
      key: 'dose',
      header: 'Dose',
      className: 'whitespace-nowrap',
      cell: (r) => [r.dosage, r.form].filter(Boolean).join(' · ') || EMPTY,
    },
    {
      key: 'location',
      header: 'Location',
      cell: (r) => r.location ?? EMPTY,
      sortValue: (r) => r.location,
    },
    { key: 'code', header: 'DRX code', kind: 'code', cell: (r) => r.drxCode ?? EMPTY },
    {
      key: 'actor',
      header: 'Actor',
      className: 'whitespace-nowrap',
      cell: (r) => actorLabel(r, directory),
      sortValue: (r) => actorLabel(r, directory),
    },
    {
      key: 'reason',
      header: 'Reason',
      cell: (r) => (
        <span className="block max-w-[16ch] truncate" title={r.reason ?? undefined}>
          {r.reason ?? EMPTY}
        </span>
      ),
    },
    {
      key: 'notes',
      header: 'Notes',
      cell: (r) => (
        <span className="block max-w-[20ch] truncate" title={r.notes ?? undefined}>
          {r.notes ?? EMPTY}
        </span>
      ),
    },
  ];
}

export function TransactionLogTable({ directory }: { directory: UserDirectory }) {
  const [filters, setFilters] = useState<TransactionLogFilters>(EMPTY_LOG_FILTERS);
  const log = useTransactionLog(filters, directory);
  const set = <K extends keyof TransactionLogFilters>(key: K, value: TransactionLogFilters[K]) =>
    setFilters((f) => ({ ...f, [key]: value }));
  const active = activeLogFilterCount(filters);

  const exportCsv = () =>
    downloadCsv(transactionsToCsv(log.rows, directory), transactionsCsvFileName());

  return (
    <ReportSection
      id="transactions"
      icon={ClipboardList}
      title="Transaction Log"
      description="Full audit trail: check-ins, checkouts, edits, removals and provider requests."
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={exportCsv}
          disabled={log.loading || log.rows.length === 0}
          className="min-h-11 lg:min-h-9"
        >
          <Download aria-hidden /> Export CSV
        </Button>
      }
    >
      <div className="space-y-4">
        <FilterBar
          search={{
            value: filters.q,
            onChange: (v) => set('q', v),
            placeholder: 'Search medication',
            label: 'Search medication',
          }}
          activeCount={active}
          onClear={() => setFilters(EMPTY_LOG_FILTERS)}
          trailing={
            log.loading ? null : `${formatCount(log.rows.length)}${log.hasMore ? '+' : ''} shown`
          }
        >
          <Select
            value={filters.actionType || ALL}
            onValueChange={(v) => set('actionType', v === ALL ? '' : v)}
          >
            <SelectTrigger aria-label="Action type" className="w-full sm:w-44">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All actions</SelectItem>
              {LOG_ACTIONS.map((a) => (
                <SelectItem key={a} value={a}>
                  {TRANSACTION_ACTION[a].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            aria-label="From date"
            className="w-full sm:w-40"
            value={filters.dateFrom}
            max={filters.dateTo || undefined}
            onChange={(e) => set('dateFrom', e.target.value)}
          />
          <Input
            type="date"
            aria-label="To date"
            className="w-full sm:w-40"
            value={filters.dateTo}
            min={filters.dateFrom || undefined}
            onChange={(e) => set('dateTo', e.target.value)}
          />
          <Input
            aria-label="Actor"
            placeholder="Actor (username)"
            className="w-full sm:w-44"
            autoComplete="off"
            value={filters.actor}
            onChange={(e) => set('actor', e.target.value)}
          />
        </FilterBar>

        <DataTable
          rows={log.rows}
          rowKey={(r) => r.transactionId}
          columns={columns(directory)}
          loading={log.loading}
          error={log.error}
          onRetry={log.refetch}
          dense
          skeletonRows={8}
          caption="Transaction log"
          empty={{
            title: active > 0 ? 'No transactions match these filters' : 'No transactions yet',
            description:
              active > 0
                ? 'Clear a filter or widen the date range.'
                : 'Every check-in, checkout, edit and removal is recorded here.',
          }}
        />

        {!log.loading && !log.error && log.rows.length > 0 ? (
          <div className="flex justify-center">
            {log.hasMore ? (
              <Button
                variant="outline"
                onClick={log.loadMore}
                disabled={log.loadingMore}
                className="min-h-11 w-full sm:w-auto lg:min-h-9"
              >
                {log.loadingMore ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden /> Loading…
                  </>
                ) : (
                  'Load more'
                )}
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">End of log</span>
            )}
          </div>
        ) : null}
      </div>
    </ReportSection>
  );
}
