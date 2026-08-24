import { TrendingUp, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/composed';
import { formatCount } from '@/lib/format';
import type { HighUseRow } from './mappers';
import type { AsyncResult } from './hooks';
import { ReportSection } from './ReportSection';

export function HighUsePanel({ result }: { result: AsyncResult<HighUseRow[]> }) {
  const rows = result.data ?? [];
  const max = rows.reduce((m, r) => Math.max(m, r.checkoutCount), 0);
  return (
    <ReportSection
      id="high-use"
      icon={TrendingUp}
      title="High-Use Medications"
      description="Top 25 by checkout count in the last 30 days."
    >
      {result.error ? (
        <EmptyState
          size="sm"
          icon={AlertCircle}
          title="Couldn't load high-use medications"
          description={result.error}
          action={
            <Button variant="outline" size="sm" onClick={result.refetch}>
              Try again
            </Button>
          }
        />
      ) : result.loading ? (
        <ol className="space-y-3" aria-busy>
          {[0, 1, 2, 3].map((i) => (
            <li key={i}>
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="mt-2 h-1.5 w-full" />
            </li>
          ))}
        </ol>
      ) : rows.length === 0 ? (
        <EmptyState
          size="sm"
          title="No checkouts in the last 30 days"
          description="Once units are checked out, the most dispensed medications rank here."
        />
      ) : (
        <ol className="space-y-2.5">
          {rows.map((r, idx) => {
            const width = max > 0 ? Math.max(4, (r.checkoutCount / max) * 100) : 0;
            return (
              <li key={r.key} className="flex items-center gap-3">
                <span className="w-6 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-medium text-foreground">
                      {r.medicationName}
                      {r.dosage || r.form ? (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          {[r.dosage, r.form].filter(Boolean).join(' · ')}
                        </span>
                      ) : null}
                    </p>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatCount(r.checkoutCount)}
                    </span>
                  </div>
                  <div
                    className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-panel"
                    aria-hidden
                  >
                    <div className="h-full bg-primary" style={{ width: `${width}%` }} />
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </ReportSection>
  );
}
