import * as React from 'react';
import { cn } from '@/lib/utils';
import { formatDate, formatDateTime, expiryTone, expiryHint, toISODate } from '@/lib/format';

/**
 * DateText — every date in the UI renders through this (MM/DD/YYYY).
 *
 *   <DateText value={item.expiryDate} />                 // 03/07/2027
 *   <DateText value={item.expiryDate} expiry />          // + urgency dot and "in 12 d"
 *   <DateText value={tx.createdAt} withTime />           // 03/07/2027, 2:15 PM
 *
 * `expiry` applies the Expiry Rule (DESIGN.md): neutral, warn ≤30d, danger past.
 * Colour is never the only signal — the literal date is always shown.
 */
export interface DateTextProps extends React.HTMLAttributes<HTMLElement> {
  value: string | number | Date | null | undefined;
  withTime?: boolean;
  expiry?: boolean;
  /** Hide the "in 12 d" / "expired" suffix (keep the dot). */
  noHint?: boolean;
}

const TONE_TEXT = {
  expired: 'text-danger',
  soon: 'text-warn',
  ok: 'text-foreground',
  unknown: 'text-muted-foreground',
} as const;

const TONE_DOT = {
  expired: 'bg-danger',
  soon: 'bg-warn',
  ok: 'bg-ok',
  unknown: 'bg-quiet',
} as const;

export function DateText({
  value,
  withTime = false,
  expiry = false,
  noHint = false,
  className,
  ...rest
}: DateTextProps) {
  const text = withTime ? formatDateTime(value) : formatDate(value);
  const iso = toISODate(value);

  if (!expiry) {
    return (
      <time dateTime={iso || undefined} className={cn('tabular-nums', className)} {...rest}>
        {text}
      </time>
    );
  }

  const tone = expiryTone(value);
  const hint = noHint ? null : expiryHint(value);

  return (
    <time
      dateTime={iso || undefined}
      data-expiry={tone}
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap tabular-nums',
        TONE_TEXT[tone],
        tone === 'expired' && 'font-medium',
        className
      )}
      {...rest}
    >
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', TONE_DOT[tone])} aria-hidden />
      <span>{text}</span>
      {hint ? <span className="text-xs font-normal text-muted-foreground">{hint}</span> : null}
    </time>
  );
}
