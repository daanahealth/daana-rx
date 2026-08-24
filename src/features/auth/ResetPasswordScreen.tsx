'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { EmptyState, PasswordChecklist, PasswordField } from '@/components/composed';
import { errorMessage } from '@/hooks/use-async';
import { authApi } from './api';
import { resetSchema } from './mappers';
import { AuthFrame, AuthNotice } from './components/AuthFrame';

type Values = z.infer<typeof resetSchema>;

/**
 * Reset Password — step 2. Supabase exchanges the recovery token from the URL
 * hash for a session on load; we then update the password.
 */
export function ResetPasswordScreen() {
  const router = useRouter();
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [show, setShow] = React.useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirm: '' },
    mode: 'onBlur',
  });
  const password = useWatch({ control: form.control, name: 'password' });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const err = await authApi.updatePassword(values.password);
      if (err) {
        setError(err.message);
        return;
      }
      setDone(true);
      setTimeout(() => router.push('/auth/signin'), 1800);
    } catch (err) {
      setError(errorMessage(err, 'Failed to reset password.'));
    }
  });

  if (done) {
    return (
      <AuthFrame title="Password updated">
        <EmptyState
          icon={ShieldCheck}
          size="sm"
          title="Your password has been reset."
          description="Taking you to sign in…"
        />
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      title="Set a new password"
      description="Your new password must meet every requirement below."
      backToSignIn
    >
      {error ? (
        <AuthNotice tone="error" title="Could not update the password" message={error} />
      ) : null}
      <Form {...form}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <PasswordField
            control={form.control}
            name="password"
            label="New password"
            autoComplete="new-password"
            visible={show}
            onVisibleChange={setShow}
          />
          <PasswordField
            control={form.control}
            name="confirm"
            label="Confirm password"
            autoComplete="new-password"
            visible={show}
            onVisibleChange={setShow}
          />
          <PasswordChecklist password={password} />
          <Button
            type="submit"
            size="touch"
            className="w-full"
            loading={form.formState.isSubmitting}
          >
            Update password
          </Button>
        </form>
      </Form>
    </AuthFrame>
  );
}
