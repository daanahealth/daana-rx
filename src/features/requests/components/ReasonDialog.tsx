'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { EntityDrawer, TextareaField } from '@/components/composed';
import { cn } from '@/lib/utils';
import { DENY_QUICK_PICKS } from '../mappers';

/**
 * ReasonDialog — Deny / Return to Shelf both require a reason (spec §9).
 * Quick picks prefill the text; "Other" leaves it blank and required.
 *
 *   <ReasonDialog open kind="deny" subject="Metformin 500 mg · 2 units"
 *     onSubmit={(reason) => deny(id, reason)} onOpenChange={…} />
 */
export const reasonSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'A reason is required — the provider sees it.')
    .max(300, 'Keep it under 300 characters'),
});

export type ReasonValues = z.infer<typeof reasonSchema>;

export const REASON_FORM_ID = 'request-reason-form';

export interface ReasonDialogProps {
  open: boolean;
  kind: 'deny' | 'return';
  /** What is being acted on, for the description line. */
  subject: string;
  submitting?: boolean;
  error?: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: string) => void | Promise<void>;
}

const COPY = {
  deny: {
    title: 'Deny request',
    description: 'The reserved unit goes back on the shelf and the provider sees your reason.',
    action: 'Deny request',
    label: 'Reason',
  },
  return: {
    title: 'Return to shelf',
    description: 'Undo this fulfilment: the unit becomes available again and the log records why.',
    action: 'Return to shelf',
    label: 'Reason for returning',
  },
} as const;

export function ReasonDialog({
  open,
  kind,
  subject,
  submitting = false,
  error,
  onOpenChange,
  onSubmit,
}: ReasonDialogProps) {
  const copy = COPY[kind];
  return (
    <EntityDrawer
      open={open}
      onOpenChange={onOpenChange}
      desktop="dialog"
      title={copy.title}
      description={`${subject}. ${copy.description}`}
      footer={
        <>
          <Button
            variant="outline"
            size="touch"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form={REASON_FORM_ID}
            size="touch"
            variant={kind === 'deny' ? 'destructive' : 'default'}
            loading={submitting}
            disabled={submitting}
          >
            {copy.action}
          </Button>
        </>
      }
    >
      {open ? (
        <ReasonFields
          kind={kind}
          error={error}
          submitting={submitting}
          onSubmit={(v) => onSubmit(v.reason)}
        />
      ) : null}
    </EntityDrawer>
  );
}

export interface ReasonFieldsProps {
  kind: 'deny' | 'return';
  error?: string | null;
  submitting?: boolean;
  onSubmit: (values: ReasonValues) => void | Promise<void>;
}

/** The form body, separated so it renders without the dialog for tests. */
export function ReasonFields({ kind, error, submitting = false, onSubmit }: ReasonFieldsProps) {
  const form = useForm<ReasonValues>({
    resolver: zodResolver(reasonSchema),
    defaultValues: { reason: '' },
  });
  const [pick, setPick] = React.useState<string | null>(null);
  const copy = COPY[kind];

  const choose = (value: string) => {
    setPick(value);
    form.setValue('reason', value === 'other' ? '' : value, { shouldValidate: false });
    form.clearErrors('reason');
  };

  return (
    <Form {...form}>
      <form
        id={REASON_FORM_ID}
        onSubmit={form.handleSubmit((v) => onSubmit(v))}
        className="flex flex-col gap-4"
        noValidate
      >
        {kind === 'deny' ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-subtle-foreground">Quick pick</span>
            <div role="group" aria-label="Quick pick a reason" className="flex flex-wrap gap-2">
              {DENY_QUICK_PICKS.map((q) => (
                <button
                  key={q.value}
                  type="button"
                  aria-pressed={pick === q.value}
                  onClick={() => choose(q.value)}
                  disabled={submitting}
                  className={cn(
                    'h-9 rounded-sm border px-3 text-sm font-medium',
                    pick === q.value
                      ? 'border-primary bg-accent text-accent-foreground'
                      : 'border-border-strong bg-card text-foreground hover:bg-panel'
                  )}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <TextareaField
          control={form.control}
          name="reason"
          label={copy.label}
          description={
            kind === 'deny'
              ? 'Shown to the provider on their request.'
              : 'Recorded in the transaction log.'
          }
          rows={3}
          required
          disabled={submitting}
          placeholder={
            kind === 'deny' ? 'e.g. Box was water-damaged' : 'e.g. Patient did not return'
          }
        />
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
      </form>
    </Form>
  );
}
