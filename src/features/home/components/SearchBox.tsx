'use client';

import * as React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SearchBoxProps {
  query: string;
  onChange: (value: string) => void;
}

/**
 * The home search: one 44px input, auto-focused on mount (spec), clear button
 * when there is text. Results render below it in a DataTable.
 */
export function SearchBox({ query, onChange }: SearchBoxProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div role="search" className="relative w-full">
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        ref={inputRef}
        type="text"
        inputMode="search"
        autoComplete="off"
        spellCheck={false}
        value={query}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by medication name, dosage, or DRX code"
        aria-label="Search medications"
        className="h-11 pl-11 pr-11 text-base"
      />
      {query ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
