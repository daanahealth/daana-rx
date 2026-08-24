'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/features/shared/useAsync';
import { patchClinicFlags } from '../api';
import { useClinicFlags } from '../hooks';
import { ttlLabel, type ClinicFlagsVM, type RequestTtl } from '../mappers';

/**
 * ProviderRequestsPanel — Settings › Provider requests. The four clinic
 * flags from PR #12 (superadmin PATCH). Attestation is deliberately a
 * disabled "coming later" control (v1 scope).
 */
const TTL_OPTIONS: RequestTtl[] = ['end_of_day', 1, 2, 4, 8, 24];

export function ProviderRequestsPanel() {
  const { toast } = useToast();
  const { flags, status, error, setData, refetch } = useClinicFlags();
  const [saving, setSaving] = React.useState<keyof ClinicFlagsVM | null>(null);

  const update = async (patch: Partial<ClinicFlagsVM>, key: keyof ClinicFlagsVM) => {
    const before = flags;
    setSaving(key);
    setData((prev) => ({ ...(prev ?? before), ...patch }));
    try {
      const next = await patchClinicFlags(patch);
      setData(() => next);
      toast({ title: 'Saved', description: 'Provider request settings updated.' });
    } catch (err) {
      setData(() => before);
      toast({ title: "Couldn't save", description: errorMessage(err), variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const loading = status === 'loading';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Provider requests</CardTitle>
        <CardDescription>
          Controls what providers can do from their phone. Everything is off for a new clinic.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-border">
        {error && status === 'error' ? (
          <p role="alert" className="pb-4 text-sm text-danger">
            {error}{' '}
            <button
              type="button"
              onClick={refetch}
              className="font-medium underline-offset-4 hover:underline"
            >
              Try again
            </button>
          </p>
        ) : null}

        <FlagRow
          id="flag-provider-requests"
          label="Allow dispense requests"
          hint="Master switch. Off: providers see a read-only inventory and no Request buttons."
          loading={loading}
          control={
            <Switch
              id="flag-provider-requests"
              checked={flags.providerRequestsEnabled}
              disabled={loading || saving !== null}
              onCheckedChange={(v) =>
                update({ providerRequestsEnabled: v }, 'providerRequestsEnabled')
              }
            />
          }
        />
        <FlagRow
          id="flag-patient-ref"
          label="Ask for a patient reference"
          hint="Adds an optional internal sheet number to the request form. Never a name or PHI."
          loading={loading}
          control={
            <Switch
              id="flag-patient-ref"
              checked={flags.patientRefEnabled}
              disabled={loading || saving !== null}
              onCheckedChange={(v) => update({ patientRefEnabled: v }, 'patientRefEnabled')}
            />
          }
        />
        <FlagRow
          id="flag-ttl"
          label="Hold reserved units for"
          hint="Pending requests expire after this and the unit returns to the shelf."
          loading={loading}
          control={
            <Select
              value={String(flags.requestTtl)}
              disabled={loading || saving !== null}
              onValueChange={(v) =>
                update({ requestTtl: v === 'end_of_day' ? 'end_of_day' : Number(v) }, 'requestTtl')
              }
            >
              <SelectTrigger
                id="flag-ttl"
                className="w-full sm:w-52"
                aria-label="Request hold time"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TTL_OPTIONS.map((t) => (
                  <SelectItem key={String(t)} value={String(t)}>
                    {ttlLabel(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
        <FlagRow
          id="flag-attestation"
          label="Provider attestation"
          hint="Coming later — a checkbox or signature step before a request is submitted."
          loading={loading}
          control={
            <Select value="none" disabled>
              <SelectTrigger
                id="flag-attestation"
                className="w-full sm:w-52"
                aria-label="Attestation mode (coming later)"
              >
                <SelectValue placeholder="Off" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Off (coming later)</SelectItem>
              </SelectContent>
            </Select>
          }
        />
      </CardContent>
    </Card>
  );
}

function FlagRow({
  id,
  label,
  hint,
  control,
  loading,
}: {
  id: string;
  label: string;
  hint: string;
  control: React.ReactNode;
  loading: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-0.5">
        <Label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="shrink-0">{loading ? <Skeleton className="h-6 w-11" /> : control}</div>
    </div>
  );
}
