'use client';

import * as React from 'react';
import Link from 'next/link';
import { Lock, PackageSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, FilterBar } from '@/components/composed';
import { formatCount } from '@/lib/format';
import { MedicationGrid } from './components/MedicationGrid';
import { RequestDrawer } from './components/RequestDrawer';
import {
  effectiveQuery,
  useClinicFlags,
  useDebouncedValue,
  useProviderHome,
  useProviderMedications,
  useProviderProfile,
  SEARCH_DEBOUNCE_MS,
} from './hooks';
import { providerDisplayName, specialtyLabel, type MedicationCardVM } from './mappers';

/**
 * ProviderHomeScreen — specialty-first home for the provider role.
 * Header "Karol Patel, NP · Cardiology", a pinned search, "Available in your
 * specialty" sorted by quantity, and a "Top requested" strip when present.
 * Find + request in under 30 s on a phone is the bar (spec success criterion).
 */
export function ProviderHomeScreen() {
  const profile = useProviderProfile();
  const specialty = profile.data?.specialty ?? null;
  const { flags, status: flagsStatus } = useClinicFlags();
  const requestsOn = flags.providerRequestsEnabled;

  const [query, setQuery] = React.useState('');
  const debounced = useDebouncedValue(effectiveQuery(query), SEARCH_DEBOUNCE_MS);
  const searching = debounced.length > 0;

  // Home feed waits for the profile so the first paint is already the
  // provider's specialty, not a flash of everything.
  const home = useProviderHome(specialty, profile.status !== 'loading');
  const results = useProviderMedications({ q: debounced, sort: 'quantity', limit: 100 }, searching);

  const [selected, setSelected] = React.useState<MedicationCardVM | null>(null);
  const onRequest = requestsOn ? (m: MedicationCardVM) => setSelected(m) : undefined;
  const afterSubmit = () => {
    home.refetch();
    if (searching) results.refetch();
  };

  const name = profile.data ? providerDisplayName(profile.data) : null;
  const specialtyName = specialtyLabel(specialty) || 'Your specialty';

  return (
    <AppShell>
      <PageHeader
        title={name ?? 'Home'}
        meta={
          specialty ? (
            <span className="text-base text-muted-foreground">· {specialtyName}</span>
          ) : null
        }
        description={
          requestsOn
            ? 'Tap a medication to request a dispense. Only what can be dispensed right now is shown.'
            : 'Only what can be dispensed right now is shown.'
        }
      />

      {flagsStatus === 'success' && !requestsOn ? (
        <div
          role="status"
          className="mb-4 flex items-start gap-2 rounded-sm border border-border bg-panel px-3 py-2 text-sm text-subtle-foreground"
        >
          <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            Dispense requests are turned off for this clinic. You can browse availability; ask the
            front desk to dispense.
          </span>
        </div>
      ) : null}

      <div className="sticky top-0 z-20 -mx-4 mb-5 bg-background px-4 py-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <FilterBar
          search={{
            value: query,
            onChange: setQuery,
            placeholder: 'Search medication name or dose',
            label: 'Search medications',
          }}
          trailing={
            searching && results.data ? `${formatCount(results.data.total)} found` : undefined
          }
        />
        {query.trim().length === 1 ? (
          <p className="mt-1 text-xs text-muted-foreground">Type one more character to search.</p>
        ) : null}
      </div>

      {searching ? (
        <section aria-labelledby="results-heading" className="space-y-3">
          <h2 id="results-heading" className="text-base font-semibold text-foreground">
            Results for &ldquo;{debounced}&rdquo;
          </h2>
          <MedicationGrid
            medications={results.data?.medications ?? null}
            loading={results.status === 'loading' || results.refreshing}
            error={results.error}
            onRetry={results.refetch}
            onRequest={onRequest}
            empty={{
              title: `No medications match “${debounced}”`,
              description: 'Try a generic name or a shorter spelling.',
            }}
          />
        </section>
      ) : (
        <div className="space-y-8">
          {home.data?.topRequested.length ? (
            <section aria-labelledby="top-heading" className="space-y-3">
              <h2 id="top-heading" className="text-base font-semibold text-foreground">
                Top requested
              </h2>
              <MedicationGrid
                layout="strip"
                medications={home.data.topRequested}
                onRequest={onRequest}
                empty={{ title: 'Nothing requested yet' }}
              />
            </section>
          ) : null}

          <section aria-labelledby="available-heading" className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="available-heading" className="text-base font-semibold text-foreground">
                Available in {specialty ? specialtyName : 'your clinic'}
              </h2>
              {home.data ? (
                <span className="text-sm tabular-nums text-muted-foreground">
                  {formatCount(home.data.available.length)}
                </span>
              ) : null}
            </div>
            <MedicationGrid
              medications={home.data?.available ?? null}
              loading={home.status === 'loading' || profile.status === 'loading'}
              error={home.error}
              onRetry={home.refetch}
              onRequest={onRequest}
              empty={{
                title: specialty
                  ? `Nothing dispensable in ${specialtyName} right now`
                  : 'Nothing dispensable right now',
                description: 'Search the full inventory — another specialty may stock it.',
                action: (
                  <Button asChild variant="outline" size="sm">
                    <Link href="/inventory">
                      <PackageSearch aria-hidden /> Browse all medications
                    </Link>
                  </Button>
                ),
              }}
            />
          </section>
        </div>
      )}

      <RequestDrawer
        medication={selected}
        flags={flags}
        onOpenChange={(open) => !open && setSelected(null)}
        onSubmitted={afterSubmit}
      />
    </AppShell>
  );
}
