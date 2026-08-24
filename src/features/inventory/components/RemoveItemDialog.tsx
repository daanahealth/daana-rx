'use client';

// RemoveItemDialog — soft-delete an inventory unit with a required reason.
//
// Per MVP spec § Remove from Inventory: reason (required, enum below), note
// (optional); removed-by and timestamp are set server-side. Records are never
// hard-deleted — they stay in the transaction log and reports.

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle } from 'lucide-react';
import type { Item } from '@daana-health/inventory-core';
import { EntityDrawer, SelectField, TextareaField } from '@/components/composed';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { removeItem } from '../api';
import { REMOVAL_REASONS, doseLine, medicationName, type RemovalReason } from '../mappers';

const REASON_LABELS: Record<RemovalReason, string> = {
  expired: 'Expired',
  damaged: 'Damaged',
  duplicate_entry: 'Duplicate entry',
  incorrect_entry: 'Incorrect entry',
  lost_or_missing: 'Lost or missing',
  disposed: 'Disposed',
  other: 'Other',
};

const REASON_OPTIONS = REMOVAL_REASONS.map((r) => ({ value: r, label: REASON_LABELS[r] }));

const schema = z.object({
  reason: z.enum(REMOVAL_REASONS, {
    errorMap: () => ({ message: 'Removal reason is required.' }),
  }),
  note: z.string(),
});
type Values = z.infer<typeof schema>;

interface RemoveItemDialogProps {
  item: Item | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemoved: () => void;
}

export function RemoveItemDialog({ item, open, onOpenChange, onRemoved }: RemoveItemDialogProps) {
  const { toast } = useToast();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { reason: undefined, note: '' },
  });

  // The screen remounts this dialog per item (key={item.id}), so defaults
  // are fresh on every open without an effect.

  async function onSubmit(values: Values) {
    if (!item) return;
    setSubmitError(null);
    try {
      const note = values.note.trim();
      await removeItem(item.id, { reason: values.reason, ...(note ? { note } : {}) });
      toast({
        title: 'Item removed',
        description: `Removal logged with reason: ${REASON_LABELS[values.reason]}.`,
      });
      onRemoved();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to remove item.');
    }
  }

  const submitting = form.formState.isSubmitting;

  return (
    <EntityDrawer
      open={open}
      onOpenChange={onOpenChange}
      desktop="dialog"
      title="Remove from inventory"
      description="This soft-deletes the record. It no longer appears in active search but stays in the transaction log and reports."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="destructive" form="remove-item-form" type="submit" loading={submitting}>
            Confirm removal
          </Button>
        </>
      }
    >
      <Form {...form}>
        <form
          id="remove-item-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          {item ? (
            <div className="rounded-md border border-border bg-panel p-3 text-sm">
              <p className="font-medium text-foreground">{medicationName(item, '—')}</p>
              <p className="text-xs text-muted-foreground">
                {doseLine(item)}
                {doseLine(item) ? ' · ' : ''}
                <span className="font-mono text-[0.8125rem]">{item.unitCode}</span>
              </p>
            </div>
          ) : null}

          {submitError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" aria-hidden />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          ) : null}

          <SelectField
            control={form.control}
            name="reason"
            label="Removal reason"
            placeholder="Select a reason"
            options={REASON_OPTIONS}
          />
          <TextareaField
            control={form.control}
            name="note"
            label="Note"
            optional
            rows={3}
            placeholder="Add any context for the audit log."
          />
        </form>
      </Form>
    </EntityDrawer>
  );
}
