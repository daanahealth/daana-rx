'use client';

// Inventory hooks — the feature-hook convention from
// docs/FRONTEND_ARCHITECTURE.md §3: each returns `{ status, data?, message?,
// refetch }`, aborts in-flight requests on change/unmount, and never leaks a
// `Response`.

import { useCallback, useEffect, useState } from 'react';
import type { Item, Location } from '@daana-health/inventory-core';
import { listItemTransactions, listItems, listLocations } from './api';
import type { InventoryRow, TransactionRow } from './mappers';

export type Async<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: T };

function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

/**
 * The inventory working set for a query string (see `toQuery`). Re-fetches
 * when the query changes; `refetch()` re-runs the same query (after a
 * mutation). Rows are kept across a refetch so the table does not flash.
 */
export function useInventoryList(query: string) {
  const [state, setState] = useState<Async<InventoryRow[]>>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal, keepRows = false) => {
      if (keepRows) setRefreshing(true);
      else setState({ status: 'loading' });
      try {
        const data = await listItems(query, signal);
        if (signal?.aborted) return;
        setState({ status: 'success', data });
      } catch (err) {
        if (!isAbort(err)) {
          const message = err instanceof Error ? err.message : 'Failed to load inventory';
          setState({ status: 'error', message });
        }
      } finally {
        if (!signal?.aborted) setRefreshing(false);
      }
    },
    [query]
  );

  useEffect(() => {
    const c = new AbortController();
    load(c.signal);
    return () => c.abort();
  }, [load]);

  const rows = state.status === 'success' ? state.data : [];
  return {
    rows,
    loading: state.status === 'loading',
    refreshing,
    error: state.status === 'error' ? state.message : null,
    refetch: () => load(undefined, true),
  };
}

/** Locations (core-schema shape) for the filter and the edit form. Loaded once. */
export function useLocations(): Location[] {
  const [locations, setLocations] = useState<Location[]>([]);
  useEffect(() => {
    const c = new AbortController();
    listLocations(c.signal)
      .then((list) => {
        if (!c.signal.aborted) setLocations(list);
      })
      .catch(() => {
        // non-fatal; the filter just collapses to no options
      });
    return () => c.abort();
  }, []);
  return locations;
}

/**
 * An item's transaction log. Loads when `enabled` and `item` are set (i.e. a
 * drawer opened), clears when they are not.
 */
export function useItemTransactions(item: Pick<Item, 'id'> | null, enabled: boolean) {
  const itemId = enabled && item ? item.id : null;
  // Results are tagged with the item they belong to; a result for a different
  // item reads as "loading" — no setState needed when the item changes.
  const [result, setResult] = useState<{ id: string; value: Async<TransactionRow[]> } | null>(null);

  useEffect(() => {
    if (!itemId) return;
    const c = new AbortController();
    listItemTransactions(itemId, c.signal)
      .then((data) => {
        if (!c.signal.aborted) setResult({ id: itemId, value: { status: 'success', data } });
      })
      .catch((err: unknown) => {
        if (isAbort(err) || c.signal.aborted) return;
        const message = err instanceof Error ? err.message : 'Failed to load history.';
        setResult({ id: itemId, value: { status: 'error', message } });
      });
    return () => c.abort();
  }, [itemId]);

  const state: Async<TransactionRow[]> =
    result && result.id === itemId ? result.value : { status: 'loading' };

  return {
    transactions: state.status === 'success' ? state.data : [],
    loading: state.status === 'loading',
    error: state.status === 'error' ? state.message : null,
  };
}
