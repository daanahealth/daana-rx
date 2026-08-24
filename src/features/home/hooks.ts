'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAsync, errorMessage } from '@/hooks/use-async';
import { insightApi, searchActiveItems } from './api';
import {
  capacityLines,
  expiringLines,
  highUseLines,
  itemToResult,
  recentCheckoutLines,
  type InsightLine,
  type ResultRow,
} from './mappers';

/**
 * MVP spec: "Debounce: trigger after a 300ms pause after the first character
 * or after 2 or more characters typed, whichever comes first."
 */
export function useDebouncedSearch(query: string, delayMs = 300): string {
  const [debounced, setDebounced] = useState(query.trim());
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (trimmed.length === 0 || trimmed.length >= 2) {
      // Empty resolves immediately; 2+ chars is the "whichever comes first" branch.
      timerRef.current = window.setTimeout(() => setDebounced(trimmed), 0);
    } else {
      timerRef.current = window.setTimeout(() => setDebounced(trimmed), delayMs);
    }
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [query, delayMs]);

  return debounced;
}

export type SearchState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'api-missing' }
  | { kind: 'success'; query: string; rows: ResultRow[] };

/** FEFO-ordered active units matching the (debounced) query. */
export function useItemSearch(query: string): SearchState {
  const [state, setState] = useState<SearchState>({ kind: 'idle' });

  useEffect(() => {
    if (!query) {
      const t = window.setTimeout(() => setState({ kind: 'idle' }), 0);
      return () => window.clearTimeout(t);
    }
    const controller = new AbortController();
    const t = window.setTimeout(() => setState({ kind: 'loading' }), 0);
    searchActiveItems(query, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        if (res.kind === 'api-missing') setState({ kind: 'api-missing' });
        else setState({ kind: 'success', query, rows: res.items.map(itemToResult) });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setState({ kind: 'error', message: errorMessage(err, 'Unknown error') });
      });
    return () => {
      window.clearTimeout(t);
      controller.abort();
    };
  }, [query]);

  return state;
}

export type InsightId = 'expiring' | 'capacity' | 'high-use' | 'recent';

export interface Insight {
  id: InsightId;
  count: number | null;
  lines: InsightLine[];
  /** Set when that one report failed; the others still render. */
  error?: string;
}

async function safe<T>(p: Promise<T>): Promise<{ data: T } | { error: string }> {
  try {
    return { data: await p };
  } catch (err) {
    return { error: errorMessage(err, 'Report unavailable') };
  }
}

/** The four "at a glance" cards, from the Reports endpoints. One failure never hides the rest. */
export function useHomeInsights() {
  const load = useCallback(async (): Promise<Insight[]> => {
    const [exp, cap, hu, rec] = await Promise.all([
      safe(insightApi.expiring()),
      safe(insightApi.capacity()),
      safe(insightApi.highUse()),
      safe(insightApi.recentlyCheckedOut()),
    ]);
    return [
      'data' in exp
        ? { id: 'expiring', count: exp.data.rows.length, lines: expiringLines(exp.data.rows) }
        : { id: 'expiring', count: null, lines: [], error: exp.error },
      'data' in cap
        ? {
            id: 'capacity',
            count: cap.data.rows.filter((r) => r.percent >= 90).length,
            lines: capacityLines(cap.data.rows),
          }
        : { id: 'capacity', count: null, lines: [], error: cap.error },
      'data' in hu
        ? { id: 'high-use', count: hu.data.rows.length, lines: highUseLines(hu.data.rows) }
        : { id: 'high-use', count: null, lines: [], error: hu.error },
      'data' in rec
        ? { id: 'recent', count: rec.data.rows.length, lines: recentCheckoutLines(rec.data.rows) }
        : { id: 'recent', count: null, lines: [], error: rec.error },
    ];
  }, []);
  return useAsync(load);
}
