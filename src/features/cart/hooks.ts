'use client';

// Cart hooks — bootstrap the caller's server cart and the superadmin
// pending-approval queue. Screens call these; they never fetch themselves.

import * as React from 'react';
import { getCart, getCurrentCart, listPendingCarts } from './api';
import { useCart } from './CartContext';
import { unavailableCart } from './mappers';

export interface CartOwner {
  readonly userId?: string | null;
  readonly username?: string | null;
}

/**
 * Resolve the caller's open cart once on mount via GET /carts/current (never
 * POST /carts — see api.getCurrentCart) and mirror it into the CartContext.
 * Returns the cart id the Add buttons need, plus a user-facing error when the
 * cart could not be loaded (in which case every Add button stays disabled).
 */
export function useCurrentCart(owner: CartOwner | null | undefined) {
  const cart = useCart();
  const [error, setError] = React.useState<string | null>(null);
  const ownerRef = React.useRef(owner);
  ownerRef.current = owner;

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const current = await getCurrentCart();
        if (!mounted) return;
        setError(null);
        cart.setMyCart(current);
      } catch (err) {
        // Without a server cart the Add buttons stay disabled, which reads as
        // "can't put medicines in cart" — so say why instead of failing silently.
        if (!mounted) return;
        setError(
          err instanceof Error
            ? `Cart unavailable: ${err.message}`
            : 'Cart unavailable — refresh to try again.'
        );
        cart.setMyCart(
          unavailableCart(ownerRef.current?.userId ?? '', ownerRef.current?.username ?? null)
        );
      }
    })();
    return () => {
      mounted = false;
    };
    // Only on mount — cart context setters are stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cartId = cart.myCart?.id || null;

  /** Re-fetch the cart to pick up the server's canonical state after a mutation. */
  const refetch = React.useCallback(async () => {
    if (!cartId) return;
    try {
      cart.setMyCart(await getCart(cartId));
    } catch {
      // ignore — optimistic state already reflects the change
    }
  }, [cartId, cart]);

  return { cartId, error, refetch };
}

/**
 * Superadmin only: load the pending-approval carts on mount and again each
 * time the drawer opens, so fresh submissions surface without a reload.
 */
export function usePendingCarts(isSuperadmin: boolean) {
  const cart = useCart();
  const { open, setPendingCarts } = cart;

  React.useEffect(() => {
    if (!isSuperadmin) return;
    let cancelled = false;
    (async () => {
      try {
        const pending = await listPendingCarts();
        if (!cancelled) setPendingCarts(pending);
      } catch {
        // Silent — endpoint might not be wired yet; we leave the list empty.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSuperadmin, open, setPendingCarts]);
}
