import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable, DateText, type Column } from '@/components/composed';
import { EMPTY, formatCount } from '@/lib/format';
import type { ExpiryWindow } from './api';
import type { ExpiringRow } from './mappers';
import type { AsyncResult } from './hooks';
import { ReportSection } from './ReportSection';

const WINDOWS: ExpiryWindow[] = [30, 60, 90];

const COLUMNS: Column<ExpiringRow>[] = [
  {
    key: 'medication',
    header: 'Medication',
    primary: true,
    cell: (r) => r.medicationName,
    sortValue: (r) => r.medicationName,
  },
  {
    key: 'dose',
    header: 'Dose',
    secondary: true,
    cell: (r) => [r.dosage, r.form].filter(Boolean).join(' · ') || EMPTY,
  },
  {
    key: 'expiry',
    header: 'Expiry',
    kind: 'date',
    cell: (r) => <DateText value={r.expiryDate} expiry noHint />,
    sortValue: (r) => r.expiryDate,
  },
  {
    key: 'days',
    header: 'Days left',
    kind: 'number',
    cell: (r) => (r.daysUntilExpiry === null ? EMPTY : formatCount(r.daysUntilExpiry)),
    sortValue: (r) => r.daysUntilExpiry,
  },
  {
    key: 'location',
    header: 'Location',
    cell: (r) => r.location ?? EMPTY,
    sortValue: (r) => r.location,
  },
  { key: 'code', header: 'DRX code', kind: 'code', cell: (r) => r.drxCode ?? EMPTY },
];

export interface ExpiringSoonPanelProps {
  window: ExpiryWindow;
  onWindowChange: (w: ExpiryWindow) => void;
  result: AsyncResult<ExpiringRow[]>;
}

export function ExpiringSoonPanel({ window, onWindowChange, result }: ExpiringSoonPanelProps) {
  return (
    <ReportSection
      id="expiring"
      icon={AlertTriangle}
      title="Expiring Soon"
      description="Active units approaching expiry, first-expiry-first-out."
      actions={
        <div className="flex gap-1" role="tablist" aria-label="Expiry window">
          {WINDOWS.map((w) => (
            <Button
              key={w}
              size="sm"
              variant={window === w ? 'default' : 'outline'}
              onClick={() => onWindowChange(w)}
              role="tab"
              aria-selected={window === w}
              className="min-h-11 lg:min-h-9"
            >
              {w} days
            </Button>
          ))}
        </div>
      }
    >
      <DataTable
        rows={result.data ?? []}
        rowKey={(r) => r.unitId}
        columns={COLUMNS}
        defaultSort={{ key: 'expiry', dir: 'asc' }}
        loading={result.loading}
        error={result.error}
        onRetry={result.refetch}
        dense
        caption={`Units expiring within ${window} days`}
        empty={{
          title: `Nothing expires within ${window} days`,
          description:
            'Widen the window to plan ahead, or check the shelf after the next check-in.',
        }}
      />
    </ReportSection>
  );
}
