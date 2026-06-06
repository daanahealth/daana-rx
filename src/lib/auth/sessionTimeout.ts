'use client';

import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { logout } from '@/store/authSlice';

/**
 * Session timeout watcher.
 *
 * Per MASS MVP spec → Authentication → Session Management:
 *   "Sessions expire after 60 minutes of inactivity. The user is redirected
 *    to the login page with a notification that their session has ended.
 *    Unsaved work in a checkout cart is preserved for 24 hours."
 *
 * Event contract (window CustomEvents):
 *   - 'daana:session-expiring'  — fired 60 seconds before expiry.
 *       detail: { remainingMs: number }
 *   - 'daana:session-expired'   — fired at expiry.
 *       detail: { reason: 'expired' }
 *
 * On expiry the hook:
 *   1. Dispatches the Redux `logout` action with reason 'expired'.
 *   2. Redirects to `/auth/signin?reason=expired`.
 *
 * Note: this hook does NOT mutate the Redux store directly — it only
 * consumes the existing `logout` action exported by authSlice.
 */

const WINDOW_ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
];
// `visibilitychange` lives on Document, not Window.
const DOCUMENT_ACTIVITY_EVENTS: Array<keyof DocumentEventMap> = [
  'visibilitychange',
];

const WARNING_MS = 60 * 1000;
const TICK_MS = 1000;

export function useSessionTimeout(minutes = 60): void {
  const dispatch = useDispatch();
  const router = useRouter();
  const lastActivityRef = useRef<number>(Date.now());
  const warnedRef = useRef<boolean>(false);
  const expiredRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const timeoutMs = minutes * 60 * 1000;

    const bump = () => {
      lastActivityRef.current = Date.now();
      warnedRef.current = false;
    };

    for (const ev of WINDOW_ACTIVITY_EVENTS) {
      window.addEventListener(ev, bump, { passive: true });
    }
    for (const ev of DOCUMENT_ACTIVITY_EVENTS) {
      document.addEventListener(ev, bump, { passive: true });
    }

    const interval = window.setInterval(() => {
      if (expiredRef.current) return;
      const now = Date.now();
      const elapsed = now - lastActivityRef.current;
      const remaining = timeoutMs - elapsed;

      if (remaining <= 0) {
        expiredRef.current = true;
        window.dispatchEvent(
          new CustomEvent('daana:session-expired', {
            detail: { reason: 'expired' },
          })
        );
        dispatch(logout('expired'));
        router.push('/auth/signin?reason=expired');
        return;
      }

      if (remaining <= WARNING_MS && !warnedRef.current) {
        warnedRef.current = true;
        window.dispatchEvent(
          new CustomEvent('daana:session-expiring', {
            detail: { remainingMs: remaining },
          })
        );
      }
    }, TICK_MS);

    return () => {
      window.clearInterval(interval);
      for (const ev of WINDOW_ACTIVITY_EVENTS) {
        window.removeEventListener(ev, bump);
      }
      for (const ev of DOCUMENT_ACTIVITY_EVENTS) {
        document.removeEventListener(ev, bump);
      }
    };
  }, [minutes, dispatch, router]);
}

/**
 * Event names exported for consumers (e.g. cart preservation toast).
 */
export const SESSION_EVENTS = {
  EXPIRING: 'daana:session-expiring',
  EXPIRED: 'daana:session-expired',
} as const;
