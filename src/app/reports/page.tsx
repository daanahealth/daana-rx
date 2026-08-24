'use client';

import { AppShell } from '@/components/layout/AppShell';
import { ReportsScreen } from '@/features/reports/ReportsScreen';

export default function ReportsPage() {
  return (
    <AppShell>
      <ReportsScreen />
    </AppShell>
  );
}
