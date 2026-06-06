'use client';

// CartSidebar
// -----------------------------------------------------------------------------
// Right-side sliding panel (shadcn Sheet) that surfaces the spec's "Cart"
// behaviors:
//
//   * Each item shows: medication name, dose+unit, form, location, expiry,
//     DRX code, added-by, time-added.
//   * Actions per item: Remove.
//   * Cart-wide actions vary by role:
//       - superadmin viewing own cart  -> Confirm Checkout (calls approve)
//       - restricted user own cart      -> Submit for Approval
//       - superadmin viewing a pending  -> Approve / Reject (with reason input)
//   * Superadmin sees a "Pending Approvals" tab with a badge count.
//   * Empty state: "Your cart is empty. Search above to add medications."
//
// Mobile: the Sheet expands to full screen (sm:max-w-md desktop, w-full on
// mobile). All controls stack vertically and remain hit-target sized.

import * as React from 'react';
import { Loader2, Trash2, ShoppingCart, Clock, MapPin, AlertCircle } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { StatusChip } from '@/components/ui/status-chip';
import { useToast } from '@/hooks/use-toast';
import { useCart, type CartItemView, type ServerCart } from './CartContext';
import {
  approveCart,
  rejectCart,
  removeItemFromCart,
  submitCart,
} from '@/lib/cartApi';
import { cn } from '@/lib/utils';

interface CartSidebarProps {
  readonly isSuperadmin: boolean;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString();
}

interface ItemRowProps {
  readonly item: CartItemView;
  readonly cartId: string;
  readonly canRemove: boolean;
  readonly onRemoved: (itemId: string) => void;
}

function ItemRow({ item, cartId, canRemove, onRemoved }: ItemRowProps) {
  const { toast } = useToast();
  const [removing, setRemoving] = React.useState(false);

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await removeItemFromCart(cartId, item.itemId);
      onRemoved(item.itemId);
      toast({ title: 'Removed from cart', description: item.unitCode });
    } catch (err) {
      toast({
        title: 'Remove failed',
        description: (err as Error)?.message ?? 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <li className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <p className="font-semibold text-sm leading-tight break-words">
            {item.medicationName}
          </p>
          <p className="text-xs text-muted-foreground">
            {[
              item.dose ? `${item.dose}${item.unit ? ` ${item.unit}` : ''}` : null,
              item.form,
              item.quantity != null ? `Qty: ${item.quantity}` : null,
            ]
              .filter(Boolean)
              .join(' • ')}
          </p>
        </div>
        <StatusChip status={item.status} />
      </div>

      <dl className="grid grid-cols-2 gap-y-1 gap-x-3 text-xs">
        <div className="flex items-center gap-1 text-muted-foreground">
          <MapPin className="h-3 w-3" />
          {item.locationCode ?? '—'}
        </div>
        <div className="text-muted-foreground">
          Exp: <span className="text-foreground">{formatDate(item.expiryDate)}</span>
        </div>
        <div className="col-span-2 font-mono text-[10px] text-muted-foreground break-all">
          {item.unitCode}
        </div>
      </dl>

      <div className="flex items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1 min-w-0">
          <Clock className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {item.addedBy ? `${item.addedBy} • ` : ''}{formatTime(item.addedAt)}
          </span>
        </div>
        {canRemove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={removing}
            className="h-7 px-2 text-destructive hover:text-destructive"
          >
            {removing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Remove
              </>
            )}
          </Button>
        )}
      </div>
    </li>
  );
}

