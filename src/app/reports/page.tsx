'use client';

import { AppShell } from '../../components/layout/AppShell';
import { DashboardCards } from '@/components/reports/DashboardCards';
import { ExpiringSoonPanel } from '@/components/reports/ExpiringSoonPanel';
import { CapacityPanel } from '@/components/reports/CapacityPanel';
import { HighUsePanel } from '@/components/reports/HighUsePanel';
import { RecentlyRemovedPanel } from '@/components/reports/RecentlyRemovedPanel';
import { InventoryEditsPanel } from '@/components/reports/InventoryEditsPanel';
import { TransactionLogTable } from '@/components/reports/TransactionLogTable';

export default function ReportsPage() {
  return (
    <AppShell>
      <div className="space-y-6 sm:space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Reports</h1>
          <p className="text-base sm:text-lg text-muted-foreground">
            Inventory insights and the full transaction audit trail
          </p>
        </div>

        <DashboardCards />

        <ExpiringSoonPanel />
        <CapacityPanel />
        <HighUsePanel />
        <RecentlyRemovedPanel />
        <InventoryEditsPanel />
        <TransactionLogTable />
      </div>
    </AppShell>
  );
}
