'use client';

import { AppShell } from '@/components/layout/AppShell';
import { ScanScreen } from '@/features/scan/ScanScreen';

export default function ScanPage() {
  return (
    <AppShell>
      <ScanScreen />
    </AppShell>
  );
}
