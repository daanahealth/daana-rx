'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { reports, type ExpiringItem } from '@/lib/api';
import { cn } from '@/lib/utils';

type Window = 30 | 60 | 90;

function urgencyClass(days: number): string {
  if (days <= 7) return 'border-destructive/60 text-destructive bg-destructive/10';
  if (days <= 30) return 'border-amber-500/60 text-amber-600 bg-amber-500/10';
  return 'border-muted-foreground/40 text-muted-foreground bg-muted/40';
}

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
}

export function ExpiringSoonPanel() {
  const [window, setWindow] = useState<Window>(30);
  const [rows, setRows] = useState<ExpiringItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    reports
      .expiring(window)
      .then((res) => { if (!cancelled) setRows(res.rows || []); })
      .catch((err) => { if (!cancelled) setError(err?.message || 'Failed to load expiring report'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [window]);

  return (
    <section id="expiring" className="scroll-mt-24">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Expiring Soon
            </CardTitle>
            <p className="text-sm text-muted-foreground">FEFO-sorted units approaching expiry</p>
          </div>
          <div className="flex gap-2" role="tablist" aria-label="Expiry window">
            {([30, 60, 90] as Window[]).map((w) => (
              <Button
                key={w}
                size="sm"
                variant={window === w ? 'default' : 'outline'}
                onClick={() => setWindow(w)}
                role="tab"
                aria-selected={window === w}
              >
                {w} days
              </Button>
            ))}
          </div>
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
              No medications expiring within {window} days.
            </p>
          ) : (
            <>
              {/* Mobile: card list */}
              <div className="space-y-3 lg:hidden">
                {rows.map((r) => (
                  <div key={r.unitId} className="rounded-lg border bg-card p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{r.medicationName}</p>
                        <p className="text-xs text-muted-foreground">{r.dosage}{r.form ? ` · ${r.form}` : ''}</p>
                      </div>
                      <Badge variant="outline" className={cn('whitespace-nowrap', urgencyClass(r.daysUntilExpiry))}>
                        {r.daysUntilExpiry}d
                      </Badge>
                    </div>
                    <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      <dt className="text-muted-foreground">Expires</dt>
                      <dd>{formatDate(r.expiryDate)}</dd>
                      <dt className="text-muted-foreground">Location</dt>
                      <dd>{r.location?.name ?? '—'}</dd>
                      <dt className="text-muted-foreground">DRX</dt>
                      <dd className="font-mono break-all">{r.drxCode}</dd>
                    </dl>
                  </div>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medication</TableHead>
                      <TableHead>Dosage</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>DRX Code</TableHead>
                      <TableHead className="text-right">Days Left</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.unitId}>
                        <TableCell className="font-medium">{r.medicationName}</TableCell>
                        <TableCell>{r.dosage}{r.form ? ` · ${r.form}` : ''}</TableCell>
                        <TableCell>{formatDate(r.expiryDate)}</TableCell>
                        <TableCell>{r.location?.name ?? '—'}</TableCell>
                        <TableCell className="font-mono text-xs">{r.drxCode}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className={cn(urgencyClass(r.daysUntilExpiry))}>
                            {r.daysUntilExpiry}d
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
