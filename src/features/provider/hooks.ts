'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { isReadOnlyRole } from '@/lib/roles';
import { useAsync } from '@/features/shared/useAsync';
import {
  getClinicFlags,
  getMyProviderProfile,
  getProviderHome,
  getProviderMedication,
  listProviderMedications,
  listProviders,
  type MedicationListParams,
} from './api';
import { listTopRequested } from '@/features/requests/api';
import {
  DEFAULT_FLAGS,
  type ClinicFlagsVM,
  type MedicationCardVM,
  type ProviderHomeVM,
} from './mappers';

/** Search fires once the query has 2+ characters and the user pauses 300 ms. */
export const SEARCH_MIN_CHARS = 2;
export const SEARCH_DEBOUNCE_MS = 300;

/**
 * Normalises a raw query for the provider search: trimmed, and '' when it is
 * shorter than SEARCH_MIN_CHARS (the API only accepts 2+ chars and we don't
 * want a request per keystroke on a cold free-tier backend).
 */
export function effectiveQuery(raw: string): string {
  const q = raw.trim();
  return q.length >= SEARCH_MIN_CHARS ? q : '';
}

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

/** Signed-in user's role + provider profile (from /auth/me). */
export function useProviderProfile() {
  const role = useSelector((s: RootState) => s.auth.user?.userRole);
  const isProvider = isReadOnlyRole(role);
  const loader = useCallback(() => getMyProviderProfile(), []);
  const result = useAsync(loader, { enabled: isProvider });
  return { ...result, role, isProvider };
}

/**
 * Clinic feature flags. Defaults to everything-off until loaded so the UI
 * never shows request affordances it may have to take away.
 */
export function useClinicFlags(enabled = true) {
  const loader = useCallback(() => getClinicFlags(), []);
  const result = useAsync(loader, { enabled });
  const flags: ClinicFlagsVM = result.data ?? DEFAULT_FLAGS;
  return { ...result, flags };
}

/**
 * Home feed. `/inventory/provider/home` leaves `topRequested` empty (PR #11);
 * `/transactions/requests/top` (PR #13) fills it, matched to cards by key so
 * the strip only shows what can be dispensed right now.
 */
export function useProviderHome(specialty: string | null | undefined, enabled = true) {
  const loader = useCallback(async (): Promise<ProviderHomeVM> => {
    const home = await getProviderHome(specialty ?? undefined);
    if (home.topRequested.length) return home;
    const top = await listTopRequested(30).catch(() => []);
    if (!top.length) return home;
    const byKey = new Map(home.available.map((m) => [m.key, m]));
    const missing = top.filter((t) => !byKey.has(t.medicationKey)).map((t) => t.medicationKey);
    if (missing.length) {
      const all = await listProviderMedications({ limit: 200 }).catch(() => null);
      all?.medications.forEach((m) => byKey.set(m.key, m));
    }
    const topRequested = top
      .map((t) => byKey.get(t.medicationKey))
      .filter((m): m is MedicationCardVM => !!m && m.availableUnits > 0)
      .slice(0, 6);
    return { ...home, topRequested };
  }, [specialty]);
  return useAsync(loader, { enabled });
}

export function useProviderMedications(params: MedicationListParams, enabled = true) {
  const { specialty, q, sort, limit, offset } = params;
  const loader = useCallback(
    () => listProviderMedications({ specialty, q, sort, limit, offset }),
    [specialty, q, sort, limit, offset]
  );
  return useAsync(loader, { enabled });
}

/** Detail (with nextExpiries) for the request modal; `key` null = idle. */
export function useProviderMedication(key: string | null) {
  const loader = useCallback(() => getProviderMedication(key ?? ''), [key]);
  return useAsync(loader, { enabled: !!key });
}

export function useProviders(enabled = true) {
  const loader = useCallback(() => listProviders(), []);
  return useAsync(loader, { enabled });
}
