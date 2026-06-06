'use client';

// /checkout
// -----------------------------------------------------------------------------
// Check Out flow per MVP spec § "Check Out Flow".
//
//   * Centered search prompt: "What medication would you like, {firstName}?"
//   * Debounce: 300ms pause OR >=2 chars typed, whichever fires first.
//   * Results render FEFO-sorted (server-side), one ResultCard per unit.
//   * Restricted users see only `active` items. Superadmins additionally see
//     `expired` items with the red chip / "!" indicator; the override modal
//     captures a mandatory note before the add request goes through.
//   * Cart sidebar is mounted here too so add-to-cart immediately opens it.
//   * Empty states match the spec verbatim.

import * as React from 'react';
import { Suspense } from 'react';
import { useSelector } from 'react-redux';
import { Loader2, Search, AlertCircle, ShoppingCart } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RootState } from '@/store';
import { ResultCard } from '@/components/checkout/ResultCard';
import { ExpiredOverrideModal } from '@/components/checkout/ExpiredOverrideModal';
import { CartProvider, useCart } from '@/components/cart/CartContext';
import { CartSidebar } from '@/components/cart/CartSidebar';
import {
  createCart,
  getCart,
  listPendingCarts,
  searchItems,
  type PlatformItemDTO,
} from '@/lib/cartApi';
import { cn } from '@/lib/utils';

const DEBOUNCE_MS = 300;
const MIN_CHARS_FAST_PATH = 2;

function deriveFirstName(username?: string | null, email?: string | null): string {
  if (username && username.trim()) {
    // Split on whitespace, dot, or underscore; take first non-empty token.
    const tok = username.split(/[\s._]+/).find((t) => t.length > 0);
    if (tok) return tok.charAt(0).toUpperCase() + tok.slice(1);
  }
  if (email) {
    const local = email.split('@')[0];
    if (local) {
      const tok = local.split(/[._-]+/).find((t) => t.length > 0);
      if (tok) return tok.charAt(0).toUpperCase() + tok.slice(1);
    }
  }
  return 'there';
}

