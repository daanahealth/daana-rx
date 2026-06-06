'use client';

// CartContext
// -----------------------------------------------------------------------------
// Lightweight provider that layers cart-sidebar concerns (open/close, the
// remote cart id, pending-approval queue, and platform-API plumbing) on top of
// the existing Redux cart slice. We intentionally do NOT refactor the Redux
// store — the spec calls for additive context, and the orchestrator forbids a
// store rewrite. Redux still owns the persisted local "items" list (matching
// the existing localStorage contract); this context owns the sidebar UI state
// and the server-cart mirror (status, approvals list, server item ids).
//
// The shell-polish branch already wires the top-right "View Cart" button. It
// signals "please open the cart" by dispatching a `daana:open-cart`
// CustomEvent on window. We listen for it here so the shell stays untouched.

import * as React from 'react';
import type { ItemStatus, CartStatus } from '@daana-health/inventory-core';

// -----------------------------------------------------------------------------
// Shared item shape (platform `Item`, with the few extras we surface in the
// cart row: medication display fields live inside `attributes`).
// -----------------------------------------------------------------------------

export interface CartItemView {
  /** Server-side platform item id (uuid). */
  readonly itemId: string;
  /** DRX unit code, e.g. DRX-MASS-CARDIO1-00042. */
  readonly unitCode: string;
  readonly status: ItemStatus;
  readonly expiryDate: string | null;
  readonly locationCode: string | null;
  readonly medicationName: string;
  readonly dose: string | null;
  readonly unit: string | null;
  readonly form: string | null;
  readonly quantity: number | null;
  /** ISO timestamp the item was added to the cart. */
  readonly addedAt: string;
  /** Display name of the user who added the item. */
  readonly addedBy: string | null;
}

export interface ServerCart {
  readonly id: string;
  readonly ownerId: string;
  readonly ownerName?: string | null;
  readonly status: CartStatus;
  readonly submittedAt: string | null;
  readonly expiresAt: string | null;
  readonly items: readonly CartItemView[];
}

interface CartContextValue {
  // UI state ----------------------------------------------------------------
  readonly open: boolean;
  setOpen(v: boolean): void;
  toggle(): void;

  // The user's own server cart -------------------------------------------------
  readonly myCart: ServerCart | null;
  setMyCart(c: ServerCart | null): void;
  /** Optimistically remove an item from local cart state (for 409 handling). */
  removeLocalItem(itemId: string): void;
  /** Replace items wholesale after a refetch. */
  setMyCartItems(items: readonly CartItemView[]): void;

  // Pending-approval queue (superadmin only) ---------------------------------
  readonly pendingCarts: readonly ServerCart[];
  setPendingCarts(c: readonly ServerCart[]): void;
  readonly pendingCount: number;

  // Active tab in the sidebar ----------------------------------------------
  readonly activeTab: 'mine' | 'approvals';
  setActiveTab(t: 'mine' | 'approvals'): void;
}

const CartContext = React.createContext<CartContextValue | null>(null);

export interface CartProviderProps {
  readonly children: React.ReactNode;
  /** True when the current user is a superadmin (controls approvals tab). */
  readonly isSuperadmin?: boolean;
}

export function CartProvider({ children, isSuperadmin = false }: CartProviderProps) {
  const [open, setOpen] = React.useState(false);
  const [myCart, setMyCartState] = React.useState<ServerCart | null>(null);
  const [pendingCarts, setPendingCartsState] = React.useState<readonly ServerCart[]>([]);
  const [activeTab, setActiveTab] = React.useState<'mine' | 'approvals'>('mine');

  // Auto-switch tab if a superadmin loses approvals access mid-session.
  React.useEffect(() => {
    if (!isSuperadmin && activeTab === 'approvals') {
      setActiveTab('mine');
    }
  }, [isSuperadmin, activeTab]);

  // Listen for window event from the shell's top-right cart button.
  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handler = () => setOpen(true);
    window.addEventListener('daana:open-cart', handler);
    return () => window.removeEventListener('daana:open-cart', handler);
  }, []);

  const removeLocalItem = React.useCallback((itemId: string) => {
    setMyCartState((prev) =>
      prev ? { ...prev, items: prev.items.filter((i) => i.itemId !== itemId) } : prev,
    );
  }, []);

  const setMyCartItems = React.useCallback((items: readonly CartItemView[]) => {
    setMyCartState((prev) => (prev ? { ...prev, items } : prev));
  }, []);

  const setMyCart = React.useCallback((c: ServerCart | null) => setMyCartState(c), []);
  const setPendingCarts = React.useCallback(
    (c: readonly ServerCart[]) => setPendingCartsState(c),
    [],
  );

  const value = React.useMemo<CartContextValue>(
    () => ({
      open,
      setOpen,
      toggle: () => setOpen((v) => !v),
      myCart,
      setMyCart,
      removeLocalItem,
      setMyCartItems,
      pendingCarts,
      setPendingCarts,
      pendingCount: pendingCarts.length,
      activeTab,
      setActiveTab,
    }),
    [open, myCart, pendingCarts, activeTab, setMyCart, removeLocalItem, setMyCartItems, setPendingCarts],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = React.useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used inside <CartProvider>');
  }
  return ctx;
}

/**
 * Helper for any code outside React (e.g. error handlers) to ask the shell
 * to open the cart: window.dispatchEvent(new CustomEvent('daana:open-cart')).
 */
export function openCartFromWindow() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('daana:open-cart'));
  }
}
