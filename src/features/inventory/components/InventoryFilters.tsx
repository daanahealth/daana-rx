'use client';

// InventoryFilters — search + status + location + expires-before, in one
// FilterBar row. Filter state lives in the screen; this only lays out.

import type { ItemStatus, Location } from '@daana-health/inventory-core';
import { FilterBar } from '@/components/composed';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ITEM_STATUS, ITEM_STATUSES } from '@/lib/status';
import { activeFilterCount, DEFAULT_FILTERS, type InventoryFilters as Filters } from '../mappers';

interface InventoryFiltersProps {
  filters: Filters;
  onChange: (next: Filters) => void;
  locations: Location[];
  /** Right-aligned result count ("57 units"). */
  trailing?: React.ReactNode;
}

export function InventoryFilters({
  filters,
  onChange,
  locations,
  trailing,
}: InventoryFiltersProps) {
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onChange({ ...filters, [key]: value });

  return (
    <FilterBar
      search={{
        value: filters.q,
        onChange: (q) => set('q', q),
        placeholder: 'Medication, code, or notes…',
        label: 'Search inventory',
      }}
      activeCount={activeFilterCount(filters)}
      onClear={() => onChange(DEFAULT_FILTERS)}
      trailing={trailing}
    >
      <Select value={filters.status} onValueChange={(v) => set('status', v as ItemStatus | 'all')}>
        <SelectTrigger aria-label="Status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {ITEM_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {ITEM_STATUS[s].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.locationId} onValueChange={(v) => set('locationId', v)}>
        <SelectTrigger aria-label="Location">
          <SelectValue placeholder="All locations" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All locations</SelectItem>
          {locations.map((loc) => (
            <SelectItem key={loc.id} value={loc.id}>
              {loc.code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="date"
        aria-label="Expires before"
        title="Expires before"
        value={filters.expiryBefore}
        onChange={(e) => set('expiryBefore', e.target.value)}
        className="w-auto"
      />
    </FilterBar>
  );
}
