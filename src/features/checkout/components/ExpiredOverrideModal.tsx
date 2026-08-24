'use client';

// ExpiredOverrideModal
// -----------------------------------------------------------------------------
// Per spec § "Expired Medication Handling":
//   * Expired medications are blocked from standard checkout search results.
//   * Superadmin sees expired meds flagged; one of the actions is "Override
//     and Check Out — requires a mandatory note. The override and note are
//     recorded in the transaction log."
//
// This dialog is the gate. It captures a mandatory free-text note (>=3 chars)
// and POSTs to /carts/{id}/items?override=true&note=... On success the item
// enters the cart as in_cart; the backend writes the audit row as
// action=expired_override.

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { DateText, EntityDrawer, KeyValueList, TextareaField } from '@/components/composed';
import { useToast } from '@/hooks/use-toast';
import { ConcurrentConflictError, addItemToCart } from '@/features/cart/api';
import { platformItemToCartItem, type PlatformItemDTO } from '@/features/cart/mappers';
import { useCart } from '@/features/cart/CartContext';
import { toResultView } from '../mappers';

export interface ExpiredOverrideModalProps {
  readonly item: PlatformItemDTO | null;
  readonly cartId: string | null;
  readonly addedByName?: string | null;
  readonly onClose: () => void;
}

const MIN_NOTE_LENGTH = 3;

const schema = z.object({
  note: z
    .string()
    .trim()
    .min(MIN_NOTE_LENGTH, `Add a reason of at least ${MIN_NOTE_LENGTH} characters.`),
});
type Values = z.infer<typeof schema>;

export function ExpiredOverrideModal({
  item,
  cartId,
  addedByName,
  onClose,
}: ExpiredOverrideModalProps) {
  const { toast } = useToast();
  const cart = useCart();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { note: '' } });
  const { reset } = form;

  // Reset the note when the dialog re-opens with a different item.
  React.useEffect(() => {
    if (item) reset({ note: '' });
  }, [item, reset]);

  const submitting = form.formState.isSubmitting;
  const view = item ? toResultView(item) : null;

  const onSubmit = async ({ note }: Values) => {
    if (!item || !cartId) return;

    const optimistic = platformItemToCartItem(item, new Date().toISOString(), addedByName ?? null);
    if (cart.myCart) {
      cart.setMyCart({ ...cart.myCart, items: [...cart.myCart.items, optimistic] });
    }

    try {
      await addItemToCart(cartId, item.id, { override: true, note });
      toast({
        title: 'Override recorded',
        description: `Expired ${item.unit_code} added to cart with mandatory note.`,
      });
      cart.setOpen(true);
      onClose();
    } catch (err) {
      cart.removeLocalItem(item.id);
      if (err instanceof ConcurrentConflictError) {
        toast({ title: 'Item unavailable', description: err.message, variant: 'destructive' });
        onClose();
      } else {
        toast({
          title: 'Override failed',
          description: err instanceof Error ? err.message : 'Unknown error',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <EntityDrawer
      open={item !== null}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
      desktop="dialog"
      title={
        <span className="flex items-center gap-2 text-danger">
          <AlertTriangle className="h-5 w-5" aria-hidden />
          Override Expired Medication
        </span>
      }
      description="This medication is flagged Expired. Overriding and checking it out will be recorded in the transaction log alongside your note."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            form="expired-override-form"
            type="submit"
            loading={submitting}
            disabled={!cartId}
          >
            Override and Check Out
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {view ? (
          <KeyValueList
            columns="inline"
            className="rounded-md border border-border bg-panel px-3"
            items={[
              { label: 'Medication', value: view.medicationName },
              { label: 'DRX code', value: view.unitCode, code: true },
              { label: 'Expiry', value: <DateText value={view.expiryDate} expiry /> },
            ]}
          />
        ) : null}

        <Form {...form}>
          <form id="expired-override-form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <TextareaField
              control={form.control}
              name="note"
              label="Reason for override"
              description={`Required. Minimum ${MIN_NOTE_LENGTH} characters. Logged permanently.`}
              placeholder="e.g. Patient need confirmed by Dr. Lee; expiry just two days past."
              rows={4}
              autoFocus
            />
          </form>
        </Form>
      </div>
    </EntityDrawer>
  );
}
