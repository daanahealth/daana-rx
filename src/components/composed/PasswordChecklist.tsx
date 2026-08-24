import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { evaluatePassword } from '@/lib/passwordRules';

/**
 * PasswordChecklist — the live list of MASS password rules (src/lib/passwordRules.ts)
 * under any "new password" field. Wording is the spec's, verbatim.
 *
 *   <PasswordChecklist password={form.watch('password')} />
 */
export interface PasswordChecklistProps {
  password: string;
  className?: string;
}

export function PasswordChecklist({ password, className }: PasswordChecklistProps) {
  const rules = evaluatePassword(password ?? '');
  return (
    <ul
      aria-label="Password requirements"
      className={cn(
        'flex flex-col gap-1 rounded-sm border border-border bg-panel p-3 text-sm',
        className
      )}
    >
      {rules.map((r) => (
        <li
          key={r.id}
          data-passed={r.passed}
          className={cn(
            'flex items-center gap-2',
            r.passed ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          {r.passed ? (
            <Check className="h-4 w-4 shrink-0 text-ok" aria-hidden />
          ) : (
            <Circle className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
          )}
          <span>{r.label}</span>
          <span className="sr-only">{r.passed ? ' — met' : ' — not met'}</span>
        </li>
      ))}
    </ul>
  );
}
