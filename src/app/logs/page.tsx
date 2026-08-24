'use client';

import { AppShell } from '@/components/layout/AppShell';
import { LogsScreen } from '@/features/reports/LogsScreen';

export default function LogsPage() {
  return (
    <AppShell>
      <LogsScreen />
    </AppShell>
  );
}
