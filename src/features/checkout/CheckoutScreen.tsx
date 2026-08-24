'use client';

// CheckoutScreen — the Check Out flow per MVP spec § "Check Out Flow".
//
//   * Prompt: "What medication would you like, {firstName}?"
//   * Debounce: 300ms pause OR >=2 chars typed, whichever fires first.
//   * Results render FEFO-sorted (server-side), one ResultCard per unit.
//   * Restricted users see only `active` items. Superadmins additionally see
//     `expired` items flagged; the override dialog captures a mandatory note.
//   * Superadmins check out; employees build a request a superadmin approves
//     (the "request desk" copy) — the cart drawer's action follows the role.
//   * Providers do not use the cart (they have their own request flow), so
//     the route sends them home.
//   * The cart drawer is mounted here so add-to-cart opens it immediately.

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { AlertCircle, ShoppingCart, Search } from 'lucide-react';
import type { RootState } from '@/store';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState, FilterBar, NavBadge, PageHeader } from '@/components/composed';
import { isReadOnlyRole } from '@/lib/roles';
import { pluralize } from '@/lib/format';
import { CartProvider, useCart } from '@/features/cart/CartContext';
import { useCurrentCart, usePendingCarts } from '@/features/cart/hooks';
import { CartDrawer } from '@/features/cart/components/CartDrawer';
import type { PlatformItemDTO } from '@/features/cart/mappers';
import { useMedicationSearch } from './hooks';
import { deriveFirstName } from './mappers';
import { ResultCard } from './components/ResultCard';
import { ExpiredOverrideModal } from './components/ExpiredOverrideModal';

function CheckoutBody() {
  const user = useSelector((s: RootState) => s.auth.user);
  const isSuperadmin = user?.userRole === 'superadmin';
  const firstName = React.useMemo(
    () => deriveFirstName(user?.username, user?.email),
    [user?.username, user?.email]
  );
  const cart = useCart();
  const { cartId, error: cartError, refetch: refreshMyCart } = useCurrentCart(user);
  usePendingCarts(isSuperadmin);

  const [query, setQuery] = React.useState('');
  const {
    results,
    searching,
    error: searchError,
    empty,
  } = useMedicationSearch(query, isSuperadmin);
  const [expiredOverride, setExpiredOverride] = React.useState<PlatformItemDTO | null>(null);

  const cartCount = cart.myCart?.items.length ?? 0;
  const hasQuery = query.trim().length > 0;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={
          isSuperadmin
            ? `What medication would you like, ${firstName}?`
            : `What medication would you like to request, ${firstName}?`
        }
        description={
          isSuperadmin
            ? 'Results are sorted First-Expiry-First-Out. Adding to cart reserves the unit.'
            : 'Results are sorted First-Expiry-First-Out. Your request is held for pharmacy approval.'
        }
        actions={
          <Button variant="outline" onClick={() => cart.setOpen(true)} className="gap-2">
            <ShoppingCart aria-hidden />
            View Cart
            <NavBadge count={cartCount} label="items in cart" tone="primary" />
          </Button>
        }
      />

      <div className="space-y-4">
        {cartError ? (
          // A missing cart disables every Add button, which staff experience as
          // "can't put medicines in cart". Say so explicitly.
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" aria-hidden />
            <AlertDescription>
              {cartError} Items cannot be added until the cart loads.
            </AlertDescription>
          </Alert>
        ) : null}

        <FilterBar
          search={{
            value: query,
            onChange: setQuery,
            placeholder: 'Search medication name, dose, or DRX code',
            label: 'Search medications',
            autoFocus: true,
          }}
          trailing={
            searching ? (
              <span role="status">Searching…</span>
            ) : hasQuery && results.length > 0 ? (
              <span aria-live="polite">{pluralize(results.length, 'unit')}</span>
            ) : null
          }
        />

        {searchError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" aria-hidden />
            <AlertDescription>{searchError}</AlertDescription>
          </Alert>
        ) : null}

        {!hasQuery ? (
          <EmptyState
            icon={Search}
            title="Search to find a unit"
            description="Type a medication name, dose, or DRX code. The soonest-expiring unit comes first."
          />
        ) : null}

        {hasQuery ? (
          <div className="space-y-3">
            {results.map((item) => (
              <ResultCard
                key={item.id}
                item={item}
                cartId={cartId}
                isSuperadmin={isSuperadmin}
                allowExpired={isSuperadmin}
                addedByName={user?.username ?? null}
                onRequestExpiredOverride={setExpiredOverride}
              />
            ))}
            {empty ? (
              <EmptyState
                icon={Search}
                title={`No medications found matching “${query.trim()}”.`}
                description="Check spelling or contact a superadmin."
              />
            ) : null}
          </div>
        ) : null}
      </div>

      <CartDrawer isSuperadmin={isSuperadmin} />
      <ExpiredOverrideModal
        item={expiredOverride}
        cartId={cartId}
        addedByName={user?.username ?? null}
        onClose={() => {
          setExpiredOverride(null);
          void refreshMyCart();
        }}
      />
    </div>
  );
}

export function CheckoutScreen() {
  const router = useRouter();
  const role = useSelector((s: RootState) => s.auth.user?.userRole);
  const isProvider = isReadOnlyRole(role);

  // Providers never use the cart: they get their own request flow (lane A4).
  React.useEffect(() => {
    if (isProvider) router.replace('/');
  }, [isProvider, router]);
  if (isProvider) return null;

  return (
    <CartProvider isSuperadmin={role === 'superadmin'}>
      <CheckoutBody />
    </CartProvider>
  );
}
