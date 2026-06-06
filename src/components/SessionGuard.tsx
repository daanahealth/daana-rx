'use client';

import { useEffect, useState } from 'react';
import { useSessionTimeout, SESSION_EVENTS } from '@/lib/auth/sessionTimeout';

/**
 * Mounts the 60-minute inactivity watcher and surfaces a small toast-style
 * notice 60 seconds before expiry. Wrap authed route subtrees with this
 * component (typically once in the root layout below the auth gate).
 *
 * NOTE on MASS pilot account bootstrap:
 *   Per the MVP spec, the MASS pilot account is granted superadmin by
 *   Daana Health at launch via the email MASS provides. After launch,
 *   superadmin elevation is performed by an existing superadmin from
 *   Settings → User Management. There is intentionally no UI here for
 *   that bootstrap step — it is a one-time Daana Health operation.
 */
export function SessionGuard({ children }: { children: React.ReactNode }) {
  useSessionTimeout(60);
  const [warning, setWarning] = useState(false);

  useEffect(() => {
    const onWarn = () => setWarning(true);
    const onExpire = () => setWarning(false);
    window.addEventListener(SESSION_EVENTS.EXPIRING, onWarn as EventListener);
    window.addEventListener(SESSION_EVENTS.EXPIRED, onExpire as EventListener);
    return () => {
      window.removeEventListener(SESSION_EVENTS.EXPIRING, onWarn as EventListener);
      window.removeEventListener(SESSION_EVENTS.EXPIRED, onExpire as EventListener);
    };
  }, []);

  return (
    <>
      {warning && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-amber-300/60 bg-amber-50/95 px-4 py-3 text-sm text-amber-900 shadow-lg backdrop-blur dark:bg-amber-900/40 dark:text-amber-100"
        >
          <div className="font-medium">Your session is about to expire.</div>
          <div className="mt-0.5 text-xs">
            Move the cursor or press any key to stay signed in. Items in your
            cart are preserved for 24 hours.
          </div>
        </div>
      )}
      {children}
    </>
  );
}

export default SessionGuard;
