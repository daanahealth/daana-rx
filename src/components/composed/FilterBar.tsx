'use client';

import * as React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

/**
 * FilterBar — one 40px row: a search input, any number of filter controls
 * (Selects, date inputs) and a trailing "Clear" when anything is active.
 * Wraps on phones. Filters live in the caller's state; this only lays out.
 *
 *   <FilterBar search={{ value: q, onChange: setQ, placeholder: 'Search medication or DRX code' }}
 *     activeCount={2} onClear={reset}>
 *     <Select …/> <Select …/>
 *   </FilterBar>
 */
export interface FilterBarProps {
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    /** Accessible name. */
    label?: string;
    autoFocus?: boolean;
  };
  /** Number of non-default filters applied; shows the Clear button when > 0. */
  activeCount?: number;
  onClear?: () => void;
  /** Right-aligned content (result count, view toggle). */
  trailing?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function FilterBar({
  search,
  activeCount = 0,
  onClear,
  trailing,
  children,
  className,
}: FilterBarProps) {
  return (
    <div role="search" className={cn('flex flex-wrap items-center gap-2', className)}>
      {search ? (
        <div className="relative min-w-[200px] flex-1 basis-full sm:basis-auto">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="text"
            inputMode="search"
            autoComplete="off"
            spellCheck={false}
            autoFocus={search.autoFocus}
            aria-label={search.label ?? 'Search'}
            placeholder={search.placeholder}
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            className="pl-9 pr-8"
          />
          {search.value ? (
            <button
              type="button"
              onClick={() => search.onChange('')}
              aria-label="Clear search"
              className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>
      ) : null}
      {children ? (
        <div className="flex flex-wrap items-center gap-2 [&>*]:min-w-[140px]">{children}</div>
      ) : null}
      {activeCount > 0 && onClear ? (
        <Button variant="ghost" size="sm" onClick={onClear} className="gap-1.5">
          <X aria-hidden /> Clear{activeCount > 1 ? ` (${activeCount})` : ''}
        </Button>
      ) : null}
      {trailing ? <div className="ml-auto text-sm text-muted-foreground">{trailing}</div> : null}
    </div>
  );
}
