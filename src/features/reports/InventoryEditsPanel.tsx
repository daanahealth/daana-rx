import { PenSquare } from 'lucide-react';
import { DataTable, DateText, type Column } from '@/components/composed';
import { EMPTY } from '@/lib/format';
import type { InventoryEditRow, UserDirectory } from './mappers';
import { actorLabel } from './mappers';
import type { AsyncResult } from './hooks';
import { ReportSection } from './ReportSection';

function columns(directory: UserDirectory): Column<InventoryEditRow>[] {
  return [
    {
      key: 'when',
      header: 'When',
      kind: 'date',
      secondary: true,
      cell: (r) => <DateText value={r.timestamp} withTime />,
      sortValue: (r) => r.timestamp,
    },
    {
      key: 'medication',
      header: 'Medication',
      primary: true,
      cell: (r) => r.medicationName,
      sortValue: (r) => r.medicationName,
    },
    {
      key: 'field',
      header: 'Field',
      cell: (r) => r.field,
      sortValue: (r) => r.field,
    },
    {
      key: 'change',
      header: 'Change',
      cell: (r) => (
        <span className="inline-flex flex-wrap items-baseline gap-1">
          <s className="text-muted-foreground">{r.oldValue ?? EMPTY}</s>
          <span aria-hidden>→</span>
          <span className="sr-only">changed to</span>
          <span className="text-foreground">{r.newValue ?? EMPTY}</span>
        </span>
      ),
    },
    { key: 'actor', header: 'Actor', cell: (r) => actorLabel(r, directory) },
  ];
}

export function InventoryEditsPanel({
  result,
  directory,
}: {
  result: AsyncResult<InventoryEditRow[]>;
  directory: UserDirectory;
}) {
  return (
    <ReportSection
      id="inventory-edits"
      icon={PenSquare}
      title="Inventory Edits"
      description="Field-level audit of unit edits in the last 30 days."
    >
      <DataTable
        rows={result.data ?? []}
        rowKey={(r) => r.key}
        columns={columns(directory)}
        defaultSort={{ key: 'when', dir: 'desc' }}
        loading={result.loading}
        error={result.error}
        onRetry={result.refetch}
        dense
        caption="Inventory edits"
        empty={{
          title: 'No edits in the last 30 days',
          description: 'Editing a unit from its details drawer records every changed field here.',
        }}
      />
    </ReportSection>
  );
}
