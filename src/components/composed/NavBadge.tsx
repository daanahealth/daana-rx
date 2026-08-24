import { cn } from '@/lib/utils';

/**
 * NavBadge — a live count pill on a nav item or tab (pending requests,
 * cart items). Hidden when the count is 0; caps at 99+.
 *
 *   <NavBadge count={pending} label="pending requests" />
 */
export interface NavBadgeProps {
  count: number | null | undefined;
  /** Accessible description, e.g. "pending requests". */
  label: string;
  tone?: 'warn' | 'primary' | 'quiet';
  className?: string;
}

const TONES = {
  warn: 'bg-warn text-white',
  primary: 'bg-primary text-primary-foreground',
  quiet: 'bg-quiet-wash text-quiet',
} as const;

export function NavBadge({ count, label, tone = 'warn', className }: NavBadgeProps) {
  if (!count || count <= 0) return null;
  const text = count > 99 ? '99+' : String(count);
  return (
    <span
      aria-label={`${text} ${label}`}
      className={cn(
        'inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums leading-none',
        TONES[tone],
        className
      )}
    >
      {text}
    </span>
  );
}
