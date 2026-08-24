'use client';

import * as React from 'react';
import type { PlatformItemDTO } from '@/features/cart/mappers';
import { searchItems } from './api';
import { searchDelayFor, searchStatusFor } from './mappers';

export interface MedicationSearch {
  readonly results: readonly PlatformItemDTO[];
  readonly searching: boolean;
  readonly error: string | null;
  /** True when a non-empty query returned nothing. */
  readonly empty: boolean;
}

/**
 * FEFO medication search with the spec's debounce (300ms pause OR >=2 chars,
 * whichever fires first). In-flight requests are aborted when the query
 * changes so stale responses never overwrite fresh ones.
 */
export function useMedicationSearch(query: string, isSuperadmin: boolean): MedicationSearch {
  const [results, setResults] = React.useState<readonly PlatformItemDTO[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const q = query.trim();
    if (q.length === 0) {
      setResults([]);
      setSearching(false);
      setError(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      setError(null);
      try {
        const items = await searchItems(
          { q, status: searchStatusFor(isSuperadmin), limit: 50 },
          controller.signal
        );
        if (controller.signal.aborted) return;
        setResults(items);
      } catch (err) {
        if (controller.signal.aborted) return;
        setResults([]);
        setError(err instanceof Error ? err.message : 'Search failed');
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, searchDelayFor(q));
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, isSuperadmin]);

  return {
    results,
    searching,
    error,
    empty: query.trim().length > 0 && !searching && results.length === 0 && !error,
  };
}
