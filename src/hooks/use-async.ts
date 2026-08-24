'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * The async state shape every feature hook returns (docs/FRONTEND_ARCHITECTURE.md §3).
 * Errors are plain strings the UI can show verbatim.
 */
export type Async<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: T };

export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

/**
 * useAsync — runs `load` on mount and whenever its identity changes, aborting
 * the previous request. Pass a `useCallback`-wrapped loader.
 *
 *   const load = useCallback((signal) => listLocations(signal), []);
 *   const { status, data, refetch } = useAsync(load);
 */
export function useAsync<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<Async<T>>({ status: 'loading' });

  // Fetch without touching state first: the initial state is already
  // "loading", and refetch() flips it back explicitly before calling run().
  const run = useCallback(
    async (signal: AbortSignal) => {
      try {
        const data = await load(signal);
        if (signal.aborted) return;
        setState({ status: 'success', data });
      } catch (err) {
        if (signal.aborted) return;
        setState({ status: 'error', message: errorMessage(err) });
      }
    },
    [load]
  );

  useEffect(() => {
    const controller = new AbortController();
    // Kick off in a microtask: the effect itself only subscribes/aborts;
    // state updates happen when the request settles.
    queueMicrotask(() => void run(controller.signal));
    return () => controller.abort();
  }, [run]);

  const refetch = useCallback(() => {
    setState({ status: 'loading' });
    return run(new AbortController().signal);
  }, [run]);

  return {
    ...state,
    loading: state.status === 'loading',
    error: state.status === 'error' ? state.message : null,
    data: state.status === 'success' ? state.data : undefined,
    refetch,
  };
}
