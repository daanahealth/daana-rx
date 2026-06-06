'use client';

// IntakeSuccess — terminal state for the Check In flow. Shows confirmation
// of the generated DRX code + bin assignment and offers "Check in another"
// or "Back to Home".

import { CheckCircle2, Plus, Home } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export interface IntakeSuccessProps {
  readonly unitCode: string;
  readonly locationCode: string;
  readonly medicationName: string;
  readonly onCheckInAnother: () => void;
}

export function IntakeSuccess({
  unitCode,
  locationCode,
  medicationName,
  onCheckInAnother,
}: IntakeSuccessProps) {
  return (
    <div className="space-y-6 text-center py-8">
      <div className="flex justify-center">
        <div className="rounded-full bg-green-100 dark:bg-green-950/40 p-4">
          <CheckCircle2 className="h-12 w-12 text-green-600" />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold">Check-in complete</h2>
        <p className="text-muted-foreground">
          <span className="font-medium">{medicationName}</span> was logged with code{' '}
          <code className="font-mono">{unitCode}</code> and placed in bin{' '}
          <span className="font-mono font-semibold">{locationCode}</span>.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <Button size="lg" onClick={onCheckInAnother}>
          <Plus className="h-4 w-4 mr-2" /> Check in another
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link href="/">
            <Home className="h-4 w-4 mr-2" /> Back to Home
          </Link>
        </Button>
      </div>
    </div>
  );
}
