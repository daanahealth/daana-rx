'use client';

import { AppShell } from '@/components/layout/AppShell';
import { CheckinScreen } from '@/features/checkin/CheckinScreen';

export default function CheckInPage() {
  return (
    <AppShell>
      <CheckinScreen />
    </AppShell>
  );
}
