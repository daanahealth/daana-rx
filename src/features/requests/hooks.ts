'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAsync } from '@/features/shared/useAsync';
import { getPendingCount, listMyRequests, listQueue } from './api';
import { hasPending, ttlCountdown, type Countdown } from './mappers';

/** My Requests polls every 15 s while any request is pending (spec §7). */
export const MY_REQUESTS_POLL_MS = 15_000;
/** The superadmin queue + nav badge poll every 30 s. */
export const QUEUE_POLL_MS = 30_000;

export function useMyRequests(enabled = true) {
  const loader = useCallback(() => listMyRequests(), []);
  const [pending, setPending] = useState(false);
  const result = useAsync(loader, { enabled, pollMs: pending ? MY_REQUESTS_POLL_MS : null });
  // Derived from the last load; a state (not a plain derivation) so the
  // interval identity only changes when pending flips.
  const nextPending = hasPending(result.data);
  if (nextPending !== pending) setPending(nextPending);
  return result;
}

export function useRequestQueue(status: 'pending' | 'resolved', enabled = true) {
  const loader = useCallback(() => listQueue(status), [status]);
  return useAsync(loader, { enabled, pollMs: status === 'pending' ? QUEUE_POLL_MS : null });
}

/** Pending count for the nav badge. Silent on error (badge just hides). */
export function usePendingRequestCount(enabled: boolean): number {
  const loader = useCallback(() => getPendingCount(), []);
  const { data } = useAsync(loader, { enabled, pollMs: QUEUE_POLL_MS });
  return data ?? 0;
}

/** Re-renders every `tickMs` so TTL countdowns stay honest without a reload. */
export function useNow(tickMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs]);
  return now;
}

export function useCountdown(expiresAt: string | null | undefined): Countdown | null {
  const now = useNow();
  return ttlCountdown(expiresAt, now);
}
