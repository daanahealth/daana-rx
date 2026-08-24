'use client';

/**
 * CheckinScreen — the MASS intake wizard: Medication → Location → Label &
 * confirm → done. State lives in useCheckinFlow (features/checkin/hooks.ts);
 * this file only lays the steps out. Mobile-first: volunteers check in at the
 * shelf on a phone, so the primary action is a pinned 44px bar.
 */
import { AlertCircle, ShieldCheck } from 'lucide-react';
import { MASS_CLASSIFICATION_GUIDE } from '@daana-health/domain-mass';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader, DateText } from '@/components/composed';
import { useCheckinFlow, type CheckinFlow } from './hooks';
import { specialtyClassForLocation } from './mappers';
import { MedicationForm } from './components/MedicationForm';
import { LocationSuggestion } from './components/LocationSuggestion';
import { DrxCodePreview } from './components/DrxCodePreview';
import { LabelPreview } from './components/LabelPreview';
import { IntakeSuccess } from './components/IntakeSuccess';
import { CheckinSteps } from './components/CheckinSteps';
import { FlowFooter } from './components/FlowFooter';

export function CheckinScreen() {
  const flow = useCheckinFlow();
  const { state } = flow;

  return (
    <div className="mx-auto max-w-3xl pb-24 sm:pb-0">
      <PageHeader
        title="Check In"
        description="Log a donated medication, get its DRX code, label it and shelve it."
      />

      {state.phase === 'success' && state.created ? (
        <Card>
          <CardContent>
            <IntakeSuccess created={state.created} onCheckInAnother={flow.checkInAnother} />
          </CardContent>
        </Card>
      ) : (
        <>
          <CheckinSteps activeStep={flow.stepIndex} labels={flow.stepLabels} />
          {state.phase === 'form' ? <MedicationStep flow={flow} /> : null}
          {state.phase === 'location' ? <LocationStep flow={flow} /> : null}
          {state.phase === 'label' ? <LabelStep flow={flow} /> : null}
        </>
      )}
    </div>
  );
}

function MedicationStep({ flow }: { flow: CheckinFlow }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Medication details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pt-0">
        <MedicationForm form={flow.form} />

        {!flow.expiryValue ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span>No expiry on the donor package? Use the spec fallback.</span>
              <Button type="button" variant="outline" size="sm" onClick={flow.applyExpiryFallback}>
                Use <DateText value={flow.expiryFallback} /> (10 years from today)
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        <FlowFooter onBack={null} onNext={flow.goToLocation} nextLabel="Next: location" />
      </CardContent>
    </Card>
  );
}

function LocationStep({ flow }: { flow: CheckinFlow }) {
  const binUnknown = Boolean(flow.locationCode) && !specialtyClassForLocation(flow.locationCode);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Confirm location</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pt-0">
        <LocationSuggestion
          specialtyClass={flow.specialtyClass}
          value={flow.locationCode}
          onChange={flow.setLocationCode}
        />

        {binUnknown ? (
          <div className="space-y-1.5">
            <Label htmlFor="chk-specialty-class" className="text-xs font-medium text-subtle-foreground">
              Specialty class
            </Label>
            <Select value={flow.specialtyClass} onValueChange={flow.setSpecialtyClass}>
              <SelectTrigger id="chk-specialty-class" className="h-11 sm:h-10">
                <SelectValue placeholder="Select a class…" />
              </SelectTrigger>
              <SelectContent>
                {MASS_CLASSIFICATION_GUIDE.map((entry) => (
                  <SelectItem key={entry.class_name} value={entry.class_name}>
                    {entry.class_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Bin <span className="font-mono">{flow.locationCode}</span> isn&apos;t in the
              classification guide, so the class can&apos;t be inferred from it.
            </p>
          </div>
        ) : null}

        {flow.needsSupervisorReview ? (
          <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-sm border border-border bg-panel p-3">
            <input
              type="checkbox"
              className="mt-0.5 h-5 w-5 accent-primary"
              checked={flow.supervisorAcknowledged}
              onChange={(e) => flow.setSupervisorAcknowledged(e.target.checked)}
            />
            <span className="text-sm">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <ShieldCheck className="h-4 w-4" aria-hidden />
                Supervisor acknowledgement
              </span>
              <span className="mt-0.5 block text-muted-foreground">
                A superadmin has personally reviewed this intake. Required for high-risk classes
                and Hold.
              </span>
            </span>
          </label>
        ) : null}

        <FlowFooter
          onBack={flow.goToForm}
          onNext={flow.goToLabel}
          nextLabel="Next: label"
          nextDisabled={!flow.locationCode}
        />
      </CardContent>
    </Card>
  );
}

function LabelStep({ flow }: { flow: CheckinFlow }) {
  const { state } = flow;
  const saving = state.save.status === 'saving';
  return (
    <Card>
      <CardHeader>
        <CardTitle>Label &amp; place</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pt-0">
        <DrxCodePreview locationCode={flow.locationCode} code={state.code} onRetry={flow.loadCode} />

        {flow.previewItem ? (
          <LabelPreview item={flow.previewItem} locationCode={flow.locationCode} />
        ) : null}

        <p className="text-sm text-muted-foreground">
          Write or print this label onto the blank sticker, then place the medication in bin{' '}
          <span className="font-mono font-medium text-foreground">{flow.locationCode}</span>.
        </p>

        {state.validationIssues.length > 0 ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Cannot submit yet</AlertTitle>
            <AlertDescription>
              <ul className="list-disc space-y-0.5 pl-5">
                {state.validationIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}

        {state.save.status === 'error' ? (
          <Alert variant="destructive" data-testid="checkin-save-error">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Check-in failed — nothing was saved</AlertTitle>
            <AlertDescription>
              {state.save.message} Do not shelve the unit yet; fix the problem and confirm again.
            </AlertDescription>
          </Alert>
        ) : null}

        {flow.supervisorBlocked ? (
          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertDescription>
              Supervisor acknowledgement is required before confirming. Go back to the location
              step and tick the box.
            </AlertDescription>
          </Alert>
        ) : null}

        <FlowFooter
          onBack={flow.goToLocationStep}
          onNext={flow.confirm}
          nextLabel={saving ? 'Confirming…' : 'Confirm placed'}
          nextDisabled={!flow.canConfirm}
          nextBusy={saving}
        />
      </CardContent>
    </Card>
  );
}
