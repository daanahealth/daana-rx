'use client';

import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, EmptyState } from '@/components/composed';
import { isReadOnlyRole } from '@/lib/roles';
import { MyRequestsScreen } from '@/features/requests/MyRequestsScreen';
import { RequestQueueScreen } from '@/features/requests/RequestQueueScreen';
import { Lock } from 'lucide-react';

/**
 * /requests — one route, two views by role:
 *  - providers: My Requests (own dispense requests with live status)
 *  - superadmins: the request queue (fulfill / deny / return to shelf)
 */
export default function RequestsPage() {
  const role = useSelector((s: RootState) => s.auth.user?.userRole);
  if (isReadOnlyRole(role)) return <MyRequestsScreen />;
  if (role === 'superadmin') return <RequestQueueScreen />;
  return (
    <AppShell>
      <PageHeader title="Requests" />
      <EmptyState
        icon={Lock}
        title="Superadmins only"
        description="Provider requests are fulfilled by a superadmin. Ask one to open this queue."
      />
    </AppShell>
  );
}
