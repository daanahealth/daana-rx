'use client';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/composed';

/**
 * Provider home placeholder. Lane A4 owns the specialty-first provider home
 * (`src/features/provider`); when it lands, replace this file's body with
 * `export { ProviderHome } from '@/features/provider';` and delete the rest.
 */
export function ProviderHome() {
  return (
    <AppShell>
      <PageHeader
        title="Home"
        description="Search what is dispensable right now and request it for a patient."
      />
    </AppShell>
  );
}
