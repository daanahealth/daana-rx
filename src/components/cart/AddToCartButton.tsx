'use client';

// AddToCartButton
// -----------------------------------------------------------------------------
// Handles the optimistic "add to cart" UX and the spec's concurrent-conflict
// path (§ "Concurrent Checkout Conflict"):
//
//   POST /carts/{id}/items -> 409 with conflict=concurrent_checkout
//     -> toast verbatim: "This medication has just been checked out. Please
//        refresh and select another unit."
//     -> remove the item from local cart state.
//
// The button is also the entry point for the superadmin's expired-override
// flow: when the API returns ExpiredOverrideRequiredError we surface a friendly
// hint and ask the parent to open the override modal. (The ResultCard renders
// a dedicated red "Override and Check Out" button for expired items so this
// path is the safety net only.)

import * as React from 'react';
import { Loader2, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  ConcurrentConflictError,
  ExpiredOverrideRequiredError,
  addItemToCart,
  platformItemToCartItem,
  type PlatformItemDTO,
} from '@/lib/cartApi';
import { useCart } from './CartContext';

export interface AddToCartButtonProps {
  readonly item: PlatformItemDTO;
  readonly cartId: string | null;
  readonly isSuperadmin: boolean;
  readonly className?: string;
  readonly addedByName?: string | null;
  /**
   * Override note (only used when adding an expired item — superadmin path).
   * If set, the request is sent with ?override=true&note=...
   */
  readonly overrideNote?: string;
  /** Called after a successful add. */
  readonly onAdded?: () => void;
  /** Called when an expired override is required (so parent can open modal). */
  readonly onRequestOverride?: (item: PlatformItemDTO) => void;
}

export function AddToCartButton({
  item,
  cartId,
  isSuperadmin,
  className,
  addedByName,
  overrideNote,
  onAdded,
  onRequestOverride,
}: AddToCartButtonProps) {
  const { toast } = useToast();
  const cart = useCart();
  const [loading, setLoading] = React.useState(false);

  const disabled = loading || !cartId || item.status !== 'active' && !overrideNote;

  const handleClick = React.useCallback(async () => {
    if (!cartId) {
      toast({
        title: 'Cart not ready',
        description: 'Please wait a moment and try again.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);

    // Optimistic add: insert into local cart state immediately. We will roll
    // back if the server rejects (e.g. concurrent conflict).
    const optimistic = platformItemToCartItem(
      item,
      new Date().toISOString(),
      addedByName ?? null,
    );
    if (cart.myCart) {
      cart.setMyCart({
        ...cart.myCart,
        items: [...cart.myCart.items, optimistic],
      });
    }

    try {
      await addItemToCart(cartId, item.id, {
        override: !!overrideNote,
        note: overrideNote,
      });
      toast({
        title: 'Added to cart',
        description: `${item.unit_code} reserved.`,
      });
      cart.setOpen(true);
      onAdded?.();
    } catch (err) {
      // Rollback optimistic add.
      cart.removeLocalItem(item.id);

      if (err instanceof ConcurrentConflictError) {
        // Spec verbatim message lives on err.message.
        toast({
          title: 'Item unavailable',
          description: err.message,
          variant: 'destructive',
        });
      } else if (err instanceof ExpiredOverrideRequiredError) {
        toast({
          title: 'Expired medication',
          description: 'A superadmin override with a mandatory note is required.',
          variant: 'destructive',
        });
        if (isSuperadmin) onRequestOverride?.(item);
      } else {
        toast({
          title: 'Could not add to cart',
          description: (err as Error)?.message ?? 'Unknown error',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [
    cart,
    cartId,
    item,
    addedByName,
    overrideNote,
    isSuperadmin,
    onAdded,
    onRequestOverride,
    toast,
  ]);

  return (
    <Button
      size="lg"
      onClick={handleClick}
      disabled={disabled}
      className={className}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <ShoppingCart className="mr-2 h-4 w-4" />
      )}
      Check Out
    </Button>
  );
}
