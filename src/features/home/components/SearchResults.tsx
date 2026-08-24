'use client';

import Link from 'next/link';
import { PackageCheck, PackageSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable, DateText, EmptyState, StatusChip, type Column } from '@/components/composed';
import { pluralize } from '@/lib/format';
import type { SearchState } from '../hooks';
import type { ResultRow } from '../mappers';

const COLUMNS: Column<ResultRow>[] = [
  { key: 'name', header: 'Medication', primary: true, cell: (r) => r.name },
  {
    key: 'dose',
    header: 'Dose · form',
    secondary: true,
    cell: (r) => [r.dose, r.form].filter(Boolean).join(' · ') || '—',
  },
  { key: 'location', header: 'Location', kind: 'code', cell: (r) => r.locationCode ?? '—' },
  {
    key: 'expiry',
    header: 'Expiry',
    kind: 'date',
    cell: (r) => <DateText value={r.expiryDate} expiry />,
  },
  { key: 'code', header: 'DRX code', kind: 'code', cell: (r) => r.unitCode },
  {
    key: 'status',
    header: 'Status',
    kind: 'status',
    cell: (r) => <StatusChip status={r.status} />,
  },
];

function rowActions(r: ResultRow) {
  return (
    <div className="flex gap-2 [&>*]:flex-1 lg:[&>*]:flex-none">
      <Button asChild size="sm">
        <Link href={`/checkout?item=${encodeURIComponent(r.id)}`}>Check Out</Link>
      </Button>
      <Button asChild size="sm" variant="outline">
        <Link href={`/inventory?focus=${encodeURIComponent(r.id)}`}>View</Link>
      </Button>
    </div>
  );
}

/** Results region under the search box. FEFO order comes from the backend. */
export function SearchResults({ state }: { state: SearchState }) {
  if (state.kind === 'idle') return null;

  if (state.kind === 'api-missing') {
    return (
      <EmptyState
        icon={PackageSearch}
        title="Inventory search isn't available yet"
        description="The items API endpoint is not live. Once the backend is wired up, results will appear here."
        action={<CheckInLink />}
      />
    );
  }

  return (
    <section aria-label="Search results" className="flex flex-col gap-3">
      {state.kind === 'success' ? (
        <p className="text-sm text-muted-foreground">
          {pluralize(state.rows.length, 'result')} · sorted FEFO
        </p>
      ) : null}
      <DataTable
        rows={state.kind === 'success' ? state.rows : []}
        rowKey={(r) => r.id}
        columns={COLUMNS}
        rowActions={rowActions}
        loading={state.kind === 'loading'}
        error={state.kind === 'error' ? state.message : null}
        caption="Active units matching your search"
        empty={{
          title: state.kind === 'success' ? `No medications match “${state.query}”` : 'No results',
          description: 'Check the spelling, or search by DRX code.',
          action: <CheckInLink />,
        }}
      />
      {state.kind === 'success' && state.rows.length > 0 ? (
        <div className="text-center">
          <CheckInLink />
        </div>
      ) : null}
    </section>
  );
}

function CheckInLink() {
  return (
    <Button asChild variant="link" size="sm">
      <Link href="/checkin">
        <PackageCheck aria-hidden /> Checking in medications? Start here.
      </Link>
    </Button>
  );
}
