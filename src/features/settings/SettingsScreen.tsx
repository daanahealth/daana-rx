'use client';

import * as React from 'react';
import { useSelector } from 'react-redux';
import { BookOpen, Gauge, MapPin, Stethoscope, User as UserIcon, Users } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/composed';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMediaQuery } from '@/hooks/use-media-query';
import { canManageSettings } from '@/lib/roles';
import type { RootState } from '@/store';
import { LocationsManager } from './components/LocationsManager';
import { UsersManager } from './components/UsersManager';
import { ClassificationGuide } from './components/ClassificationGuide';
import { CapacityExplainer } from './components/CapacityExplainer';
import { AccountPanel } from './components/AccountPanel';
import { ProvidersManager } from '@/features/provider/components/ProvidersManager';
import { ProviderRequestsPanel } from '@/features/provider/components/ProviderRequestsPanel';

type SettingsTab =
  | 'locations'
  | 'users'
  | 'classification'
  | 'capacity'
  | 'provider-requests'
  | 'account';

const TABS: Array<{
  value: SettingsTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: 'locations', label: 'Locations', icon: MapPin },
  { value: 'users', label: 'Users', icon: Users },
  { value: 'classification', label: 'Classification', icon: BookOpen },
  { value: 'capacity', label: 'Capacity', icon: Gauge },
  { value: 'provider-requests', label: 'Provider requests', icon: Stethoscope },
  { value: 'account', label: 'Account', icon: UserIcon },
];

/**
 * Settings: tabbed sections for superadmins (select on phones); everyone else
 * sees only Account (spec § "All Users").
 */
export function SettingsScreen() {
  const user = useSelector((s: RootState) => s.auth.user);
  const [tab, setTab] = React.useState<SettingsTab>('locations');
  const isSmall = useMediaQuery('(max-width: 767px)');

  if (!canManageSettings(user?.userRole)) {
    return (
      <AppShell>
        <PageHeader title="Settings" description="Your account." />
        <AccountPanel />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Settings"
        description="Locations, users, providers, classification rules, capacity, and your account."
      />
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as SettingsTab)}
        className="flex flex-col gap-6"
      >
        {isSmall ? (
          <Select value={tab} onValueChange={(v) => setTab(v as SettingsTab)}>
            <SelectTrigger className="h-11 w-full" aria-label="Settings section">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TABS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <TabsList
            aria-label="Settings sections"
            className="h-auto w-full justify-start gap-1 rounded-none border-b border-border bg-transparent p-0"
          >
            {TABS.map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="-mb-px h-10 gap-2 rounded-none border-b-2 border-transparent px-3 text-subtle-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                <t.icon className="h-4 w-4" aria-hidden />
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        )}
        <TabsContent value="locations" className="mt-0">
          <LocationsManager />
        </TabsContent>
        <TabsContent value="users" className="mt-0 flex flex-col gap-8">
          <UsersManager />
          <ProvidersManager />
        </TabsContent>
        <TabsContent value="classification" className="mt-0">
          <ClassificationGuide />
        </TabsContent>
        <TabsContent value="capacity" className="mt-0">
          <CapacityExplainer />
        </TabsContent>
        <TabsContent value="provider-requests" className="mt-0">
          <ProviderRequestsPanel />
        </TabsContent>
        <TabsContent value="account" className="mt-0">
          <AccountPanel onJumpToUsers={() => setTab('users')} />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
