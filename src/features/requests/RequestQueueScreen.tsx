'use client';

import * as React from 'react';
import { Inbox, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, EmptyState, NavBadge } from '@/components/composed';
import { useToast } from '@/hooks/use-toast';
import { isApiError } from '@/lib/apiClient';
import { errorMessage } from '@/features/shared/useAsync';
import { denyRequest, fulfillRequest, returnRequestToShelf } from './api';
import { useRequestQueue, useNow } from './hooks';
import { sortNewestFirst, sortOldestFirst, type DispenseRequestVM } from './mappers';
import { QueueCard, requestSubject } from './components/QueueCard';
import { ReasonDialog } from './components/ReasonDialog';

/**
 * RequestQueueScreen — the superadmin's dispense-request queue. Pending
 * oldest-first with TTL countdowns; resolved newest-first with Return to
 * Shelf. Mutations are optimistic and the list polls every 30 s, so the
 * queue never needs a full reload (spec T11).
 */
type Tab = 'pending' | 'resolved';

type Dialog =
  | { kind: 'deny'; request: DispenseRequestVM }
  | { kind: 'return'; request: DispenseRequestVM }
  | null;

export function RequestQueueScreen() {
  const { toast } = useToast();
  const [tab, setTab] = React.useState<Tab>('pending');
  const pending = useRequestQueue('pending');
  const resolved = useRequestQueue('resolved', tab === 'resolved');
  const now = useNow();

  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [dialog, setDialog] = React.useState<Dialog>(null);
  const [dialogError, setDialogError] = React.useState<string | null>(null);

  const pendingRows = React.useMemo(() => sortOldestFirst(pending.data ?? []), [pending.data]);
  const resolvedRows = React.useMemo(() => sortNewestFirst(resolved.data ?? []), [resolved.data]);

  /** Move a request out of pending (optimistic) and into resolved. */
  const settle = (id: string, updated: DispenseRequestVM | null) => {
    pending.setData((prev) => prev?.filter((r) => r.id !== id) ?? prev);
    if (updated)
      resolved.setData((prev) => (prev ? [updated, ...prev.filter((r) => r.id !== id)] : prev));
  };

  const fulfill = async (r: DispenseRequestVM) => {
    setBusyId(r.id);
    const snapshot = pending.data;
    settle(r.id, { ...r, status: 'fulfilled', resolvedAt: new Date().toISOString() });
    try {
      const updated = await fulfillRequest(r.id);
      resolved.setData((prev) => prev?.map((x) => (x.id === r.id ? updated : x)) ?? prev);
      toast({ title: 'Fulfilled', description: `${requestSubject(r)} — hand it to the provider.` });
    } catch (err) {
      pending.setData(() => snapshot);
      resolved.setData((prev) => prev?.filter((x) => x.id !== r.id) ?? prev);
      const expired = isApiError(err) && err.status === 409;
      toast({
        title: expired ? 'Request expired' : "Couldn't fulfill",
        description: errorMessage(err),
        variant: 'destructive',
      });
      pending.refetch();
    } finally {
      setBusyId(null);
    }
  };

  const submitReason = async (reason: string) => {
    if (!dialog) return;
    const { kind, request: r } = dialog;
    setBusyId(r.id);
    setDialogError(null);
    try {
      if (kind === 'deny') {
        const updated = await denyRequest(r.id, reason);
        settle(r.id, updated);
        toast({ title: 'Denied', description: `${r.medicationName} released back to the shelf.` });
      } else {
        const updated = await returnRequestToShelf(r.id, reason);
        resolved.setData((prev) => prev?.map((x) => (x.id === r.id ? updated : x)) ?? prev);
        toast({
          title: 'Returned to shelf',
          description: `${r.medicationName} is available again.`,
        });
      }
      setDialog(null);
    } catch (err) {
      setDialogError(errorMessage(err));
      if (isApiError(err) && err.status === 409) pending.refetch();
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = pending.data?.length ?? 0;

  return (
    <AppShell>
      <PageHeader
        title="Requests"
        description="Pending provider requests, oldest first. Fulfill, deny, or return to shelf."
        meta={<NavBadge count={pendingCount} label="pending" />}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => (tab === 'pending' ? pending.refetch() : resolved.refetch())}
            disabled={pending.refreshing || resolved.refreshing}
          >
            <RefreshCw aria-hidden className={pending.refreshing ? 'animate-spin' : undefined} />
            Refresh
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            Pending <NavBadge count={pendingCount} label="pending" tone="quiet" />
          </TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <QueueList
            rows={pendingRows}
            loading={pending.status === 'loading'}
            error={pending.error}
            onRetry={pending.refetch}
            now={now}
            busyId={busyId}
            onFulfill={fulfill}
            onDeny={(r) => {
              setDialogError(null);
              setDialog({ kind: 'deny', request: r });
            }}
            empty={{
              title: 'No pending requests',
              description:
                'When a provider submits a request it appears here with the reserved unit.',
            }}
          />
        </TabsContent>

        <TabsContent value="resolved" className="mt-4">
          <QueueList
            rows={resolvedRows}
            loading={resolved.status === 'loading'}
            error={resolved.error}
            onRetry={resolved.refetch}
            now={now}
            busyId={busyId}
            onReturn={(r) => {
              setDialogError(null);
              setDialog({ kind: 'return', request: r });
            }}
            empty={{
              title: 'Nothing resolved yet',
              description: 'Fulfilled, denied, expired and cancelled requests are listed here.',
            }}
          />
        </TabsContent>
      </Tabs>

      <ReasonDialog
        open={!!dialog}
        kind={dialog?.kind ?? 'deny'}
        subject={dialog ? requestSubject(dialog.request) : ''}
        submitting={!!dialog && busyId === dialog.request.id}
        error={dialogError}
        onOpenChange={(o) => {
          if (!o && !busyId) setDialog(null);
        }}
        onSubmit={submitReason}
      />
    </AppShell>
  );
}

function QueueList({
  rows,
  loading,
  error,
  onRetry,
  now,
  busyId,
  onFulfill,
  onDeny,
  onReturn,
  empty,
}: {
  rows: DispenseRequestVM[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  now: Date;
  busyId: string | null;
  onFulfill?: (r: DispenseRequestVM) => void;
  onDeny?: (r: DispenseRequestVM) => void;
  onReturn?: (r: DispenseRequestVM) => void;
  empty: { title: string; description: string };
}) {
  if (error && rows.length === 0) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Couldn't load requests"
        description={error}
        action={
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        }
      />
    );
  }
  if (loading && rows.length === 0) {
    return (
      <div className="grid gap-3 lg:grid-cols-2" aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="mt-2 h-4 w-1/3" />
            <Skeleton className="mt-4 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-3/4" />
          </div>
        ))}
      </div>
    );
  }
  if (rows.length === 0) {
    return <EmptyState icon={Inbox} title={empty.title} description={empty.description} />;
  }
  return (
    <ul className="grid gap-3 lg:grid-cols-2">
      {rows.map((r) => (
        <li key={r.id} className="min-w-0">
          <QueueCard
            request={r}
            now={now}
            busy={busyId === r.id}
            onFulfill={onFulfill}
            onDeny={onDeny}
            onReturn={onReturn}
          />
        </li>
      ))}
    </ul>
  );
}
