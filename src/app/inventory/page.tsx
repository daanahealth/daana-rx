'use client';

// /inventory — the unit-level inventory control panel. The page only composes
// the shell and the feature screen; everything else lives in
// src/features/inventory (see docs/FRONTEND_ARCHITECTURE.md §2).

import { AppShell } from '@/components/layout/AppShell';
import { InventoryScreen } from '@/features/inventory/InventoryScreen';

export default function InventoryPage() {
  return (
    <AppShell>
      <InventoryScreen />
    </AppShell>
  );
}
