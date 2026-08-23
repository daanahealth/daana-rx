'use client';

import * as React from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * QuantityStepper — a bounded integer input with 44px −/+ targets, built for
 * one-handed phone use (request modal, cart quantities).
 *
 *   <QuantityStepper value={qty} onChange={setQty} min={1} max={available} />
 *
 * Typing is allowed; the value is clamped to [min, max] on blur and the
 * buttons disable at the bounds. `max` is the number of units dispensable
 * right now — never let it exceed that.
 */
export interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  /** Accessible name for the input. */
  label?: string;
  id?: string;
  className?: string;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = Number.MAX_SAFE_INTEGER,
  disabled = false,
  label = 'Quantity',
  id,
  className,
}: QuantityStepperProps) {
  const [draft, setDraft] = React.useState<string>(String(value));
  // Re-sync the text when the parent changes `value` (derived state from props).
  const [syncedValue, setSyncedValue] = React.useState(value);
  if (syncedValue !== value) {
    setSyncedValue(value);
    setDraft(String(value));
  }

  const commit = (raw: string) => {
    const parsed = Number.parseInt(raw, 10);
    const next = Number.isNaN(parsed) ? min : clamp(parsed, min, max);
    setDraft(String(next));
    if (next !== value) onChange(next);
  };

  const step = (delta: number) => {
    const next = clamp(value + delta, min, max);
    setDraft(String(next));
    if (next !== value) onChange(next);
  };

  const atMin = disabled || value <= min;
  const atMax = disabled || value >= max;

  return (
    <div
      className={cn(
        'inline-flex h-11 items-stretch overflow-hidden rounded-sm border border-border-strong bg-card',
        disabled && 'opacity-50',
        className
      )}
    >
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={atMin}
        aria-label="Decrease quantity"
        className="flex w-11 items-center justify-center text-subtle-foreground hover:bg-panel disabled:pointer-events-none disabled:text-muted-foreground/50"
      >
        <Minus className="h-4 w-4" aria-hidden />
      </button>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        role="spinbutton"
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ''))}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            step(1);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            step(-1);
          } else if (e.key === 'Enter') {
            commit((e.target as HTMLInputElement).value);
          }
        }}
        className="w-14 border-x border-border-strong bg-transparent text-center text-base font-medium tabular-nums text-foreground focus:outline-none focus-visible:bg-accent"
      />
      <button
        type="button"
        onClick={() => step(1)}
        disabled={atMax}
        aria-label="Increase quantity"
        className="flex w-11 items-center justify-center text-subtle-foreground hover:bg-panel disabled:pointer-events-none disabled:text-muted-foreground/50"
      >
        <Plus className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
