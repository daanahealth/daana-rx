'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { EmptyState, TextField } from '@/components/composed';
import { errorMessage } from '@/hooks/use-async';
import { authApi } from './api';
import { forgotSchema } from './mappers';
import { AuthFrame, AuthNotice } from './components/AuthFrame';

type Values = z.infer<typeof forgotSchema>;

/**
 * Forgot Password — step 1. Always shows the same confirmation whether or not
 * the email exists (no account enumeration).
 */
export function ForgotPasswordScreen() {
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const err = await authApi.sendResetEmail(values.email);
      // Soft-fail: still show the generic confirmation; keep a debug note.
      if (err) console.warn('resetPasswordForEmail error:', err.message);
      setSentTo(values.email);
    } catch (err) {
      setError(errorMessage(err, 'Something went wrong. Please try again.'));
    }
  });

  if (sentTo) {
    return (
      <AuthFrame title="Check your email" backToSignIn>
        <EmptyState
          icon={MailCheck}
          size="sm"
          title={`If an account exists for ${sentTo}, we sent a reset link.`}
          description="The link is time-limited — open it on the same device when you are ready to set a new password."
        />
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      title="Forgot your password?"
      description="Enter the email for your DaanaRX account and we’ll send a reset link."
      backToSignIn
    >
      {error ? (
        <AuthNotice tone="error" title="Could not send the reset link" message={error} />
      ) : null}
      <Form {...form}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <TextField
            control={form.control}
            name="email"
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@clinic.org"
          />
          <Button
            type="submit"
            size="touch"
            className="w-full"
            loading={form.formState.isSubmitting}
          >
            Send reset link
          </Button>
        </form>
      </Form>
    </AuthFrame>
  );
}
