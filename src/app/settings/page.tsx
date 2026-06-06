'use client';

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Lock, MapPin, Users, BookOpen, Gauge, User as UserIcon } from 'lucide-react';
import { RootState } from '../../store';
import { AppShell } from '../../components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMediaQuery } from '@/hooks/use-media-query';
import { LocationsManager } from '@/components/settings/LocationsManager';
import { UsersManager } from '@/components/settings/UsersManager';
import { ClassificationGuide } from '@/components/settings/ClassificationGuide';
import { CapacityExplainer } from '@/components/settings/CapacityExplainer';
import { AccountPanel } from '@/components/settings/AccountPanel';

type SettingsTab = 'locations' | 'users' | 'classification' | 'capacity' | 'account';

const TABS: Array<{ value: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { value: 'locations', label: 'Locations', icon: MapPin },
  { value: 'users', label: 'Users', icon: Users },
  { value: 'classification', label: 'Classification Guide', icon: BookOpen },
  { value: 'capacity', label: 'Capacity', icon: Gauge },
  { value: 'account', label: 'Account', icon: UserIcon },
];

export default function SettingsPage() {
  const user = useSelector((s: RootState) => s.auth.user);
  const isSuperadmin = user?.userRole === 'superadmin';
  const [tab, setTab] = useState<SettingsTab>('locations');
  // Tablet/mobile breakpoint — below md (768px) switch tabs → select.
  const isSmall = useMediaQuery('(max-width: 767px)');

  // Non-superadmins still get the Account tab (spec § "All Users"), but
  // everything else is gated.
  if (!isSuperadmin) {
    return (
      <AppShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-base text-muted-foreground">Your account settings.</p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lock className="h-4 w-4" />
                Superadmin-only sections
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Location management, user management, classification guide, and capacity thresholds are restricted to
                superadmins.
              </p>
              <p>
                You can still change your password and view your assigned role below. Ask an upstairs staff member if
                you need elevated access.
              </p>
            </CardContent>
          </Card>
          <AccountPanel />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Settings</h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            Manage locations, users, classification rules, and your account.
          </p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as SettingsTab)} className="space-y-4">
          {isSmall ? (
            <Select value={tab} onValueChange={(v) => setTab(v as SettingsTab)}>
              <SelectTrigger className="w-full" aria-label="Settings section">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TABS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <span className="flex items-center gap-2">
                      <t.icon className="h-4 w-4" />
                      {t.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 sm:w-auto">
              {TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value} className="gap-2">
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          )}

          <TabsContent value="locations" className="space-y-4">
            <LocationsManager />
          </TabsContent>
          <TabsContent value="users" className="space-y-4">
            <UsersManager />
          </TabsContent>
          <TabsContent value="classification" className="space-y-4">
            <ClassificationGuide />
          </TabsContent>
          <TabsContent value="capacity" className="space-y-4">
            <CapacityExplainer />
          </TabsContent>
          <TabsContent value="account" className="space-y-4">
            <AccountPanel onJumpToUsers={() => setTab('users')} />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