function CheckOutInner() {
  const user = useSelector((s: RootState) => s.auth.user);
  const isSuperadmin = user?.userRole === 'superadmin';
  const firstName = React.useMemo(
    () => deriveFirstName(user?.username, user?.email),
    [user?.username, user?.email],
  );
  const cart = useCart();

  const [query, setQuery] = React.useState('');
  const [searching, setSearching] = React.useState(false);
  const [results, setResults] = React.useState<PlatformItemDTO[]>([]);
  const [searchError, setSearchError] = React.useState<string | null>(null);
  const [expiredOverride, setExpiredOverride] = React.useState<PlatformItemDTO | null>(null);
  const [cartId, setCartId] = React.useState<string | null>(null);

  // Initialize: create (or reuse) cart, and for superadmins poll pending list.
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const created = await createCart();
        if (!mounted) return;
        setCartId(created.id);
        cart.setMyCart(created);
      } catch {
        // Without a server cart, the UI is read-only — show a banner instead.
        if (!mounted) return;
        cart.setMyCart({
          id: '',
          ownerId: user?.userId ?? '',
          ownerName: user?.username ?? null,
          status: 'active',
          submittedAt: null,
          expiresAt: null,
          items: [],
        });
      }
    })();
    return () => {
      mounted = false;
    };
    // Only on mount — cart context is stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Superadmin: load pending-approval carts and refresh on sidebar open.
  React.useEffect(() => {
    if (!isSuperadmin) return;
    let cancelled = false;
    (async () => {
      try {
        const pending = await listPendingCarts();
        if (!cancelled) cart.setPendingCarts(pending);
      } catch {
        // Silent — endpoint might not be wired yet; we leave the list empty.
      }
    })();
    return () => {
      cancelled = true;
    };
    // Refresh when sidebar opens to surface fresh requests.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperadmin, cart.open]);

  // Debounced search with 2+ char fast path.
  const lastTokenRef = React.useRef(0);
  React.useEffect(() => {
    const q = query.trim();
    if (q.length === 0) {
      setResults([]);
      setSearching(false);
      return;
    }
    const token = ++lastTokenRef.current;
    const delay = q.length >= MIN_CHARS_FAST_PATH ? 0 : DEBOUNCE_MS;
    const t = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const items = await searchItems({
          q,
          // Superadmin: pull expired too so they can use the override flow.
          status: isSuperadmin ? 'active,expired' : 'active',
          limit: 50,
        });
        if (token !== lastTokenRef.current) return; // stale response
        setResults(items);
      } catch (err) {
        if (token !== lastTokenRef.current) return;
        setResults([]);
        setSearchError((err as Error)?.message ?? 'Search failed');
      } finally {
        if (token === lastTokenRef.current) setSearching(false);
      }
    }, delay);
    return () => clearTimeout(t);
  }, [query, isSuperadmin]);

  // After successful add, re-fetch the cart to pick up server canonical state.
  const refreshMyCart = React.useCallback(async () => {
    if (!cartId) return;
    try {
      const fresh = await getCart(cartId);
      cart.setMyCart(fresh);
    } catch {
      // ignore — optimistic state already includes the item
    }
  }, [cartId, cart]);

  const showEmptyResults =
    query.trim().length > 0 && !searching && results.length === 0 && !searchError;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6 sm:space-y-8">
        {/* Centered search + prompt */}
        <div className="text-center space-y-3 pt-4 sm:pt-6">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            What medication would you like, {firstName}?
          </h1>
          <p className="text-sm text-muted-foreground">
            Results are sorted First-Expiry-First-Out. Adding to cart reserves the unit.
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search medication name, dose, or DRX code"
            className="h-14 pl-12 text-base rounded-xl"
            aria-label="Search medications"
            autoFocus
          />
          {searching && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground animate-spin" />
          )}
        </div>

        {/* Open-cart shortcut: useful when the shell's top-right button isn't visible (mobile). */}
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => cart.setOpen(true)}>
            <ShoppingCart className="h-4 w-4 mr-2" />
            View Cart
            {cart.myCart && cart.myCart.items.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-semibold h-5 min-w-5 px-1.5">
                {cart.myCart.items.length}
              </span>
            )}
          </Button>
        </div>

        {/* Results */}
        <div className={cn('space-y-3 sm:space-y-4', query.trim().length === 0 && 'hidden')}>
          {searchError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{searchError}</span>
            </div>
          )}

          {results.map((item) => (
            <ResultCard
              key={item.id}
              item={item}
              cartId={cartId}
              isSuperadmin={isSuperadmin}
              allowExpired={isSuperadmin}
              onRequestExpiredOverride={(it) => setExpiredOverride(it)}
            />
          ))}

          {showEmptyResults && (
            <div className="rounded-xl border bg-card px-6 py-8 text-center space-y-1">
              <p className="text-sm font-medium">
                No medications found matching &ldquo;{query.trim()}&rdquo;.
              </p>
              <p className="text-sm text-muted-foreground">
                Check spelling or contact a superadmin.
              </p>
            </div>
          )}
        </div>
      </div>

      <CartSidebar isSuperadmin={isSuperadmin} />
      <ExpiredOverrideModal
        item={expiredOverride}
        cartId={cartId}
        addedByName={user?.username ?? null}
        onClose={() => {
          setExpiredOverride(null);
          void refreshMyCart();
        }}
      />
    </AppShell>
  );
}

export default function CheckOutPage() {
  // The provider has to wrap CheckOutInner so useCart() works in its subtree.
  // isSuperadmin selector lives inside so we can react to role changes.
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <CheckOutPageWithProvider />
    </Suspense>
  );
}

function CheckOutPageWithProvider() {
  const user = useSelector((s: RootState) => s.auth.user);
  const isSuperadmin = user?.userRole === 'superadmin';
  return (
    <CartProvider isSuperadmin={isSuperadmin}>
      <CheckOutInner />
    </CartProvider>
  );
}
