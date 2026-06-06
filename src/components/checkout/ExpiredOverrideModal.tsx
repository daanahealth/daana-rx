'use client';

// ExpiredOverrideModal
// -----------------------------------------------------------------------------
// Per spec § "Expired Medication Handling":
//   * Expired medications are blocked from standard checkout search results.
//   * Superadmin sees expired meds flagged in Inventory; one of the actions is
//     "Override and Check Out — requires a mandatory note. The override and
//      note are recorded in the transaction log."
//
// This modal is the gate. It captures a mandatory free-text note (>=3 chars)
// and POSTs to /carts/{id}/items?override=true&note=... via cartApi. On
// success the item enters the cart as in_cart; the audit row is written by
// the backend as action=expired_override.

import * as React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  ConcurrentConflictError,
  addItemToCart,
  platformItemToCartItem,
  type PlatformItemDTO,
} from '@/lib/cartApi';
import { useCart } from '@/components/cart/CartContext';

export interface ExpiredOverrideModalProps {
  readonly item: PlatformItemDTO | null;
  readonly cartId: string | null;
  readonly addedByName?: string | null;
  readonly onClose: () => void;
}

const MIN_NOTE_LENGTH = 3;

export function ExpiredOverrideModal({
  item,
  cartId,
  addedByName,
  onClose,
}: ExpiredOverrideModalProps) {
  const { toast } = useToast();
  const cart = useCart();
  const [note, setNote] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  // Reset note when modal re-opens with a different item.
  React.useEffect(() => {
    if (item) setNote('');
  }, [item?.id]);

  const open = item !== null;
  const trimmed = note.trim();
  const valid = trimmed.length >= MIN_NOTE_LENGTH;

  const handleSubmit = async () => {
    if (!item || !cartId || !valid) return;
    setSubmitting(true);

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
      await addItemToCart(cartId, item.id, { override: true, note: trimmed });
      toast({
        title: 'Override recorded',
        description: `Expired ${item.unit_code} added to cart with mandatory note.`,
      });
      cart.setOpen(true);
      onClose();
    } catch (err) {
      cart.removeLocalItem(item.id);
      if (err instanceof ConcurrentConflictError) {
        toast({
          title: 'Item unavailable',
          description: err.message,
          variant: 'destructive',
        });
        onClose();
      } else {
        toast({
          title: 'Override failed',
          description: (err as Error)?.message ?? 'Unknown error',
          variant: 'destructive',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Override Expired Medication
          </DialogTitle>
          <DialogDescription>
            This medication is flagged Expired. Overriding and checking it out
            will be recorded in the transaction log alongside your note.
          </DialogDescription>
        </DialogHeader>

        {item && (
          <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
            <div className="font-semibold break-words">
              {String(item.attributes?.medication_name ?? item.attributes?.medicationName ?? 'Medication')}
            </div>
            <div className="font-mono text-xs text-muted-foreground break-all">
              {item.unit_code}
            </div>
            <div className="text-xs text-muted-foreground">
              Expiry: {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : '—'}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="override-note" className="font-semibold">
            Reason for override <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="override-note"
            placeholder="e.g. Patient need confirmed by Dr. Lee; expiry just two days past."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            Required. Minimum {MIN_NOTE_LENGTH} characters. Logged permanently.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!valid || submitting}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Override and Check Out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
