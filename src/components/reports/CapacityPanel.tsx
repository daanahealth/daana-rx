'use client';

import { useEffect, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { reports, type CapacityBin } from '@/lib/api';
import { cn } from '@/lib/utils';

function thresholdClass(pct: number) {
  if (pct >= 95) return { bar: 'bg-destructive', badge: 'border-destructive/60 text-destructive bg-destructive/10', label: 'At capacity' };
  if (pct >= 90) return { bar: 'bg-amber-500', badge: 'border-amber-500/60 text-amber-600 bg-amber-500/10', label: 'Approaching capacity' };
  return { bar: 'bg-emerald-500', badge: 'border-emerald-500/60 text-emerald-600 bg-emerald-500/10', label: 'Normal' };
}

export function CapacityPanel() {
  const [rows, setRows] = useState<CapacityBin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    reports
      .capacity()
      .then((res) => { if (!cancelled) setRows(res.rows || []); })
      .catch((err) => { if (!cancelled) setError(err?.message || 'Failed to load capacity'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <section id="capacity" className="scroll-mt-24">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <MapPin className="h-5 w-5 text-amber-500" />
            Lots Approaching Capacity
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Default capacity is 50 units, alert fires at 45 units.
          </p>
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
              All bins are below 90% capacity.
            </p>
          ) : (
            <ul className="space-y-3">
              {rows.map((b) => {
                const t = thresholdClass(b.percent);
                return (
                  <li key={b.locationId} className="rounded-lg border bg-card p-3 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{b.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {b.current} / {b.capacity} units
                        </p>
                      </div>
                      <Badge variant="outline" className={cn('whitespace-nowrap', t.badge)}>
                        {Math.round(b.percent)}% · {t.label}
                      </Badge>
                    </div>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn('h-full transition-all', t.bar)}
                        style={{ width: `${Math.min(100, b.percent)}%` }}
                        aria-hidden
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
