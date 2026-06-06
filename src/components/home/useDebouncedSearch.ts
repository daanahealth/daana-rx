'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * MVP spec: "Debounce: trigger after a 300ms pause after the first character
 * or after 2 or more characters typed, whichever comes first."
 *
 * Behavior:
 *  - Empty query resolves to '' immediately.
 *  - Single character: wait 300ms after the keystroke, then fire.
 *  - 2+ characters: fire immediately (the "whichever comes first" branch).
 *  - When characters are removed back to 1, return to debounce behavior.
 */
export function useDebouncedSearch(query: string, delayMs = 300): string {
  const [debounced, setDebounced] = useState(query);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const trimmed = query.trim();

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (trimmed.length === 0) {
      setDebounced('');
      return;
    }

    if (trimmed.length >= 2) {
      // Whichever comes first: 2+ chars wins → fire immediately.
      setDebounced(trimmed);
      return;
    }

    // Exactly 1 character: wait for the 300ms pause.
    timerRef.current = window.setTimeout(() => {
      setDebounced(trimmed);
      timerRef.current = null;
    }, delayMs);

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [query, delayMs]);

  return debounced;
}
