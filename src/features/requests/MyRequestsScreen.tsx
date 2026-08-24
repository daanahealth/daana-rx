'use client';

import * as React from 'react';
import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/layout/AppShell';
import {
  PageHeader,
  DataTable,
  DateText,
  StatusChip,
  EntityDrawer,
  type Column,
} from '@/components/composed';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/features/shared/useAsync';
import { doseForm } from '@/features/provider/mappers';
import { cancelRequest } from './api';
import { useMyRequests } from './hooks';
import { sortNewestFirst, hasPending, type DispenseRequestVM } from './mappers';

/**
 * MyRequestsScreen — the provider's own dispense requests with live status.
 * Polls every 15 s while anything is pending. Cancel is offered only while
 * pending; a denial shows the volunteer's reason. Never shows a location or code.
 */
export function MyRequestsScreen() {
  const { toast } = useToast();
  const list = useMyRequests();
  const rows = React.useMemo(() => sortNewestFirst(list.data ?? []), [list.data]);
  const [cancelling, setCancelling] = React.useState<DispenseRequestVM | null>(null);
  const [busy, setBusy] = React.useState(false);

  const confirmCancel = async () => {
    if (!cancelling) return;
    setBusy(true);
    const target = cancelling;
    try {
      const updated = await cancelRequest(target.id);
      list.setData((prev) => prev?.map((r) => (r.id === target.id ? updated : r)) ?? prev);
      toast({ title: 'Request cancelled', description: `${target.medicationName} was released.` });
      setCancelling(null);
    } catch (err) {
      toast({
        title: "Couldn't cancel",
        description: errorMessage(err),
        variant: 'destructive',
      });
      list.refetch();
    } finally {
      setBusy(false);
    }
  };

  const columns = React.useMemo<Column<DispenseRequestVM>[]>(
    () => [
      { key: 'med', header: 'Medication', primary: true, cell: (r) => r.medicationName },
      { key: 'dose', header: 'Dose · form', secondary: true, cell: (r) => doseForm(r) || '—' },
      {
        key: 'status',
        header: 'Status',
        kind: 'status',
        cell: (r) => <StatusChip kind="request" status={r.status} />,
      },
      { key: 'qty', header: 'Qty', kind: 'number', cell: (r) => r.quantity },
      {
        key: 'ref',
        header: 'Patient ref',
        kind: 'code',
        cell: (r) => r.patientRef ?? <span className="text-muted-foreground">—</span>,
      },
      {
        key: 'submitted',
        header: 'Submitted',
        kind: 'date',
        cell: (r) => <DateText value={r.createdAt} withTime />,
      },
      {
        key: 'note',
        header: 'Note',
        cell: (r) =>
          r.status === 'denied' && r.reason ? (
            <span className="text-danger">Denied: {r.reason}</span>
          ) : r.status === 'pending' && r.expiresAt ? (
            <span className="text-muted-foreground">
              Held until <DateText value={r.expiresAt} withTime />
            </span>
          ) : r.status === 'fulfilled' ? (
            <span className="text-muted-foreground">Ready at the front desk</span>
          ) : r.status === 'expired' ? (
            <span className="text-muted-foreground">
              Not fulfilled in time — re-request if needed
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
    ],
    []
  );

  return (
    <AppShell>
      <PageHeader
        title="My Requests"
        description="Dispense requests you have submitted and where each one stands."
        meta={
          hasPending(list.data) ? (
            <span className="text-xs text-muted-foreground" aria-live="polite">
              {list.refreshing ? 'Refreshing…' : 'Updates every 15 s'}
            </span>
          ) : null
        }
        actions={
          <Button asChild variant="outline">
            <Link href="/">Find a medication</Link>
          </Button>
        }
      />

      <DataTable<DispenseRequestVM>
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        loading={list.status === 'loading'}
        error={list.error}
        onRetry={list.refetch}
        caption="Your dispense requests"
        rowActions={(r) =>
          r.status === 'pending' ? (
            <Button variant="outline" size="sm" onClick={() => setCancelling(r)}>
              Cancel request
            </Button>
          ) : null
        }
        empty={{
          title: 'No requests yet',
          description: 'Find a medication in your specialty and tap Request. It will show up here.',
          action: (
            <Button asChild>
              <Link href="/">
                <ClipboardList aria-hidden /> Go to Home
              </Link>
            </Button>
          ),
        }}
      />

      <EntityDrawer
        open={!!cancelling}
        onOpenChange={(o) => !o && !busy && setCancelling(null)}
        desktop="dialog"
        title="Cancel this request?"
        description={
          cancelling
            ? `${cancelling.medicationName} × ${cancelling.quantity}. The reserved unit goes back on the shelf.`
            : undefined
        }
        footer={
          <>
            <Button
              variant="outline"
              size="touch"
              disabled={busy}
              onClick={() => setCancelling(null)}
            >
              Keep request
            </Button>
            <Button
              variant="destructive"
              size="touch"
              loading={busy}
              disabled={busy}
              onClick={confirmCancel}
            >
              Cancel request
            </Button>
          </>
        }
      >
        <p className="text-sm text-subtle-foreground">
          You can submit a new request any time if you still need it.
        </p>
      </EntityDrawer>
    </AppShell>
  );
}
