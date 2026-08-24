'use client';

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, WifiOff, Lock } from 'lucide-react';
import { Form } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { QuantityStepper, TextField, DateText, KeyValueList } from '@/components/composed';
import { isApiError } from '@/lib/apiClient';
import { pluralize } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  doseForm,
  type ClinicFlagsVM,
  type MedicationCardVM,
  type MedicationDetailVM,
} from '../mappers';

/**
 * RequestForm — the body of the Request Dispense modal, kept free of the
 * drawer chrome so it renders (and is tested) with react-dom/server.
 *
 * Rules it enforces (Provider spec §7/§9/§11):
 * - quantity defaults to 1 and can never exceed the units dispensable now;
 * - the patient reference field exists only when `patient_ref_enabled` is on
 *   and is a numeric internal sheet number, never PHI;
 * - the earliest expiry that would be reserved is stated in MM/DD/YYYY;
 * - conflict / flag-off / network errors name the problem and the recovery.
 */
export const REQUEST_FORM_ID = 'request-dispense-form';

export const PATIENT_REF_MAX = 10;

export function requestSchema(maxQuantity: number) {
  return z.object({
    quantity: z
      .number({ message: 'Enter a quantity' })
      .int('Whole units only')
      .min(1, 'Request at least 1 unit')
      .max(
        Math.max(1, maxQuantity),
        `Only ${pluralize(maxQuantity, 'unit')} can be dispensed right now`
      ),
    patientRef: z
      .string()
      .trim()
      .max(PATIENT_REF_MAX, `Use at most ${PATIENT_REF_MAX} digits`)
      .regex(/^\d*$/, 'Digits only — this is the internal sheet number, not a name')
      .optional(),
  });
}

export type RequestFormValues = z.infer<ReturnType<typeof requestSchema>>;

export type SubmitErrorKind = 'conflict' | 'flag-off' | 'network' | 'other';

export interface SubmitError {
  kind: SubmitErrorKind;
  message: string;
}

/** Turns a thrown error from createRequest into something the form can explain. */
export function classifySubmitError(err: unknown): SubmitError {
  if (isApiError(err)) {
    if (err.status === 409) return { kind: 'conflict', message: err.message };
    if (err.status === 403) {
      return {
        kind: 'flag-off',
        message: 'Requests are turned off for this clinic. Ask the front desk to dispense instead.',
      };
    }
    if (err.status === 0) {
      return {
        kind: 'network',
        message: "Couldn't reach the server. Check your connection and try again.",
      };
    }
    return { kind: 'other', message: err.message };
  }
  return {
    kind: 'other',
    message: err instanceof Error && err.message ? err.message : 'The request could not be sent.',
  };
}

export interface RequestFormProps {
  medication: MedicationCardVM;
  /** Detail with FEFO buckets; null while loading or if the call failed. */
  detail: MedicationDetailVM | null;
  detailLoading?: boolean;
  flags: ClinicFlagsVM;
  submitError?: SubmitError | null;
  disabled?: boolean;
  onSubmit: (values: RequestFormValues) => void | Promise<void>;
  onRetryAvailability?: () => void;
}

export function RequestForm({
  medication,
  detail,
  detailLoading = false,
  flags,
  submitError,
  disabled = false,
  onSubmit,
  onRetryAvailability,
}: RequestFormProps) {
  const available = detail?.availableUnits ?? medication.availableUnits;
  const max = Math.max(0, available);
  const earliest =
    detail?.nextExpiries[0]?.expiryDate ?? detail?.earliestExpiry ?? medication.earliestExpiry;
  const none = max <= 0;

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema(max)),
    defaultValues: { quantity: 1, patientRef: '' },
    mode: 'onSubmit',
  });

  // Keep the stepper bound when availability shrinks after the detail loads.
  const quantity = useWatch({ control: form.control, name: 'quantity' });
  if (max > 0 && quantity > max) form.setValue('quantity', max);

  return (
    <Form {...form}>
      <form
        id={REQUEST_FORM_ID}
        onSubmit={form.handleSubmit((values) => onSubmit(values))}
        className="flex flex-col gap-5"
        noValidate
      >
        <KeyValueList
          columns="inline"
          items={[
            { label: 'Medication', value: medication.medicationName },
            { label: 'Dose · form', value: doseForm(medication) || '—' },
            {
              label: 'Available now',
              value: detailLoading ? (
                <Skeleton className="ml-auto h-4 w-16" />
              ) : none ? (
                <span className="text-quiet">None available</span>
              ) : (
                <span className="tabular-nums">{pluralize(max, 'unit')}</span>
              ),
            },
          ]}
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="request-quantity" className="text-xs font-medium text-subtle-foreground">
            Quantity
          </label>
          <QuantityStepper
            id="request-quantity"
            value={quantity}
            min={1}
            max={Math.max(1, max)}
            disabled={disabled || none}
            onChange={(next) => form.setValue('quantity', next, { shouldValidate: true })}
          />
          {form.formState.errors.quantity ? (
            <p className="text-xs text-danger">{form.formState.errors.quantity.message}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {none ? 'Nothing can be dispensed right now.' : `Up to ${pluralize(max, 'unit')}.`}
            </p>
          )}
        </div>

        {flags.patientRefEnabled ? (
          <TextField
            control={form.control}
            name="patientRef"
            label="Patient reference"
            optional
            description="Internal sheet # — optional"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            maxLength={PATIENT_REF_MAX}
            placeholder="e.g. 10423"
            disabled={disabled || none}
          />
        ) : null}

        <p
          data-testid="earliest-expiry-hint"
          className="rounded-sm border border-border bg-panel px-3 py-2 text-sm text-subtle-foreground"
        >
          {detailLoading ? (
            <Skeleton className="h-4 w-56" />
          ) : earliest && !none ? (
            <>
              Earliest expiry that would be reserved: <DateText value={earliest} expiry noHint />
            </>
          ) : (
            'No unit would be reserved — none are available.'
          )}
        </p>

        {submitError ? (
          <SubmitErrorNotice error={submitError} onRetry={onRetryAvailability} />
        ) : null}
      </form>
    </Form>
  );
}

function SubmitErrorNotice({ error, onRetry }: { error: SubmitError; onRetry?: () => void }) {
  const Icon = error.kind === 'network' ? WifiOff : error.kind === 'flag-off' ? Lock : AlertCircle;
  const title =
    error.kind === 'conflict'
      ? 'Availability just changed'
      : error.kind === 'flag-off'
        ? 'Requests are off'
        : error.kind === 'network'
          ? 'No connection'
          : 'Request not sent';
  return (
    <div
      role="alert"
      data-error-kind={error.kind}
      className={cn(
        'flex items-start gap-2 rounded-sm border px-3 py-2 text-sm',
        'border-danger/30 bg-danger-wash text-foreground'
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        <p className="mt-0.5 text-subtle-foreground">{error.message}</p>
        {error.kind === 'conflict' && onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-1 text-sm font-medium text-primary-ink underline-offset-4 hover:underline"
          >
            Refresh availability
          </button>
        ) : null}
      </div>
    </div>
  );
}
