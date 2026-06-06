'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, ClipboardList, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { reports, type TransactionLogRow } from '@/lib/api';
import { cn } from '@/lib/utils';

const ACTION_TYPES: { value: string; label: string }[] = [
  { value: 'check_in', label: 'Check In' },
  { value: 'check_out', label: 'Check Out' },
  { value: 'edit', label: 'Edit' },
  { value: 'remove', label: 'Remove' },
  { value: 'cart_approved', label: 'Cart Approved' },
  { value: 'cart_rejected', label: 'Cart Rejected' },
  { value: 'expired_override', label: 'Expired Override' },
];

function formatTs(iso: string): string {
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

interface FilterState {
  dateFrom: string;
  dateTo: string;
  actionTypes: string[];
  actor: string;
  q: string;
}

const EMPTY: FilterState = { dateFrom: '', dateTo: '', actionTypes: [], actor: '', q: '' };

function hasFilters(f: FilterState): boolean {
  return Boolean(f.dateFrom || f.dateTo || f.actor || f.q || f.actionTypes.length > 0);
}

export function TransactionLogTable() {
  const [filters, setFilters] = useState<FilterState>(EMPTY);
  const [rows, setRows] = useState<TransactionLogRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFirst = useCallback(async (f: FilterState) => {
    setLoading(true);
    setError(null);
    try {
      const res = await reports.transactionLog({
        dateFrom: f.dateFrom || undefined,
        dateTo: f.dateTo || undefined,
        actionTypes: f.actionTypes.length > 0 ? f.actionTypes : undefined,
        actor: f.actor || undefined,
        q: f.q || undefined,
        limit: 50,
      });
      setRows(res.rows || []);
      setCursor(res.nextCursor ?? null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load transactions');
      setRows([]);
      setCursor(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFirst(filters);
  }, [fetchFirst, filters]);

  const loadMore = async () => {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const res = await reports.transactionLog({
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        actionTypes: filters.actionTypes.length > 0 ? filters.actionTypes : undefined,
        actor: filters.actor || undefined,
        q: filters.q || undefined,
        cursor,
        limit: 50,
      });
      setRows((prev) => [...prev, ...(res.rows || [])]);
      setCursor(res.nextCursor ?? null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load more transactions');
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleAction = (value: string) => {
    setFilters((f) => ({
      ...f,
      actionTypes: f.actionTypes.includes(value)
        ? f.actionTypes.filter((v) => v !== value)
        : [...f.actionTypes, value],
    }));
  };

  const clearAll = () => setFilters(EMPTY);

  const filtersActive = useMemo(() => hasFilters(filters), [filters]);

  return (
    <section id="transactions" className="scroll-mt-24">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <ClipboardList className="h-5 w-5 text-primary" />
            Transaction Log
          </CardTitle>
          <p className="text-sm text-muted-foreground">Full audit trail across check-ins, checkouts, edits, and removals</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter chips */}
          <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">From</label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">To</label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Actor</label>
                <Input
                  placeholder="username or email"
                  value={filters.actor}
                  onChange={(e) => setFilters((f) => ({ ...f, actor: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Search items</label>
                <Input
                  placeholder="medication, DRX, notes..."
                  value={filters.q}
                  onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Actions:</span>
              {ACTION_TYPES.map((a) => {
                const active = filters.actionTypes.includes(a.value);
                return (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => toggleAction(a.value)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs transition-colors',
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input bg-background hover:bg-accent'
                    )}
                    aria-pressed={active}
                  >
                    {a.label}
                  </button>
                );
              })}

              <div className="ml-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  disabled={!filtersActive}
                  className="text-xs"
                >
                  <X className="mr-1 h-3 w-3" /> Clear all
                </Button>
              </div>
            </div>
          </div>

          {/* Body */}
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {filtersActive
                ? 'No transactions match these filters.'
                : 'No transactions recorded yet.'}
            </p>
          ) : (
            <>
              {/* Mobile: card list */}
              <div className="space-y-3 lg:hidden">
                {rows.map((r) => (
                  <div key={r.transactionId} className="rounded-lg border bg-card p-3 shadow-sm text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="capitalize">
                        {r.actionType.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatTs(r.timestamp)}</span>
                    </div>
                    <p className="mt-2 font-semibold">
                      {r.medicationName ?? '—'}
                      {r.dosage ? <span className="ml-1 text-xs text-muted-foreground">{r.dosage}</span> : null}
                    </p>
                    <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      <dt className="text-muted-foreground">Form</dt>
                      <dd>{r.form ?? '—'}</dd>
                      <dt className="text-muted-foreground">Location</dt>
                      <dd>{r.location ?? '—'}</dd>
                      <dt className="text-muted-foreground">DRX</dt>
                      <dd className="font-mono break-all">{r.drxCode ?? '—'}</dd>
                      <dt className="text-muted-foreground">User</dt>
                      <dd>{r.user ?? '—'}</dd>
                      {r.reason ? (
                        <>
                          <dt className="text-muted-foreground">Reason</dt>
                          <dd>{r.reason}</dd>
                        </>
                      ) : null}
                      {r.notes ? (
                        <>
                          <dt className="text-muted-foreground">Notes</dt>
                          <dd className="break-words">{r.notes}</dd>
                        </>
                      ) : null}
                    </dl>
                  </div>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date &amp; Time</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Medication</TableHead>
                      <TableHead>Dose</TableHead>
                      <TableHead>Form</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>DRX Code</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.transactionId}>
                        <TableCell className="text-xs">{formatTs(r.timestamp)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {r.actionType.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{r.medicationName ?? '—'}</TableCell>
                        <TableCell>{r.dosage ?? '—'}</TableCell>
                        <TableCell>{r.form ?? '—'}</TableCell>
                        <TableCell>{r.location ?? '—'}</TableCell>
                        <TableCell className="font-mono text-xs">{r.drxCode ?? '—'}</TableCell>
                        <TableCell>{r.user ?? '—'}</TableCell>
                        <TableCell className="text-sm">{r.reason ?? '—'}</TableCell>
                        <TableCell className="max-w-xs truncate text-sm" title={r.notes}>
                          {r.notes ?? '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-center pt-2">
                {cursor ? (
                  <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…</>
                    ) : (
                      'Load more'
                    )}
                  </Button>
                ) : (
                  rows.length > 0 ? (
                    <span className="text-xs text-muted-foreground">End of log</span>
                  ) : null
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
