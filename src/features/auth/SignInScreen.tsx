'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { setAuth } from '@/store/authSlice';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { PasswordField, TextField } from '@/components/composed';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/hooks/use-async';
import { authApi } from './api';
import { useSessionNotice, useWarmup } from './hooks';
import { signInSchema } from './mappers';
import { AuthFrame, AuthNotice } from './components/AuthFrame';

type Values = z.infer<typeof signInSchema>;

export function SignInScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { toast } = useToast();
  const notice = useSessionNotice();
  useWarmup();

  const form = useForm<Values>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });
  const busy = form.formState.isSubmitting || form.formState.isSubmitSuccessful;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const data = await authApi.signIn(values.email, values.password);
      dispatch(setAuth({ user: data.user, clinic: data.clinic, token: data.token }));
      toast({ title: 'Welcome back', description: 'Signed in successfully.' });
      setTimeout(() => router.push('/'), 100);
    } catch (err) {
      toast({
        title: 'Sign-in failed',
        description: errorMessage(err, 'Incorrect email or password'),
        variant: 'destructive',
      });
      throw err; // keep isSubmitSuccessful false so the button re-enables
    }
  });

  return (
    <AuthFrame
      title="Sign in"
      description="Enter your DaanaRX credentials to continue."
      footer="Unit-level medication tracking for free clinics."
    >
      {notice ? (
        <AuthNotice title={notice.title} message={notice.message} tone={notice.tone} />
      ) : null}
      <Form {...form}>
        <form
          onSubmit={(e) => void onSubmit(e).catch(() => {})}
          className="flex flex-col gap-4"
          noValidate
        >
          <TextField
            control={form.control}
            name="email"
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@clinic.org"
            disabled={busy}
          />
          <PasswordField
            control={form.control}
            name="password"
            label="Password"
            autoComplete="current-password"
            disabled={busy}
          />
          <Button type="submit" size="touch" className="w-full" loading={busy}>
            {form.formState.isSubmitSuccessful ? 'Redirecting…' : 'Sign In'}
          </Button>
          <div className="text-center">
            <Link
              href="/auth/forgot-password"
              className="inline-flex min-h-[44px] items-center text-sm font-medium text-primary-ink hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </form>
      </Form>
    </AuthFrame>
  );
}
