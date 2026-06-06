'use client';

import Link from 'next/link';
import { Loader2, AlertTriangle, PackageCheck } from 'lucide-react';
import { ResultCard } from './ResultCard';
import { cn } from '@/lib/utils';
import type { Item } from '@daana-health/inventory-core';

export type ResultsState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'api-missing' }
  | { kind: 'success'; query: string; items: ReadonlyArray<Item> };

interface ResultsListProps {
  state: ResultsState;
}

export function ResultsList({ state }: ResultsListProps) {
  return (
    <div className="w-full max-w-3xl mx-auto">
      {state.kind === 'loading' && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="text-sm">Searching inventory…</span>
        </div>
      )}

      {state.kind === 'api-missing' && (
        <div className={cn(
          'rounded-xl border border-warning/40 bg-warning/5 backdrop-blur-md',
          'p-4 sm:p-5 text-sm flex items-start gap-3',
        )}>
          <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" aria-hidden />
          <div>
            <p className="font-medium">Connect inventory API</p>
            <p className="text-muted-foreground mt-1">
              The items API endpoint is not yet available. Once the backend is wired up,
              search results will appear here.
            </p>
          </div>
        </div>
      )}

      {state.kind === 'error' && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 sm:p-5 text-sm">
          <p className="font-medium text-destructive">Something went wrong</p>
          <p className="text-muted-foreground mt-1">{state.message}</p>
        </div>
      )}

      {state.kind === 'success' && state.items.length === 0 && (
        <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-md p-6 text-center">
          <p className="text-base text-foreground">
            No medications found matching{' '}
            <span className="font-semibold">&ldquo;{state.query}&rdquo;</span>.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Check spelling or contact a superadmin.
          </p>
        </div>
      )}

      {state.kind === 'success' && state.items.length > 0 && (
        <>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3 px-1">
            {state.items.length} {state.items.length === 1 ? 'result' : 'results'} • Sorted FEFO
          </p>
          <ul className="space-y-3 sm:space-y-4">
            {state.items.map((item) => (
              <li key={item.id}>
                <ResultCard item={item} />
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Additional home page action per spec */}
      {(state.kind === 'success' || state.kind === 'api-missing') && (
        <div className="mt-6 text-center">
          <Link
            href="/checkin"
            className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <PackageCheck className="h-4 w-4" />
            Checking in medications? Click here.
          </Link>
        </div>
      )}
    </div>
  );
}
