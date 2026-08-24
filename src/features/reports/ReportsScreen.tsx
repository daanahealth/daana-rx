'use client';

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { FileText } from 'lucide-react';
import type { RootState } from '@/store';
import { PageHeader, EmptyState } from '@/components/composed';
import { Card } from '@/components/ui/card';
import { isReadOnlyRole } from '@/lib/roles';
import type { ExpiryWindow } from './api';
import {
  useCapacity,
  useExpiring,
  useHighUse,
  useInventoryEdits,
  useRecentlyRemoved,
  useUserDirectory,
} from './hooks';
import { DashboardCards } from './DashboardCards';
import { ExpiringSoonPanel } from './ExpiringSoonPanel';
import { CapacityPanel } from './CapacityPanel';
import { HighUsePanel } from './HighUsePanel';
import { RecentlyRemovedPanel } from './RecentlyRemovedPanel';
import { InventoryEditsPanel } from './InventoryEditsPanel';
import { TransactionLogTable } from './TransactionLogTable';

/**
 * /reports — the dashboard cards and every report panel read from one fetch
 * per endpoint (previously the cards re-fetched all four).
 */
export function ReportsScreen() {
  const role = useSelector((s: RootState) => s.auth.user?.userRole);
  const [window, setWindow] = useState<ExpiryWindow>(30);
  const provider = isReadOnlyRole(role);

  if (provider) {
    return (
      <>
        <PageHeader title="Reports" />
        <Card>
          <EmptyState
            icon={FileText}
            title="Reports are for clinic staff"
            description="Your account can browse medications and raise requests. Ask a superadmin if you need a report."
          />
        </Card>
      </>
    );
  }

  return <ReportsDashboard window={window} onWindowChange={setWindow} />;
}

function ReportsDashboard({
  window,
  onWindowChange,
}: {
  window: ExpiryWindow;
  onWindowChange: (w: ExpiryWindow) => void;
}) {
  const directory = useUserDirectory();
  const expiring = useExpiring(window);
  const capacity = useCapacity();
  const highUse = useHighUse();
  const removed = useRecentlyRemoved();
  const edits = useInventoryEdits();

  return (
    <>
      <PageHeader
        title="Reports"
        description="Inventory insights and the full transaction audit trail."
      />
      <div className="space-y-6">
        <DashboardCards
          expiringCount={window === 30 ? (expiring.data?.length ?? null) : null}
          capacityCount={capacity.data?.length ?? null}
          highUse={highUse.data}
          removedCount={removed.data?.length ?? null}
        />
        <ExpiringSoonPanel window={window} onWindowChange={onWindowChange} result={expiring} />
        <CapacityPanel result={capacity} />
        <HighUsePanel result={highUse} />
        <RecentlyRemovedPanel result={removed} directory={directory} />
        <InventoryEditsPanel result={edits} directory={directory} />
        <TransactionLogTable directory={directory} />
      </div>
    </>
  );
}
