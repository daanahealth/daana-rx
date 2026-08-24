'use client';

import { useCallback, useState } from 'react';
import { useAsync } from '@/hooks/use-async';
import { classificationApi, locationsApi, usersApi, type ApiResult } from './api';
import {
  loadClassificationOverrides,
  normaliseLocation,
  normaliseUser,
  saveClassificationLocal,
  type LocationRow,
  type MutableClassificationEntry,
  type UserRow,
} from './mappers';

/** A list plus whether its backend endpoint is live. */
export interface PendingList<T> {
  rows: T[];
  endpointPending: boolean;
}

function fromResult<T>(r: ApiResult<unknown[]>, map: (raw: unknown) => T): PendingList<T> {
  if (r.kind === 'pending') return { rows: [], endpointPending: true };
  return { rows: r.data.map(map), endpointPending: false };
}

export function useLocations() {
  const load = useCallback(async (signal: AbortSignal): Promise<PendingList<LocationRow>> => {
    try {
      return fromResult(await locationsApi.list(signal), normaliseLocation);
    } catch (err) {
      if (signal.aborted) throw err;
      // Network error: show the panel with a pending notice rather than a blocking error.
      return { rows: [], endpointPending: true };
    }
  }, []);
  return useAsync(load);
}

export function useUsers() {
  const load = useCallback(async (signal: AbortSignal): Promise<PendingList<UserRow>> => {
    try {
      return fromResult(await usersApi.list(signal), normaliseUser);
    } catch (err) {
      if (signal.aborted) throw err;
      return { rows: [], endpointPending: true };
    }
  }, []);
  return useAsync(load);
}

/**
 * Classification guide with the local-persistence fallback: when the backend
 * endpoint is pending (404 / network), rows come from localStorage and every
 * save goes there too. `persist` returns where the save landed.
 */
export function useClassification() {
  const [localFallback, setLocalFallback] = useState(false);

  const load = useCallback(async (signal: AbortSignal): Promise<MutableClassificationEntry[]> => {
    try {
      const r = await classificationApi.list(signal);
      if (r.kind === 'pending') {
        setLocalFallback(true);
        return loadClassificationOverrides();
      }
      setLocalFallback(false);
      return r.data as MutableClassificationEntry[];
    } catch (err) {
      if (signal.aborted) throw err;
      setLocalFallback(true);
      return loadClassificationOverrides();
    }
  }, []);

  const list = useAsync(load);
  const [override, setOverride] = useState<MutableClassificationEntry[] | null>(null);
  const rows = override ?? list.data ?? [];

  const persist = useCallback(
    async (next: MutableClassificationEntry[]): Promise<'server' | 'local' | 'local-error'> => {
      setOverride(next);
      if (localFallback) {
        saveClassificationLocal(next);
        return 'local';
      }
      try {
        const r = await classificationApi.save(next);
        if (r.kind === 'pending') {
          setLocalFallback(true);
          saveClassificationLocal(next);
          return 'local';
        }
        return 'server';
      } catch {
        // Soft failure: keep a local copy so the superadmin does not lose work.
        saveClassificationLocal(next);
        return 'local-error';
      }
    },
    [localFallback]
  );

  return { ...list, rows, localFallback, persist };
}
