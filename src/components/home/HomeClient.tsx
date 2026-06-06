'use client';

import * as React from 'react';
import { useSelector } from 'react-redux';
import { AppShell } from '@/components/layout/AppShell';
import { SearchHero } from './SearchHero';
import { InsightCards } from './InsightCards';
import { ResultsList, type ResultsState } from './ResultsList';
import { useDebouncedSearch } from './useDebouncedSearch';
import type { RootState } from '@/store';
import type { Item } from '@daana-health/inventory-core';
import { cn } from '@/lib/utils';

/**
 * MVP Home page — feels like Claude.ai but in Daana teal with the liquid glass
 * treatment. Center the search; insight cards visible until first keystroke;
 * FEFO-sorted results from /api/items?q=…&status=active appear below.
 */
export function HomeClient() {
  const user = useSelector((state: RootState) => state.auth.user);

  // The User type uses `username` not firstName. Heuristic: derive a friendly
  // first name from username (split on ., _, -, @) for the greeting.
  const firstName = React.useMemo(() => {
    const raw = user?.username ?? user?.email ?? '';
    if (!raw) return '';
    const head = raw.split(/[._@\s-]/)[0];
    if (!head) return '';
    return head.charAt(0).toUpperCase() + head.slice(1);
  }, [user?.username, user?.email]);

  const [query, setQuery] = React.useState('');
  const debouncedQuery = useDebouncedSearch(query, 300);

  const hasInteracted = query.trim().length > 0;

  const [results, setResults] = React.useState<ResultsState>({ kind: 'idle' });

  React.useEffect(() => {
    if (!debouncedQuery) {
      setResults({ kind: 'idle' });
      return;
    }

    const controller = new AbortController();
    setResults({ kind: 'loading' });

    const url = `/api/items?q=${encodeURIComponent(debouncedQuery)}&status=active`;

    fetch(url, { signal: controller.signal, cache: 'no-store' })
      .then(async (res) => {
        if (res.status === 404) {
          setResults({ kind: 'api-missing' });
          return;
        }
        if (!res.ok) {
          throw new Error(`Items API returned ${res.status}`);
        }
        const body: unknown = await res.json();
        let items: ReadonlyArray<Item> = [];
        if (Array.isArray(body)) {
          items = body as ReadonlyArray<Item>;
        } else if (body && typeof body === 'object' && 'items' in body) {
          const maybe = (body as { items?: unknown }).items;
          if (Array.isArray(maybe)) items = maybe as ReadonlyArray<Item>;
        }
        // Backend returns FEFO-sorted; do not re-sort.
        setResults({ kind: 'success', query: debouncedQuery, items });
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        const message = err instanceof Error ? err.message : 'Unknown error';
        setResults({ kind: 'error', message });
      });

    return () => controller.abort();
  }, [debouncedQuery]);

  return (
    <AppShell>
      <div className="flex flex-col gap-8 sm:gap-10 pb-12">
        <SearchHero
          firstName={firstName}
          query={query}
          onChange={setQuery}
          collapsed={hasInteracted}
        />

        {/* Insight cards (before-typing focal area) */}
        {!hasInteracted && (
          <InsightCards hidden={false} />
        )}

        {/* Results region (after-typing focal area) */}
        <div
          className={cn(
            'transition-opacity duration-300',
            hasInteracted ? 'opacity-100' : 'opacity-0 pointer-events-none h-0 overflow-hidden',
          )}
        >
          {hasInteracted && <ResultsList state={results} />}
        </div>
      </div>
    </AppShell>
  );
}
