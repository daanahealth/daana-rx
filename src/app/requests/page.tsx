'use client';

import { useSelector } from 'react-redux';
import { Inbox, ClipboardList } from 'lucide-react';
import type { RootState } from '@/store';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/composed/PageHeader';
import { EmptyState } from '@/components/composed/EmptyState';
import { Card } from '@/components/ui/card';
import { isReadOnlyRole } from '@/lib/roles';

/**
 * /requests — one route, two views by role:
 *  - providers: "My Requests" (own dispense requests with live status)
 *  - superadmins: the request queue (fulfill / deny / return to shelf)
 *
 * Placeholder from the design-foundation lane; the provider-UI lane
 * replaces the body with the real lists against /transactions/requests.
 */
export default function RequestsPage() {
  const role = useSelector((s: RootState) => s.auth.user?.userRole);
  const provider = isReadOnlyRole(role);

  return (
    <AppShell>
      <PageHeader
        title={provider ? 'My Requests' : 'Requests'}
        description={
          provider
            ? 'Dispense requests you have submitted and where each one stands.'
            : 'Pending provider requests, oldest first. Fulfill, deny, or return to shelf.'
        }
      />
      <Card>
        <EmptyState
          icon={provider ? ClipboardList : Inbox}
          title={provider ? 'No requests yet' : 'No pending requests'}
          description={
            provider
              ? 'Find a medication in your specialty and tap Request. It will show up here.'
              : 'When a provider submits a request it appears here with the reserved unit.'
          }
        />
      </Card>
    </AppShell>
  );
}
