'use client';

import { useEffect, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { reports, type RecentlyRemovedRow } from '@/lib/api';
import { cn } from '@/lib/utils';

function reasonClass(reason: string): string {
  const r = reason.toLowerCase();
  if (r.includes('expired')) return 'border-destructive/60 text-destructive bg-destructive/10';
  if (r.includes('damaged') || r.includes('disposed')) return 'border-amber-500/60 text-amber-600 bg-amber-500/10';
  if (r.includes('lost') || r.includes('missing')) return 'border-orange-500/60 text-orange-600 bg-orange-500/10';
  return 'border-muted-foreground/40 text-muted-foreground bg-muted/40';
}

function formatTs(iso: string): string {
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

export function RecentlyRemovedPanel() {
  const [rows, setRows] = useState<RecentlyRemovedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    reports
      .recentlyRemoved()
      .then((res) => { if (!cancelled) setRows(res.rows || []); })
      .catch((err) => { if (!cancelled) setError(err?.message || 'Failed to load recently removed'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <section id="recently-removed" className="scroll-mt-24">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Trash2 className="h-5 w-5 text-rose-500" />
            Recently Removed
          </CardTitle>
          <p className="text-sm text-muted-foreground">Soft-deleted units in the last 30 days</p>
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
              No medications removed in the last 30 days.
            </p>
          ) : (
            <>
              <div className="space-y-3 lg:hidden">
                {rows.map((r) => (
                  <div key={r.unitId} className="rounded-lg border bg-card p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{r.medicationName}</p>
                        <p className="text-xs text-muted-foreground">{r.dosage}</p>
                      </div>
                      <Badge variant="outline" className={cn(reasonClass(r.reason))}>{r.reason}</Badge>
                    </div>
                    <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      <dt className="text-muted-foreground">Location</dt>
                      <dd>{r.location ?? '—'}</dd>
                      <dt className="text-muted-foreground">DRX</dt>
                      <dd className="font-mono break-all">{r.drxCode}</dd>
                      <dt className="text-muted-foreground">When</dt>
                      <dd>{formatTs(r.removedAt)}</dd>
                      <dt className="text-muted-foreground">By</dt>
                      <dd>{r.removedBy ?? '—'}</dd>
                    </dl>
                  </div>
                ))}
              </div>

              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medication</TableHead>
                      <TableHead>Dosage</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>DRX Code</TableHead>
                      <TableHead>Removed</TableHead>
                      <TableHead>Removed By</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.unitId}>
                        <TableCell className="font-medium">{r.medicationName}</TableCell>
                        <TableCell>{r.dosage}</TableCell>
                        <TableCell>{r.location ?? '—'}</TableCell>
                        <TableCell className="font-mono text-xs">{r.drxCode}</TableCell>
                        <TableCell>{formatTs(r.removedAt)}</TableCell>
                        <TableCell>{r.removedBy ?? '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(reasonClass(r.reason))}>{r.reason}</Badge>
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
