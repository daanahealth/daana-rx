'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, FilterBar, DataTable, DateText, type Column } from '@/components/composed';
import { formatCount, pluralize } from '@/lib/format';
import { RequestDrawer } from './components/RequestDrawer';
import {
  effectiveQuery,
  useClinicFlags,
  useDebouncedValue,
  useProviderMedications,
  useProviderProfile,
  SEARCH_DEBOUNCE_MS,
} from './hooks';
import { doseForm, specialtyLabel, type MedicationCardVM } from './mappers';

/**
 * ProviderInventoryScreen — the read-only, medication-level inventory for
 * providers: name, dose, form, available, earliest expiry. The API already
 * strips location / bin / DRX code / item id; this screen has no place to
 * show them and no row action other than Request.
 */
type Scope = 'mine' | 'all';

export function ProviderInventoryScreen() {
  const profile = useProviderProfile();
  const mySpecialty = profile.data?.specialty ?? null;
  const { flags } = useClinicFlags();
  const requestsOn = flags.providerRequestsEnabled;

  const [query, setQuery] = React.useState('');
  const [scope, setScope] = React.useState<Scope>('mine');
  const debounced = useDebouncedValue(effectiveQuery(query), SEARCH_DEBOUNCE_MS);
  const specialty = scope === 'mine' ? mySpecialty : null;

  const list = useProviderMedications(
    { specialty, q: debounced, sort: 'name', limit: 200 },
    profile.status !== 'loading'
  );

  const [selected, setSelected] = React.useState<MedicationCardVM | null>(null);

  const columns = React.useMemo<Column<MedicationCardVM>[]>(
    () => [
      {
        key: 'name',
        header: 'Medication',
        primary: true,
        cell: (m) => m.medicationName,
        sortValue: (m) => m.medicationName,
      },
      {
        key: 'dose',
        header: 'Dose · form',
        secondary: true,
        cell: (m) => doseForm(m) || '—',
        sortValue: (m) => m.dose ?? '',
      },
      {
        key: 'specialty',
        header: 'Specialty',
        cell: (m) => specialtyLabel(m.specialtyClass) || '—',
        sortValue: (m) => m.specialtyClass ?? '',
        hideOnMobile: scope === 'mine',
      },
      {
        key: 'available',
        header: 'Available',
        kind: 'number',
        cell: (m) =>
          m.availableUnits <= 0 ? (
            <span className="text-quiet">None</span>
          ) : m.availableQuantity !== m.availableUnits ? (
            `${pluralize(m.availableUnits, 'unit')} · ${m.availableQuantity} qty`
          ) : (
            pluralize(m.availableUnits, 'unit')
          ),
        sortValue: (m) => m.availableUnits,
      },
      {
        key: 'expiry',
        header: 'Earliest expiry',
        kind: 'date',
        cell: (m) =>
          m.earliestExpiry ? (
            <DateText value={m.earliestExpiry} expiry />
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
        sortValue: (m) => m.earliestExpiry ?? undefined,
      },
    ],
    [scope]
  );

  const rows = list.data?.medications ?? [];
  const activeFilters = (scope === 'all' ? 1 : 0) + (query ? 1 : 0);

  return (
    <AppShell>
      <PageHeader
        title="Inventory"
        description="What can be dispensed right now, by medication. Expired, reserved and empty units are never listed."
      />

      <FilterBar
        className="mb-4"
        search={{
          value: query,
          onChange: setQuery,
          placeholder: 'Search medication name or dose',
          label: 'Search medications',
        }}
        activeCount={activeFilters}
        onClear={() => {
          setQuery('');
          setScope('mine');
        }}
        trailing={list.data ? `${formatCount(list.data.total)} medications` : undefined}
      >
        {mySpecialty ? (
          <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
            <SelectTrigger aria-label="Specialty scope">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mine">{specialtyLabel(mySpecialty)} only</SelectItem>
              <SelectItem value="all">All specialties</SelectItem>
            </SelectContent>
          </Select>
        ) : null}
      </FilterBar>

      <DataTable<MedicationCardVM>
        columns={columns}
        rows={rows}
        rowKey={(m) => m.key}
        loading={list.status === 'loading' || profile.status === 'loading'}
        error={list.error}
        onRetry={list.refetch}
        defaultSort={{ key: 'name', dir: 'asc' }}
        caption="Medications dispensable right now"
        onRowClick={requestsOn ? (m) => m.availableUnits > 0 && setSelected(m) : undefined}
        rowActions={
          requestsOn
            ? (m) => (
                <Button
                  size="sm"
                  variant={m.availableUnits > 0 ? 'default' : 'outline'}
                  disabled={m.availableUnits <= 0}
                  onClick={() => setSelected(m)}
                >
                  {m.availableUnits > 0 ? 'Request' : 'None available'}
                </Button>
              )
            : undefined
        }
        empty={{
          title: debounced
            ? `No medications match “${debounced}”`
            : scope === 'mine' && mySpecialty
              ? `Nothing dispensable in ${specialtyLabel(mySpecialty)} right now`
              : 'Nothing dispensable right now',
          description: debounced
            ? 'Try a generic name or a shorter spelling.'
            : 'Switch to all specialties — another bin may stock it.',
          action:
            !debounced && scope === 'mine' && mySpecialty ? (
              <Button variant="outline" size="sm" onClick={() => setScope('all')}>
                Show all specialties
              </Button>
            ) : undefined,
        }}
      />

      <RequestDrawer
        medication={selected}
        flags={flags}
        onOpenChange={(open) => !open && setSelected(null)}
        onSubmitted={() => list.refetch()}
      />
    </AppShell>
  );
}
