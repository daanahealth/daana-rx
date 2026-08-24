import { MapPin, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/composed';
import { TONE_CLASSES, type Tone } from '@/lib/status';
import { formatCount } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { CapacityRow } from './mappers';
import type { AsyncResult } from './hooks';
import { ReportSection } from './ReportSection';

function capacityTone(pct: number): { tone: Tone; label: string } {
  if (pct >= 95) return { tone: 'danger', label: 'At capacity' };
  if (pct >= 90) return { tone: 'warn', label: 'Approaching capacity' };
  return { tone: 'ok', label: 'Normal' };
}

export function CapacityPanel({ result }: { result: AsyncResult<CapacityRow[]> }) {
  const rows = result.data ?? [];
  return (
    <ReportSection
      id="capacity"
      icon={MapPin}
      title="Lots Approaching Capacity"
      description="Bins at 90% or fuller. Default capacity is 50 units; the alert fires at 45."
    >
      {result.error ? (
        <EmptyState
          size="sm"
          icon={AlertCircle}
          title="Couldn't load capacity"
          description={result.error}
          action={
            <Button variant="outline" size="sm" onClick={result.refetch}>
              Try again
            </Button>
          }
        />
      ) : result.loading ? (
        <ul className="space-y-3" aria-busy>
          {[0, 1, 2].map((i) => (
            <li key={i} className="rounded-lg border border-border p-3">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="mt-3 h-2 w-full" />
            </li>
          ))}
        </ul>
      ) : rows.length === 0 ? (
        <EmptyState
          size="sm"
          title="All bins are below 90% capacity"
          description="A bin shows up here once it holds 45 of its 50 units."
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((b) => {
            const { tone, label } = capacityTone(b.percent);
            const pct = Math.round(b.percent);
            return (
              <li key={b.locationId} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{b.name}</p>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {formatCount(b.current)} / {formatCount(b.capacity)} units
                    </p>
                  </div>
                  <span
                    className={cn(
                      'inline-flex h-[22px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-xs font-medium',
                      TONE_CLASSES[tone].chip
                    )}
                  >
                    <span className="tabular-nums">{pct}%</span> · {label}
                  </span>
                </div>
                <div
                  className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-panel"
                  role="meter"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.min(100, pct)}
                  aria-label={`${b.name} capacity`}
                >
                  <div
                    className={cn('h-full', TONE_CLASSES[tone].dot)}
                    style={{ width: `${Math.min(100, b.percent)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </ReportSection>
  );
}
