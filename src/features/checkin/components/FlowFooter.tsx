'use client';

/**
 * FlowFooter — Back / Next for a wizard step. Inline on ≥ sm; on phones a
 * solid bar pinned to the bottom with a 44px primary (volunteers work
 * one-handed at the shelf). No blur, no shadow — a rule separates it.
 */
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface FlowFooterProps {
  onBack: (() => void) | null;
  onNext: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
  nextBusy?: boolean;
}

export function FlowFooter({ onBack, onNext, nextLabel, nextDisabled, nextBusy }: FlowFooterProps) {
  return (
    <>
      <div className="hidden items-center justify-between border-t border-border pt-4 sm:flex">
        {onBack ? (
          <Button type="button" variant="ghost" onClick={onBack}>
            <ChevronLeft aria-hidden /> Back
          </Button>
        ) : (
          <span />
        )}
        <Button type="button" onClick={onNext} disabled={nextDisabled} loading={nextBusy}>
          {nextLabel}
        </Button>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-border bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden">
        {onBack ? (
          <Button
            type="button"
            variant="outline"
            size="touch"
            onClick={onBack}
            aria-label="Back"
            className="w-11 shrink-0 px-0"
          >
            <ChevronLeft aria-hidden />
          </Button>
        ) : null}
        <Button
          type="button"
          size="touch"
          onClick={onNext}
          disabled={nextDisabled}
          loading={nextBusy}
          className="flex-1"
        >
          {nextLabel}
        </Button>
      </div>
    </>
  );
}
