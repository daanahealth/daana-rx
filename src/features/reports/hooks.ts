'use client';

/**
 * Reports hooks — the feature-hook convention from FRONTEND_ARCHITECTURE §3:
 * hand-rolled async state over `api.ts`, no query library. Each hook owns one
 * endpoint; the screen composes them so every report is fetched once and the
 * dashboard cards read from the same data as the panels.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { reportsApi, type ExpiryWindow, type LegacyTransactionQuery } from './api';
import {
  mapCapacity,
  mapExpiring,
  mapHighUse,
  mapInventoryEdits,
  mapLegacyTransaction,
  mapRecentlyRemoved,
  mapTransactionPage,
  mapUserDirectory,
  resolveActorId,
  type CapacityRow,
  type ExpiringRow,
  type HighUseRow,
  type InventoryEditRow,
  type LegacyTransactionRow,
  type RecentlyRemovedRow,
  type TransactionRow,
  type UserDirectory,
} from './mappers';

export type Async<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: T };

export interface AsyncResult<T> {
  state: Async<T>;
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

/**
 * Generic loader. `load` is re-run whenever `deps` change; a stale response
 * (deps changed or unmounted before it resolved) is dropped.
 */
export function useAsync<T>(
  load: () => Promise<T>,
  deps: readonly unknown[],
  fallback = 'Something went wrong'
): AsyncResult<T> {
  const [state, setState] = useState<Async<T>>({ status: 'loading' });
  const [tick, setTick] = useState(0);
  const run = useRef(0);

  useEffect(() => {
    const id = ++run.current;
    setState({ status: 'loading' });
    load()
      .then((data) => {
        if (run.current === id) setState({ status: 'success', data });
      })
      .catch((err: unknown) => {
        if (run.current === id) setState({ status: 'error', message: errorMessage(err, fallback) });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are the caller's cache key
  }, [...deps, tick]);

  return {
    state,
    data: state.status === 'success' ? state.data : null,
    loading: state.status === 'loading',
    error: state.status === 'error' ? state.message : null,
    refetch: () => setTick((t) => t + 1),
  };
}

// ---------------------------------------------------------------------------
// Report panels
// ---------------------------------------------------------------------------

export function useExpiring(window: ExpiryWindow): AsyncResult<ExpiringRow[]> {
  return useAsync(
    () => reportsApi.expiring(window).then(mapExpiring),
    [window],
    'Failed to load expiring report'
  );
}

export function useCapacity(): AsyncResult<CapacityRow[]> {
  return useAsync(() => reportsApi.capacity().then(mapCapacity), [], 'Failed to load capacity');
}

export function useHighUse(): AsyncResult<HighUseRow[]> {
  return useAsync(
    () => reportsApi.highUse().then(mapHighUse),
    [],
    'Failed to load high-use report'
  );
}

export function useRecentlyRemoved(): AsyncResult<RecentlyRemovedRow[]> {
  return useAsync(
    () => reportsApi.recentlyRemoved().then(mapRecentlyRemoved),
    [],
    'Failed to load recently removed'
  );
}

export function useInventoryEdits(): AsyncResult<InventoryEditRow[]> {
  return useAsync(
    () => reportsApi.inventoryEdits().then(mapInventoryEdits),
    [],
    'Failed to load inventory edits'
  );
}

/**
 * Clinic user directory for naming actors. The endpoint is admin-only; any
 * failure (403 for employees, paused backend) yields an empty directory and
 * the log falls back to the raw actor value.
 */
export function useUserDirectory(): UserDirectory {
  const [directory, setDirectory] = useState<UserDirectory>({});
  useEffect(() => {
    let cancelled = false;
    reportsApi
      .users()
      .then((payload) => {
        if (!cancelled) setDirectory(mapUserDirectory(payload));
      })
      .catch(() => {
        /* no directory — actors render from the payload */
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return directory;
}

// ---------------------------------------------------------------------------
// Transaction log (cursor paginated)
// ---------------------------------------------------------------------------

export interface TransactionLogFilters {
  dateFrom: string;
  dateTo: string;
  /** '' = all. */
  actionType: string;
  actor: string;
  q: string;
}

export const EMPTY_LOG_FILTERS: TransactionLogFilters = {
  dateFrom: '',
  dateTo: '',
  actionType: '',
  actor: '',
  q: '',
};

export function activeLogFilterCount(f: TransactionLogFilters): number {
  return [f.dateFrom, f.dateTo, f.actionType, f.actor, f.q].filter(Boolean).length;
}

const PAGE_LIMIT = 50;
const DEBOUNCE_MS = 300;

/** Debounce free-text inputs so the log is not refetched on every keystroke. */
export function useDebounced<T>(value: T, ms = DEBOUNCE_MS): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export interface TransactionLogResult {
  rows: TransactionRow[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => void;
}

export function useTransactionLog(
  filters: TransactionLogFilters,
  directory: UserDirectory
): TransactionLogResult {
  const q = useDebounced(filters.q);
  const actor = useDebounced(filters.actor);
  const { dateFrom, dateTo, actionType } = filters;

  const query = useCallback(
    (cursor?: string) =>
      reportsApi.transactionLog({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        actionTypes: actionType ? [actionType] : undefined,
        actor: actor || undefined,
        actorId: actor ? resolveActorId(actor, directory) : undefined,
        q: q || undefined,
        cursor,
        limit: PAGE_LIMIT,
      }),
    [dateFrom, dateTo, actionType, actor, q, directory]
  );

  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const run = useRef(0);

  useEffect(() => {
    const id = ++run.current;
    setLoading(true);
    setError(null);
    query()
      .then((payload) => {
        if (run.current !== id) return;
        const page = mapTransactionPage(payload);
        setRows(page.rows);
        setCursor(page.nextCursor);
      })
      .catch((err: unknown) => {
        if (run.current !== id) return;
        setError(errorMessage(err, 'Failed to load transactions'));
        setRows([]);
        setCursor(null);
      })
      .finally(() => {
        if (run.current === id) setLoading(false);
      });
  }, [query, tick]);

  const loadMore = useCallback(() => {
    if (!cursor || loadingMore) return;
    const id = run.current;
    setLoadingMore(true);
    query(cursor)
      .then((payload) => {
        if (run.current !== id) return;
        const page = mapTransactionPage(payload);
        setRows((prev) => [...prev, ...page.rows]);
        setCursor(page.nextCursor);
      })
      .catch((err: unknown) => {
        if (run.current === id) setError(errorMessage(err, 'Failed to load more transactions'));
      })
      .finally(() => {
        if (run.current === id) setLoadingMore(false);
      });
  }, [cursor, loadingMore, query]);

  return {
    rows,
    loading,
    loadingMore,
    error,
    hasMore: Boolean(cursor),
    loadMore,
    refetch: () => setTick((t) => t + 1),
  };
}

// ---------------------------------------------------------------------------
// Legacy activity log (/logs — page numbered)
// ---------------------------------------------------------------------------

export interface LegacyLogPage {
  rows: LegacyTransactionRow[];
  total: number;
}

export function useLegacyTransactions(params: LegacyTransactionQuery): AsyncResult<LegacyLogPage> {
  const medicationName = useDebounced(params.medicationName ?? '');
  const { page, pageSize, type, startDate, endDate } = params;
  return useAsync(
    () =>
      reportsApi
        .legacyTransactions({
          page,
          pageSize,
          type: type || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          medicationName: medicationName || undefined,
        })
        .then((res) => ({
          rows: (res.transactions ?? []).map(mapLegacyTransaction),
          total: Number(res.total) || 0,
        })),
    [page, pageSize, type, startDate, endDate, medicationName],
    'Failed to load activity logs'
  );
}
