'use client';

import * as React from 'react';
import { useSelector } from 'react-redux';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/composed';
import type { RootState } from '@/store';
import { isReadOnlyRole } from '@/lib/roles';
import { ProviderHome } from './ProviderHome';
import { SearchBox } from './components/SearchBox';
import { InsightCards } from './components/InsightCards';
import { SearchResults } from './components/SearchResults';
import { useDebouncedSearch, useHomeInsights, useItemSearch } from './hooks';
import { friendlyFirstName } from './mappers';

/**
 * Home for superadmins / employees: search first, "at a glance" cards until
 * the first keystroke, FEFO results in a table after it.
 */
export function HomeScreen() {
  const user = useSelector((state: RootState) => state.auth.user);
  if (isReadOnlyRole(user?.userRole)) return <ProviderHome />;
  return <VolunteerHome name={friendlyFirstName(user?.username ?? user?.email)} />;
}

function VolunteerHome({ name }: { name: string }) {
  const [query, setQuery] = React.useState('');
  const debounced = useDebouncedSearch(query, 300);
  const results = useItemSearch(debounced);
  const insights = useHomeInsights();
  const searching = query.trim().length > 0;

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <PageHeader
          title={`What medication are you looking for, ${name || 'there'}?`}
          description="Active units only, earliest expiry first."
          className="mb-0 sm:mb-0"
        />
        <SearchBox query={query} onChange={setQuery} />
        {searching ? (
          <SearchResults state={results} />
        ) : (
          <InsightCards insights={insights.data} loading={insights.loading} />
        )}
      </div>
    </AppShell>
  );
}
