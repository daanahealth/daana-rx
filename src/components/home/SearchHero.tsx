'use client';

import * as React from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchHeroProps {
  firstName: string | null | undefined;
  query: string;
  onChange: (value: string) => void;
  collapsed: boolean;
}

/**
 * Centered search hero modeled on Claude.ai but in Daana teal with the
 * "liquid glass" treatment. Sits vertically centered until the user starts
 * typing, then collapses upward so results take focal priority.
 */
export function SearchHero({ firstName, query, onChange, collapsed }: SearchHeroProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  // Auto-focus on mount per spec.
  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const greetingName = firstName?.trim() || 'there';

  return (
    <section
      className={cn(
        'flex w-full flex-col items-center transition-all duration-500 ease-out',
        collapsed ? 'pt-2 sm:pt-4' : 'pt-12 sm:pt-24 lg:pt-32',
      )}
    >
      <h1
        className={cn(
          'text-balance text-center font-semibold tracking-tight text-foreground',
          'transition-all duration-500 ease-out',
          collapsed
            ? 'text-xl sm:text-2xl mb-4 opacity-80'
            : 'text-3xl sm:text-4xl lg:text-5xl mb-8 sm:mb-10',
        )}
      >
        What medication are you looking for today, {greetingName}?
      </h1>

      <div
        className={cn(
          'relative w-full max-w-2xl',
          // Liquid glass treatment
          'rounded-xl border border-border/60',
          'bg-white/70 dark:bg-card/60 backdrop-blur-xl',
          'shadow-soft hover:shadow-md focus-within:shadow-md',
          'transition-all duration-300',
          'focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20',
        )}
      >
        <Search
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="search"
          inputMode="search"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search by medication name, dosage, or DRX code"
          aria-label="Search medications"
          className={cn(
            'w-full bg-transparent rounded-xl',
            'pl-12 pr-4 py-4 sm:py-5',
            'text-base sm:text-lg',
            'placeholder:text-muted-foreground/70 placeholder:font-normal',
            'focus:outline-none',
          )}
        />
      </div>
    </section>
  );
}
