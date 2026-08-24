'use client';

import * as React from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EntityDrawer, StatusChip, KeyValueList, DateText } from '@/components/composed';
import { pluralize } from '@/lib/format';
import { createRequest } from '@/features/requests/api';
import type { DispenseRequestVM } from '@/features/requests/mappers';
import { useProviderMedication } from '../hooks';
import { doseForm, type ClinicFlagsVM, type MedicationCardVM } from '../mappers';
import {
  RequestForm,
  REQUEST_FORM_ID,
  classifySubmitError,
  type RequestFormValues,
  type SubmitError,
} from './RequestForm';

/**
 * RequestDrawer — "Request Dispense" for one medication. Bottom sheet on a
 * phone, centred dialog on desktop. Loads the FEFO detail for the expiry
 * hint, submits, and swaps to a confirmation that says where to track it.
 *
 *   <RequestDrawer medication={card} flags={flags} onOpenChange={…} onSubmitted={refetch} />
 */
export interface RequestDrawerProps {
  medication: MedicationCardVM | null;
  flags: ClinicFlagsVM;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful submit so lists can refresh availability. */
  onSubmitted?: (request: DispenseRequestVM) => void;
}

export function RequestDrawer({
  medication,
  flags,
  onOpenChange,
  onSubmitted,
}: RequestDrawerProps) {
  const key = medication?.key ?? null;
  const detail = useProviderMedication(key);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<SubmitError | null>(null);
  const [submitted, setSubmitted] = React.useState<DispenseRequestVM | null>(null);

  // Reset per medication (derived state from props).
  const [lastKey, setLastKey] = React.useState(key);
  if (lastKey !== key) {
    setLastKey(key);
    setError(null);
    setSubmitted(null);
    setSubmitting(false);
  }

  const available = detail.data?.availableUnits ?? medication?.availableUnits ?? 0;

  const handleSubmit = async (values: RequestFormValues) => {
    if (!medication) return;
    setSubmitting(true);
    setError(null);
    try {
      const req = await createRequest({
        medicationKey: medication.key,
        quantity: values.quantity,
        patientRef: flags.patientRefEnabled ? values.patientRef || null : null,
      });
      setSubmitted(req);
      onSubmitted?.(req);
    } catch (err) {
      setError(classifySubmitError(err));
      // A conflict means availability moved; refresh the hint so the next try is honest.
      detail.refetch();
    } finally {
      setSubmitting(false);
    }
  };

  const open = !!medication;
  const title = submitted ? 'Request submitted' : 'Request dispense';

  return (
    <EntityDrawer
      open={open}
      onOpenChange={onOpenChange}
      desktop="dialog"
      title={title}
      description={
        medication && !submitted
          ? `${medication.medicationName} · ${doseForm(medication)}`
          : undefined
      }
      footer={
        submitted ? (
          <>
            <Button variant="outline" size="touch" onClick={() => onOpenChange(false)}>
              Done
            </Button>
            <Button asChild size="touch">
              <Link href="/requests">Track in My Requests</Link>
            </Button>
          </>
        ) : (
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
              form={REQUEST_FORM_ID}
              size="touch"
              loading={submitting}
              disabled={submitting || !flags.providerRequestsEnabled || available <= 0}
            >
              Submit request
            </Button>
          </>
        )
      }
    >
      {medication && submitted ? (
        <Confirmation request={submitted} medication={medication} />
      ) : medication ? (
        <RequestForm
          medication={medication}
          detail={detail.data}
          detailLoading={detail.status === 'loading'}
          flags={flags}
          submitError={error}
          disabled={submitting || !flags.providerRequestsEnabled}
          onSubmit={handleSubmit}
          onRetryAvailability={() => {
            setError(null);
            detail.refetch();
          }}
        />
      ) : null}
    </EntityDrawer>
  );
}

function Confirmation({
  request,
  medication,
}: {
  request: DispenseRequestVM;
  medication: MedicationCardVM;
}) {
  return (
    <div className="flex flex-col gap-4" data-testid="request-confirmation">
      <div className="flex items-start gap-3 rounded-sm border border-border bg-ok-wash px-3 py-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-ok" aria-hidden />
        <div className="text-sm">
          <p className="font-medium text-foreground">
            A volunteer will pull {pluralize(request.quantity, 'unit')} of{' '}
            {medication.medicationName}.
          </p>
          <p className="mt-0.5 text-subtle-foreground">
            The unit is reserved for you now. Track it under My Requests — it turns Fulfilled when
            it&apos;s ready at the front desk.
          </p>
        </div>
      </div>
      <KeyValueList
        columns="inline"
        items={[
          { label: 'Status', value: <StatusChip kind="request" status={request.status} /> },
          { label: 'Medication', value: `${medication.medicationName} · ${doseForm(medication)}` },
          { label: 'Quantity', value: <span className="tabular-nums">{request.quantity}</span> },
          ...(request.patientRef
            ? [{ label: 'Patient reference', value: request.patientRef, code: true }]
            : []),
          ...(request.expiresAt
            ? [{ label: 'Hold until', value: <DateText value={request.expiresAt} withTime /> }]
            : []),
        ]}
      />
    </div>
  );
}
