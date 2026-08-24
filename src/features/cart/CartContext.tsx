'use client';

// CartContext
// -----------------------------------------------------------------------------
// Lightweight provider that layers cart-drawer concerns (open/close, the
// server cart mirror, pending-approval queue) on top of the existing Redux
// cart slice. Redux still owns the persisted legacy "items" list (the
// localStorage contract the /cart page reads); this context owns the drawer
// UI state and the platform server-cart mirror.
//
// The shell can ask the drawer to open by dispatching a `daana:open-cart`
// CustomEvent on window; we listen for it here so the shell stays untouched.

import * as React from 'react';
import type { CartItemView, ServerCart } from './mappers';

export type CartTab = 'mine' | 'approvals';

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

  // Active tab in the drawer -----------------------------------------------
  readonly activeTab: CartTab;
  setActiveTab(t: CartTab): void;
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
  const [activeTab, setActiveTab] = React.useState<CartTab>('mine');

  // Auto-switch tab if a superadmin loses approvals access mid-session.
  React.useEffect(() => {
    if (!isSuperadmin && activeTab === 'approvals') {
      setActiveTab('mine');
    }
  }, [isSuperadmin, activeTab]);

  // Listen for the window event from the shell's cart button.
  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handler = () => setOpen(true);
    window.addEventListener('daana:open-cart', handler);
    return () => window.removeEventListener('daana:open-cart', handler);
  }, []);

  const removeLocalItem = React.useCallback((itemId: string) => {
    setMyCartState((prev) =>
      prev ? { ...prev, items: prev.items.filter((i) => i.itemId !== itemId) } : prev
    );
  }, []);

  const setMyCartItems = React.useCallback((items: readonly CartItemView[]) => {
    setMyCartState((prev) => (prev ? { ...prev, items } : prev));
  }, []);

  const setMyCart = React.useCallback((c: ServerCart | null) => setMyCartState(c), []);
  const setPendingCarts = React.useCallback(
    (c: readonly ServerCart[]) => setPendingCartsState(c),
    []
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
    [
      open,
      myCart,
      pendingCarts,
      activeTab,
      setMyCart,
      removeLocalItem,
      setMyCartItems,
      setPendingCarts,
    ]
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
