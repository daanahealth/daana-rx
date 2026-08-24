'use client';

import * as React from 'react';
import { useSelector } from 'react-redux';
import { Loader2 } from 'lucide-react';
import type { RootState } from '@/store';
import { isReadOnlyRole } from '@/lib/roles';

/**
 * RoleSwitch — renders `provider` for the read-only provider role and
 * `children` (the existing staff page) for everyone else. Waits for auth
 * hydration so a provider never sees a flash of the staff page (and the
 * staff page never fires its /inventory/items fetch for a provider).
 */
export function RoleSwitch({
  provider,
  children,
}: {
  provider: React.ReactNode;
  children: React.ReactNode;
}) {
  const { hasHydrated, user } = useSelector((s: RootState) => s.auth);
  if (!hasHydrated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading" />
      </div>
    );
  }
  return <>{isReadOnlyRole(user?.userRole) ? provider : children}</>;
}
