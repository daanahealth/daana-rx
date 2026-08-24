/**
 * CheckinSteps — the three-step progress line. Numbers, not colour, carry the
 * state (done = check mark, current = teal ring, upcoming = quiet).
 */
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckinStepsProps {
  activeStep: number;
  labels: readonly string[];
}

export function CheckinSteps({ activeStep, labels }: CheckinStepsProps) {
  return (
    <ol className="mb-6 flex items-center gap-2 overflow-x-auto" aria-label="Check-in steps">
      {labels.map((label, idx) => {
        const done = idx < activeStep;
        const active = idx === activeStep;
        return (
          <li key={label} className="flex shrink-0 items-center gap-2">
            <span
              aria-hidden
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium tabular-nums',
                done && 'border-primary bg-primary text-primary-foreground',
                active && 'border-primary text-primary-ink',
                !done && !active && 'border-border-strong text-muted-foreground'
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : idx + 1}
            </span>
            <span
              aria-current={active ? 'step' : undefined}
              className={cn(
                'whitespace-nowrap text-sm',
                active ? 'font-medium text-foreground' : 'text-muted-foreground'
              )}
            >
              {label}
            </span>
            {idx < labels.length - 1 ? (
              <span
                aria-hidden
                className={cn('h-px w-6 sm:w-10', done ? 'bg-primary' : 'bg-border-strong')}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
