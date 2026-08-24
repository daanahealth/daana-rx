'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The async shape every feature hook returns (docs/FRONTEND_ARCHITECTURE.md §3).
 *
 *   const { status, data, error, refetch, refreshing } = useAsync(loader, { pollMs: 15_000 });
 *
 * - `loader` must be a stable function (wrap in useCallback); it re-runs when
 *   its identity changes and the previous request is aborted.
 * - `data` is kept while a refetch/poll is in flight so lists never flicker;
 *   `refreshing` tells the UI a background refresh is running.
 * - `enabled: false` skips fetching and reports `idle`.
 * - `pollMs` re-runs the loader on an interval (paused while the tab is hidden).
 */
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  status: AsyncStatus;
  data: T | null;
  error: string | null;
  refreshing: boolean;
}

export interface UseAsyncOptions {
  enabled?: boolean;
  pollMs?: number | null;
}

export interface UseAsyncResult<T> extends AsyncState<T> {
  refetch: () => Promise<void>;
  /** Replace the cached data locally (optimistic updates). */
  setData: (updater: (prev: T | null) => T | null) => void;
}

export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string' && err) return err;
  return fallback;
}

export function useAsync<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  { enabled = true, pollMs = null }: UseAsyncOptions = {}
): UseAsyncResult<T> {
  const [state, setState] = useState<AsyncState<T>>({
    status: enabled ? 'loading' : 'idle',
    data: null,
    error: null,
    refreshing: false,
  });
  const controllerRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);

  const load = useCallback(
    async (background: boolean) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      const seq = ++seqRef.current;
      setState((prev) =>
        background && prev.data !== null
          ? { ...prev, refreshing: true }
          : { status: 'loading', data: prev.data, error: null, refreshing: false }
      );
      try {
        const data = await loader(controller.signal);
        if (seq !== seqRef.current || controller.signal.aborted) return;
        setState({ status: 'success', data, error: null, refreshing: false });
      } catch (err) {
        if (seq !== seqRef.current || controller.signal.aborted) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setState((prev) => ({
          status: 'error',
          data: prev.data,
          error: errorMessage(err),
          refreshing: false,
        }));
      }
    },
    [loader]
  );

  useEffect(() => {
    if (!enabled) return;
    // Defer the first setState out of the effect body (react-hooks/set-state-in-effect).
    const id = window.setTimeout(() => load(false), 0);
    return () => {
      window.clearTimeout(id);
      controllerRef.current?.abort();
    };
  }, [enabled, load]);

  useEffect(() => {
    if (!enabled || !pollMs) return;
    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      load(true);
    };
    const id = window.setInterval(tick, pollMs);
    return () => window.clearInterval(id);
  }, [enabled, pollMs, load]);

  const refetch = useCallback(() => load(true), [load]);
  const setData = useCallback((updater: (prev: T | null) => T | null) => {
    setState((prev) => ({ ...prev, data: updater(prev.data) }));
  }, []);

  if (!enabled) {
    return { status: 'idle', data: null, error: null, refreshing: false, refetch, setData };
  }
  return { ...state, refetch, setData };
}
