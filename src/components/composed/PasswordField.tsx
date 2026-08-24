'use client';

import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { FieldValues } from 'react-hook-form';
import { TextField, type TextFieldProps } from './fields';

/**
 * PasswordField — a TextField with a show/hide toggle (44px target). Used by
 * sign-in, sign-up, reset and Settings › Account so the eye toggle is in one place.
 *
 *   <PasswordField control={form.control} name="password" label="Password"
 *     autoComplete="current-password" />
 */
export type PasswordFieldProps<TValues extends FieldValues> = Omit<
  TextFieldProps<TValues>,
  'type'
> & {
  /** Controlled visibility, for a "confirm" field that mirrors the first. */
  visible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
};

export function PasswordField<TValues extends FieldValues>({
  visible,
  onVisibleChange,
  className,
  ...props
}: PasswordFieldProps<TValues>) {
  const [internal, setInternal] = React.useState(false);
  const shown = visible ?? internal;
  const toggle = () => {
    const next = !shown;
    setInternal(next);
    onVisibleChange?.(next);
  };
  return (
    <div className={className ? `relative ${className}` : 'relative'}>
      <TextField {...props} type={shown ? 'text' : 'password'} className="[&_input]:pr-11" />
      <button
        type="button"
        onClick={toggle}
        aria-label={shown ? 'Hide password' : 'Show password'}
        aria-pressed={shown}
        className="absolute right-0 top-[18px] flex h-11 w-11 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {shown ? (
          <EyeOff className="h-4 w-4" aria-hidden />
        ) : (
          <Eye className="h-4 w-4" aria-hidden />
        )}
      </button>
    </div>
  );
}