function MyCartPanel({ isSuperadmin }: { isSuperadmin: boolean }) {
  const { toast } = useToast();
  const { myCart, setMyCart, removeLocalItem } = useCart();
  const [busy, setBusy] = React.useState<null | 'approve' | 'submit'>(null);

  if (!myCart) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading cart…
      </div>
    );
  }

  const items = myCart.items;
  const empty = items.length === 0;
  const submitted = myCart.status === 'pending_approval';
  const canSubmit = !isSuperadmin && myCart.status === 'active' && !empty;
  const canCheckout = isSuperadmin && (myCart.status === 'active' || myCart.status === 'pending_approval') && !empty;

  const handleSubmit = async () => {
    setBusy('submit');
    try {
      const updated = await submitCart(myCart.id);
      setMyCart({ ...myCart, status: updated.status, submittedAt: updated.submittedAt });
      toast({
        title: 'Submitted for approval',
        description: 'A superadmin will review your cart.',
      });
    } catch (err) {
      toast({
        title: 'Submit failed',
        description: (err as Error)?.message ?? 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  };

  const handleCheckout = async () => {
    setBusy('approve');
    try {
      await approveCart(myCart.id);
      setMyCart({ ...myCart, status: 'approved', items: [] });
      toast({
        title: 'Checkout complete',
        description: `${items.length} item${items.length === 1 ? '' : 's'} checked out.`,
      });
    } catch (err) {
      toast({
        title: 'Checkout failed',
        description: (err as Error)?.message ?? 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {submitted && (
        <div className="mx-1 mb-3 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-foreground flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-warning" />
          <span>Cart submitted. Awaiting superadmin approval.</span>
        </div>
      )}

      <ScrollArea className="flex-1 -mx-1 px-1">
        {empty ? (
          <div className="py-16 text-center space-y-1">
            <ShoppingCart className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium">Your cart is empty.</p>
            <p className="text-xs text-muted-foreground">
              Search above to add medications.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((it) => (
              <ItemRow
                key={it.itemId}
                item={it}
                cartId={myCart.id}
                canRemove={!submitted || isSuperadmin}
                onRemoved={removeLocalItem}
              />
            ))}
          </ul>
        )}
      </ScrollArea>

      {!empty && (
        <div className="border-t pt-3 mt-3 space-y-2">
          {canCheckout && (
            <Button onClick={handleCheckout} size="lg" className="w-full" disabled={busy !== null}>
              {busy === 'approve' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Checkout ({items.length})
            </Button>
          )}
          {canSubmit && (
            <Button onClick={handleSubmit} size="lg" className="w-full" disabled={busy !== null}>
              {busy === 'submit' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit for Approval
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

interface PendingCartCardProps {
  readonly cart: ServerCart;
  readonly onDecided: (cartId: string) => void;
}

function PendingCartCard({ cart, onDecided }: PendingCartCardProps) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState<null | 'approve' | 'reject'>(null);
  const [showReject, setShowReject] = React.useState(false);
  const [reason, setReason] = React.useState('');

  const handleApprove = async () => {
    setBusy('approve');
    try {
      await approveCart(cart.id);
      toast({
        title: 'Cart approved',
        description: `${cart.items.length} item${cart.items.length === 1 ? '' : 's'} checked out.`,
      });
      onDecided(cart.id);
    } catch (err) {
      toast({
        title: 'Approve failed',
        description: (err as Error)?.message ?? 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async () => {
    if (!reason.trim()) return;
    setBusy('reject');
    try {
      await rejectCart(cart.id, reason.trim());
      toast({ title: 'Cart rejected', description: cart.ownerName ?? cart.ownerId });
      onDecided(cart.id);
    } catch (err) {
      toast({
        title: 'Reject failed',
        description: (err as Error)?.message ?? 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <li className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">
            {cart.ownerName ?? cart.ownerId}
          </p>
          <p className="text-xs text-muted-foreground">
            {cart.items.length} item{cart.items.length === 1 ? '' : 's'} • submitted{' '}
            {cart.submittedAt ? formatTime(cart.submittedAt) : '—'}
          </p>
        </div>
        <StatusChip status="pending_approval" />
      </div>

      <ul className="space-y-1 text-xs">
        {cart.items.map((it) => (
          <li key={it.itemId} className="flex items-start justify-between gap-2">
            <span className="truncate">{it.medicationName}</span>
            <span className="font-mono text-muted-foreground shrink-0">{it.unitCode}</span>
          </li>
        ))}
      </ul>

      {showReject ? (
        <div className="space-y-2 pt-1">
          <Label htmlFor={`reason-${cart.id}`} className="text-xs">
            Reason for rejection
          </Label>
          <Textarea
            id={`reason-${cart.id}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="e.g. Patient need not verified."
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={handleReject}
              disabled={!reason.trim() || busy !== null}
            >
              {busy === 'reject' && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Confirm Reject
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowReject(false)} disabled={busy !== null}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button size="sm" onClick={handleApprove} disabled={busy !== null}>
            {busy === 'approve' && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowReject(true)}
            disabled={busy !== null}
          >
            Reject
          </Button>
        </div>
      )}
    </li>
  );
}

function ApprovalsPanel() {
  const { pendingCarts, setPendingCarts } = useCart();

  const handleDecided = React.useCallback(
    (cartId: string) => {
      setPendingCarts(pendingCarts.filter((c) => c.id !== cartId));
    },
    [pendingCarts, setPendingCarts],
  );

  if (pendingCarts.length === 0) {
    return (
      <div className="py-16 text-center space-y-1">
        <ShoppingCart className="mx-auto h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm font-medium">No carts awaiting approval.</p>
        <p className="text-xs text-muted-foreground">
          Restricted-user submissions appear here.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 -mx-1 px-1">
      <ul className="space-y-2">
        {pendingCarts.map((c) => (
          <PendingCartCard key={c.id} cart={c} onDecided={handleDecided} />
        ))}
      </ul>
    </ScrollArea>
  );
}

export function CartSidebar({ isSuperadmin }: CartSidebarProps) {
  const { open, setOpen, activeTab, setActiveTab, pendingCount } = useCart();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className={cn(
          // Mobile: full screen. Desktop: 28rem (max-w-md upper bound).
          'w-full max-w-full sm:max-w-md p-0 flex flex-col',
        )}
      >
        <SheetHeader className="px-6 pt-6 pb-3 text-left">
          <SheetTitle>Cart</SheetTitle>
          <SheetDescription>
            Items added here are reserved while in your cart.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 flex flex-col px-6 pb-6 min-h-0">
          {isSuperadmin ? (
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as 'mine' | 'approvals')}
              className="flex-1 flex flex-col min-h-0"
            >
              <TabsList className="grid grid-cols-2 mb-3">
                <TabsTrigger value="mine">My Cart</TabsTrigger>
                <TabsTrigger value="approvals" className="relative">
                  Pending Approvals
                  {pendingCount > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold h-5 min-w-5 px-1.5">
                      {pendingCount}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="mine" className="flex-1 flex flex-col min-h-0 mt-0">
                <MyCartPanel isSuperadmin />
              </TabsContent>
              <TabsContent value="approvals" className="flex-1 flex flex-col min-h-0 mt-0">
                <Separator className="mb-3" />
                <ApprovalsPanel />
              </TabsContent>
            </Tabs>
          ) : (
            <MyCartPanel isSuperadmin={false} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
