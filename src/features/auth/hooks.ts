'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAsync } from '@/hooks/use-async';
import { authApi } from './api';
import { normaliseInvitation, sessionNoticeFor, type SessionNotice } from './mappers';

/** Warm the backend once when a sign-in surface mounts. */
export function useWarmup() {
  useEffect(() => {
    void authApi.warmup();
  }, []);
}

/**
 * The "session ended" notice: from `?reason=` / `?timeout=true`, else from the
 * `logoutReason` the auth slice left in localStorage. Consumes it once.
 */
export function useSessionNotice(): SessionNotice | null {
  const searchParams = useSearchParams();
  const [notice, setNotice] = useState<SessionNotice | null>(null);

  useEffect(() => {
    const reason = searchParams?.get('reason');
    const timeout = searchParams?.get('timeout');
    let next: SessionNotice | null = null;
    if (reason) next = sessionNoticeFor(reason);
    else if (timeout === 'true') next = sessionNoticeFor('inactivity');
    else if (typeof window !== 'undefined')
      next = sessionNoticeFor(localStorage.getItem('logoutReason'));
    if (typeof window !== 'undefined') localStorage.removeItem('logoutReason');
    const t = window.setTimeout(() => setNotice(next), 0);
    return () => window.clearTimeout(t);
  }, [searchParams]);

  return notice;
}

export function useInvitation(token: string) {
  const load = useCallback(
    async () => normaliseInvitation(await authApi.getInvitation(token)),
    [token]
  );
  return useAsync(load);
}
