'use client';

import { useEffect, useState } from 'react';
import { Loader2, PenSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { reports, type InventoryEditRow } from '@/lib/api';

function formatTs(iso: string): string {
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

function displayValue(v: string | null): string {
  if (v === null || v === undefined || v === '') return '—';
  return v;
}

export function InventoryEditsPanel() {
  const [rows, setRows] = useState<InventoryEditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    reports
      .inventoryEdits()
      .then((res) => { if (!cancelled) setRows(res.rows || []); })
      .catch((err) => { if (!cancelled) setError(err?.message || 'Failed to load inventory edits'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <section id="inventory-edits" className="scroll-mt-24">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <PenSquare className="h-5 w-5 text-blue-500" />
            Inventory Edits
          </CardTitle>
          <p className="text-sm text-muted-foreground">Field-level audit of recent inventory changes</p>
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
              No inventory edits recorded.
            </p>
          ) : (
            <>
              <div className="space-y-3 lg:hidden">
                {rows.map((r) => (
                  <div key={r.transactionId} className="rounded-lg border bg-card p-3 shadow-sm text-sm">
                    <p className="font-semibold">{r.medicationName}</p>
                    <p className="text-xs text-muted-foreground">{formatTs(r.timestamp)}</p>
                    <p className="mt-2">
                      <span className="text-xs font-medium text-muted-foreground">{r.field}: </span>
                      <span className="line-through text-muted-foreground">{displayValue(r.oldValue)}</span>
                      <span className="mx-1">→</span>
                      <span>{displayValue(r.newValue)}</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">By {r.actor ?? 'system'}</p>
                  </div>
                ))}
              </div>

              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Medication</TableHead>
                      <TableHead>Field</TableHead>
                      <TableHead>Change</TableHead>
                      <TableHead>Actor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.transactionId}>
                        <TableCell className="text-xs">{formatTs(r.timestamp)}</TableCell>
                        <TableCell className="font-medium">{r.medicationName}</TableCell>
                        <TableCell className="text-sm">{r.field}</TableCell>
                        <TableCell className="text-sm">
                          <span className="line-through text-muted-foreground">{displayValue(r.oldValue)}</span>
                          <span className="mx-1">→</span>
                          <span>{displayValue(r.newValue)}</span>
                        </TableCell>
                        <TableCell className="text-sm">{r.actor ?? 'system'}</TableCell>
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
