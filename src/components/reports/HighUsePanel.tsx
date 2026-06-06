'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { reports, type HighUseRow } from '@/lib/api';

export function HighUsePanel() {
  const [rows, setRows] = useState<HighUseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    reports
      .highUse()
      .then((res) => { if (!cancelled) setRows(res.rows || []); })
      .catch((err) => { if (!cancelled) setError(err?.message || 'Failed to load high-use report'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const max = useMemo(
    () => rows.reduce((m, r) => Math.max(m, r.checkoutCount), 0),
    [rows]
  );

  return (
    <section id="high-use" className="scroll-mt-24">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            High-Use Medications
          </CardTitle>
          <p className="text-sm text-muted-foreground">Top 25 by checkout frequency in the last 30 days</p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No checkouts recorded in the last 30 days.
            </p>
          ) : (
            <ol className="space-y-2">
              {rows.map((r, idx) => {
                const widthPct = max > 0 ? Math.max(4, (r.checkoutCount / max) * 100) : 0;
                return (
                  <li key={r.drugId} className="flex items-center gap-3">
                    <span className="w-6 text-right text-xs font-mono text-muted-foreground">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-medium">
                          {r.medicationName}
                          <span className="ml-2 text-xs text-muted-foreground">
                            {r.dosage}{r.strengthUnit ? r.strengthUnit : ''}{r.form ? ` · ${r.form}` : ''}
                          </span>
                        </p>
                        <span className="text-xs font-semibold tabular-nums">{r.checkoutCount}</span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary/70"
                          style={{ width: `${widthPct}%` }}
                          aria-hidden
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
