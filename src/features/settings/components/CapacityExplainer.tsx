import { Bell, Gauge } from 'lucide-react';
import { KeyValueList } from '@/components/composed';
import { Notice, SectionHeader } from './shared';

/**
 * Read-only — Settings › Capacity. Wording is the spec's:
 * "Default 50 units per bin, configurable per bin in Locations.
 *  Alert fires at 90%, not separately configurable."
 */
export function CapacityExplainer() {
  return (
    <section aria-labelledby="settings-capacity" className="flex flex-col gap-4">
      <SectionHeader
        title="Capacity thresholds"
        description="How bin capacity and capacity alerts work in DaanaRX."
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
          <Gauge className="mt-0.5 h-5 w-5 shrink-0 text-subtle-foreground" aria-hidden />
          <KeyValueList
            columns={1}
            items={[
              {
                label: 'Default capacity',
                value: '50 units per bin — configurable per bin in Locations.',
              },
            ]}
          />
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
          <Bell className="mt-0.5 h-5 w-5 shrink-0 text-subtle-foreground" aria-hidden />
          <KeyValueList
            columns={1}
            items={[
              { label: 'Alert threshold', value: '90% of capacity — not separately configurable.' },
            ]}
          />
        </div>
      </div>
      <Notice title="When a bin is full">
        Check In suggests the next sequential bin in the same specialty (CARDIO1 full → CARDIO2). If
        no overflow bin exists, create one in Locations before continuing.
      </Notice>
    </section>
  );
}
