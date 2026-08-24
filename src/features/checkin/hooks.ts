'use client';

/**
 * Check-in hooks — the React side of the flow. `useCheckinFlow` owns the
 * wizard state (reducer in ./flow.ts) and the form; the screen only renders.
 */
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { suggestLocationForClass, tenYearsFromToday } from '@daana-health/domain-mass';
import { useToast } from '@/hooks/use-toast';
import { listLocations, type BackendLocation } from './api';
import {
  canConfirm,
  flowReducer,
  initialFlowState,
  previewUnitCode,
  runCodePreview,
  runSave,
  STEP_LABELS,
  type FlowState,
} from './flow';
import {
  buildPreviewItem,
  domainIssues,
  specialtyClassForLocation,
  suggestedLocation,
  toCreateItemPayload,
} from './mappers';
import {
  buildDefaultMedicationFormValues,
  medicationFormSchema,
  type MedicationFormValues,
} from './schema';

export type Async<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: T };

export function useMedicationForm(): UseFormReturn<MedicationFormValues> {
  return useForm<MedicationFormValues>({
    resolver: zodResolver(medicationFormSchema),
    defaultValues: buildDefaultMedicationFormValues(),
    mode: 'onBlur',
  });
}

/** Bins configured in Settings. Skipped (empty) when no gateway is configured. */
export function useLocations() {
  const configured = Boolean(process.env.NEXT_PUBLIC_API_URL);
  const [state, setState] = useState<Async<BackendLocation[]>>(
    configured ? { status: 'loading' } : { status: 'success', data: [] }
  );
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!configured) return;
    const c = new AbortController();
    listLocations(c.signal)
      .then((data) => {
        if (!c.signal.aborted) setState({ status: 'success', data });
      })
      .catch((err: unknown) => {
        if (c.signal.aborted) return;
        setState({ status: 'error', message: err instanceof Error ? err.message : 'failed' });
      });
    return () => c.abort();
  }, [configured, attempt]);
  const refetch = () => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  };
  return { ...state, refetch };
}

export function useCheckinFlow() {
  const { toast } = useToast();
  const form = useMedicationForm();
  const { watch, setValue, getValues, trigger, reset } = form;
  const [state, dispatch] = useReducer(flowReducer, initialFlowState);

  const specialtyClass = watch('specialty_class') ?? '';
  const supervisorAcknowledged = watch('supervisor_acknowledged') ?? false;
  const expiryValue = watch('expiry_date');

  // Seed the bin from the live suggestion until the user picks one explicitly.
  const suggested = suggestedLocation(specialtyClass);
  useEffect(() => {
    if (!state.locationCode && suggested) {
      dispatch({ type: 'setLocation', locationCode: suggested });
    }
  }, [state.locationCode, suggested]);

  const classification = useMemo(
    () => suggestLocationForClass(specialtyClass),
    [specialtyClass]
  );
  const needsSupervisorReview = classification.requires_supervisor_review;
  const supervisorBlocked = needsSupervisorReview && !supervisorAcknowledged;

  const previewCode = previewUnitCode(state);
  // watch() with no args subscribes to every field, so the label re-renders
  // as the form changes; building the preview item is cheap.
  const values = watch();
  const previewItem = state.phase === 'label' ? buildPreviewItem(values, previewCode) : null;

  const loadCode = useCallback(() => {
    const values = getValues();
    return runCodePreview(dispatch, {
      location: state.locationCode,
      medicationName: values.medication_name,
      dosage: values.dosage ? String(values.dosage) : undefined,
    });
  }, [getValues, state.locationCode]);

  const goToLocation = async () => {
    // specialty_class is intentionally NOT gated here: the bin chosen on the
    // location step is authoritative and the class is backfilled from it.
    const ok = await trigger(['medication_name', 'dosage', 'unit', 'form', 'date_received']);
    if (!ok) {
      toast({
        title: 'Fix the highlighted fields',
        description: 'Some required fields are missing or invalid.',
        variant: 'destructive',
      });
      return;
    }
    dispatch({ type: 'goTo', phase: 'location' });
  };

  const goToLabel = async () => {
    if (!state.locationCode) {
      toast({
        title: 'Pick a location bin',
        description: 'Confirm or override the suggested bin first.',
        variant: 'destructive',
      });
      return;
    }
    // Location wins over specialty: the bin defines the class recorded on the
    // unit, so the two can never disagree.
    const derived = specialtyClassForLocation(state.locationCode);
    if (derived && derived !== getValues('specialty_class')) {
      setValue('specialty_class', derived, { shouldValidate: true });
    }
    if (!derived && !(getValues('specialty_class') ?? '').trim()) {
      toast({
        title: 'Pick a specialty class',
        description: `Bin ${state.locationCode} isn't in the classification guide, so the class can't be inferred.`,
        variant: 'destructive',
      });
      return;
    }
    dispatch({ type: 'goTo', phase: 'label' });
    await loadCode();
  };

  const confirm = async () => {
    if (!previewItem) return;
    const issues = domainIssues(previewItem);
    dispatch({ type: 'validationIssues', issues });
    if (issues.length > 0) {
      toast({
        title: 'Cannot submit',
        description: `${issues.length} issue(s) — see the list below.`,
        variant: 'destructive',
      });
      return;
    }
    const values = getValues();
    const saved = await runSave(dispatch, toCreateItemPayload(values, state.locationCode), {
      previewUnitCode: previewItem.unitCode,
      medicationName: values.medication_name,
    });
    if (!saved) {
      toast({
        title: 'Check-in failed — nothing was saved',
        description: 'Fix the problem below and confirm again.',
        variant: 'destructive',
      });
    }
  };

  const checkInAnother = () => {
    reset(buildDefaultMedicationFormValues());
    dispatch({ type: 'reset' });
  };

  const expiryFallback = tenYearsFromToday();

  return {
    form,
    state,
    stepIndex: stepIndexFor(state),
    stepLabels: STEP_LABELS,
    specialtyClass,
    locationCode: state.locationCode,
    setLocationCode: (locationCode: string) => dispatch({ type: 'setLocation', locationCode }),
    setSpecialtyClass: (v: string) =>
      setValue('specialty_class', v, { shouldValidate: true, shouldDirty: true }),
    needsSupervisorReview,
    supervisorAcknowledged,
    setSupervisorAcknowledged: (v: boolean) =>
      setValue('supervisor_acknowledged', v, { shouldDirty: true }),
    supervisorBlocked,
    previewItem,
    previewCode,
    expiryValue,
    expiryFallback,
    applyExpiryFallback: () => setValue('expiry_date', expiryFallback, { shouldValidate: true }),
    canConfirm: canConfirm(state, supervisorBlocked),
    loadCode,
    goToForm: () => dispatch({ type: 'goTo', phase: 'form' }),
    goToLocationStep: () => dispatch({ type: 'goTo', phase: 'location' }),
    goToLocation,
    goToLabel,
    confirm,
    checkInAnother,
  };
}

export type CheckinFlow = ReturnType<typeof useCheckinFlow>;

function stepIndexFor(state: FlowState): number {
  return state.phase === 'form' ? 0 : state.phase === 'location' ? 1 : 2;
}
