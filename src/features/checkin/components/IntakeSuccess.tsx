'use client';

/**
 * IntakeSuccess — the terminal state, rendered only after the server confirmed
 * the save (flow.ts `saveSucceeded`). Reads back the stored code and bin.
 */
import Link from 'next/link';
import { CheckCircle2, Home, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KeyValueList } from '@/components/composed';
import type { CreatedUnit } from '../flow';

export interface IntakeSuccessProps {
  readonly created: CreatedUnit;
  readonly onCheckInAnother: () => void;
}

export function IntakeSuccess({ created, onCheckInAnother }: IntakeSuccessProps) {
  return (
    <div className="space-y-5" role="status">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-panel text-foreground">
          <CheckCircle2 className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-base font-semibold text-foreground">Check-in complete</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            The unit is on the shelf and in the system. Make sure the sticker shows this code.
          </p>
        </div>
      </div>

      <KeyValueList
        columns="inline"
        items={[
          { label: 'Medication', value: created.medicationName },
          { label: 'DRX code', value: created.unitCode, code: true },
          { label: 'Bin', value: created.locationCode, code: true },
        ]}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" size="touch" asChild>
          <Link href="/">
            <Home aria-hidden /> Home
          </Link>
        </Button>
        <Button size="touch" onClick={onCheckInAnother} autoFocus>
          <Plus aria-hidden /> Check in another
        </Button>
      </div>
    </div>
  );
}
