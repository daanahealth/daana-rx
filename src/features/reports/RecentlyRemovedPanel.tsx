import { Trash2 } from 'lucide-react';
import { DataTable, DateText, type Column } from '@/components/composed';
import { EMPTY } from '@/lib/format';
import type { RecentlyRemovedRow, UserDirectory } from './mappers';
import { actorLabel } from './mappers';
import type { AsyncResult } from './hooks';
import { ReportSection } from './ReportSection';

function columns(directory: UserDirectory): Column<RecentlyRemovedRow>[] {
  return [
    {
      key: 'medication',
      header: 'Medication',
      primary: true,
      cell: (r) => r.medicationName,
      sortValue: (r) => r.medicationName,
    },
    { key: 'dose', header: 'Dose', secondary: true, cell: (r) => r.dosage ?? EMPTY },
    {
      key: 'location',
      header: 'Location',
      cell: (r) => r.location ?? EMPTY,
      sortValue: (r) => r.location,
    },
    { key: 'code', header: 'DRX code', kind: 'code', cell: (r) => r.drxCode ?? EMPTY },
    {
      key: 'removed',
      header: 'Removed',
      kind: 'date',
      cell: (r) => <DateText value={r.removedAt} withTime />,
      sortValue: (r) => r.removedAt,
    },
    {
      key: 'by',
      header: 'Removed by',
      cell: (r) => actorLabel({ actorId: r.removedBy, actorKind: null }, directory),
    },
    { key: 'reason', header: 'Reason', cell: (r) => r.reason ?? EMPTY, sortValue: (r) => r.reason },
  ];
}

export function RecentlyRemovedPanel({
  result,
  directory,
}: {
  result: AsyncResult<RecentlyRemovedRow[]>;
  directory: UserDirectory;
}) {
  return (
    <ReportSection
      id="recently-removed"
      icon={Trash2}
      title="Recently Removed"
      description="Units taken out of inventory in the last 30 days, with the reason given."
    >
      <DataTable
        rows={result.data ?? []}
        rowKey={(r) => r.unitId}
        columns={columns(directory)}
        defaultSort={{ key: 'removed', dir: 'desc' }}
        loading={result.loading}
        error={result.error}
        onRetry={result.refetch}
        dense
        caption="Recently removed units"
        empty={{
          title: 'Nothing removed in the last 30 days',
          description: 'Removals from the inventory page land here with their reason.',
        }}
      />
    </ReportSection>
  );
}
