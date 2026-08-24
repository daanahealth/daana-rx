'use client';

// CartDrawer
// -----------------------------------------------------------------------------
// The cart as an EntityDrawer: a right sheet on desktop, a bottom sheet on
// phones, with the cart-wide action pinned in the footer.
//
//   * Each item shows: medication name, dose · form · qty, status, location,
//     expiry, DRX code, added-by, time-added. Per-item action: Remove.
//   * Footer action varies by role:
//       - superadmin viewing own cart  -> Confirm Checkout (calls approve)
//       - restricted user own cart      -> Submit for Approval
//       - superadmin on the Pending Approvals tab -> per-cart Approve / Reject
//   * Superadmin sees a "Pending Approvals" tab with a badge count.
//   * Empty state: "Your cart is empty. Search above to add medications."

import * as React from 'react';
import { ShoppingCart, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EmptyState, EntityDrawer, NavBadge, StatusChip } from '@/components/composed';
import { pluralize } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import { approveCart, submitCart } from '../api';
import { useCart, type CartTab } from '../CartContext';
import { CartItemRow } from './CartItemRow';
import { PendingCartCard } from './PendingCartCard';

export interface CartDrawerProps {
  readonly isSuperadmin: boolean;
}

function MyCartPanel({ isSuperadmin }: { isSuperadmin: boolean }) {
  const { myCart, removeLocalItem } = useCart();

  if (!myCart) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground" role="status">
        Loading cart…
      </p>
    );
  }

  const submitted = myCart.status === 'pending_approval';

  if (myCart.items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingCart}
        title="Your cart is empty."
        description="Search above to add medications."
        size="sm"
      />
    );
  }

  return (
    <div className="space-y-3">
      {submitted ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <StatusChip kind="cart" status="pending_approval" />
          Cart submitted. Awaiting superadmin approval.
        </p>
      ) : null}
      <ul className="space-y-2">
        {myCart.items.map((it) => (
          <CartItemRow
            key={it.itemId}
            item={it}
            cartId={myCart.id}
            canRemove={!submitted || isSuperadmin}
            onRemoved={removeLocalItem}
          />
        ))}
      </ul>
    </div>
  );
}

function ApprovalsPanel() {
  const { pendingCarts, setPendingCarts } = useCart();

  const handleDecided = React.useCallback(
    (cartId: string) => setPendingCarts(pendingCarts.filter((c) => c.id !== cartId)),
    [pendingCarts, setPendingCarts]
  );

  if (pendingCarts.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No carts awaiting approval."
        description="Restricted-user submissions appear here."
        size="sm"
      />
    );
  }

  return (
    <ul className="space-y-2">
      {pendingCarts.map((c) => (
        <PendingCartCard key={c.id} cart={c} onDecided={handleDecided} />
      ))}
    </ul>
  );
}

/** The one cart-wide action for the user's own cart, pinned in the footer. */
function useMyCartAction(isSuperadmin: boolean) {
  const { toast } = useToast();
  const { myCart, setMyCart } = useCart();
  const [busy, setBusy] = React.useState(false);

  if (!myCart || myCart.items.length === 0) return null;
  const count = myCart.items.length;
  const canSubmit = !isSuperadmin && myCart.status === 'active';
  const canCheckout =
    isSuperadmin && (myCart.status === 'active' || myCart.status === 'pending_approval');
  if (!canSubmit && !canCheckout) return null;

  const run = async () => {
    setBusy(true);
    try {
      if (canCheckout) {
        await approveCart(myCart.id);
        setMyCart({ ...myCart, status: 'approved', items: [] });
        toast({
          title: 'Checkout complete',
          description: `${pluralize(count, 'item')} checked out.`,
        });
      } else {
        const updated = await submitCart(myCart.id);
        setMyCart({ ...myCart, status: updated.status, submittedAt: updated.submittedAt });
        toast({
          title: 'Submitted for approval',
          description: 'A superadmin will review your cart.',
        });
      }
    } catch (err) {
      toast({
        title: canCheckout ? 'Checkout failed' : 'Submit failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button onClick={run} loading={busy} size="touch" className="sm:h-9 sm:text-sm">
      {canCheckout ? `Confirm Checkout (${count})` : 'Submit for Approval'}
    </Button>
  );
}

export function CartDrawer({ isSuperadmin }: CartDrawerProps) {
  const { open, setOpen, activeTab, setActiveTab, pendingCount } = useCart();
  const action = useMyCartAction(isSuperadmin);
  const footer = activeTab === 'mine' ? action : null;

  return (
    <EntityDrawer
      open={open}
      onOpenChange={setOpen}
      title="Cart"
      description="Items added here are reserved while in your cart."
      footer={footer}
      className="sm:max-w-md"
    >
      {isSuperadmin ? (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CartTab)}>
          <TabsList className="mb-3 grid w-full grid-cols-2">
            <TabsTrigger value="mine">My Cart</TabsTrigger>
            <TabsTrigger value="approvals" className="gap-2">
              Pending Approvals
              <NavBadge count={pendingCount} label="carts awaiting approval" />
            </TabsTrigger>
          </TabsList>
          <TabsContent value="mine" className="mt-0">
            <MyCartPanel isSuperadmin />
          </TabsContent>
          <TabsContent value="approvals" className="mt-0">
            <ApprovalsPanel />
          </TabsContent>
        </Tabs>
      ) : (
        <MyCartPanel isSuperadmin={false} />
      )}
    </EntityDrawer>
  );
}
