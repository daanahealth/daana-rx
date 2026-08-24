'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { MailX } from 'lucide-react';
import { setAuth } from '@/store/authSlice';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import {
  EmptyState,
  KeyValueList,
  PasswordChecklist,
  PasswordField,
  TextField,
} from '@/components/composed';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/hooks/use-async';
import { authApi } from './api';
import { useInvitation } from './hooks';
import { invitationSchema, signUpSchema } from './mappers';
import { AuthFrame, AuthSpinner } from './components/AuthFrame';

export function SignUpScreen() {
  const token = useSearchParams().get('invitation');
  return token ? <AcceptInvitation token={token} /> : <RegularSignUp />;
}

type InviteValues = z.infer<typeof invitationSchema>;

function AcceptInvitation({ token }: { token: string }) {
  const router = useRouter();
  const dispatch = useDispatch();
  const { toast } = useToast();
  const invitation = useInvitation(token);
  const form = useForm<InviteValues>({
    resolver: zodResolver(invitationSchema),
    defaultValues: { password: '' },
  });
  const password = useWatch({ control: form.control, name: 'password' });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const data = await authApi.acceptInvitation(token, values.password);
      dispatch(setAuth({ user: data.user, clinic: data.clinic, token: data.token }));
      toast({ title: 'Welcome to DaanaRX' });
      router.push('/');
    } catch (err) {
      toast({
        title: 'Could not accept invitation',
        description: errorMessage(err),
        variant: 'destructive',
      });
    }
  });

  if (invitation.loading) return <AuthSpinner />;

  if (invitation.error || !invitation.data) {
    return (
      <AuthFrame title="Invitation not found">
        <EmptyState
          icon={MailX}
          title="This invitation link is invalid or has expired."
          description="Ask your administrator for a new invitation."
          action={
            <Button asChild variant="outline">
              <Link href="/auth/signin">Go to sign in</Link>
            </Button>
          }
        />
      </AuthFrame>
    );
  }

  const inv = invitation.data;
  return (
    <AuthFrame
      title="You’ve been invited"
      description={`${inv.invitedBy} invited you to join ${inv.clinicName} as ${inv.role}.`}
      footer="By signing up you agree to join the clinic and follow its policies."
    >
      <KeyValueList
        className="mb-5"
        items={[
          { label: 'Clinic', value: inv.clinicName },
          { label: 'Email', value: inv.email },
        ]}
      />
      <Form {...form}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <PasswordField
            control={form.control}
            name="password"
            label="Create password"
            autoComplete="new-password"
          />
          <PasswordChecklist password={password} />
          <Button
            type="submit"
            size="touch"
            className="w-full"
            loading={form.formState.isSubmitting}
          >
            Complete sign up
          </Button>
        </form>
      </Form>
    </AuthFrame>
  );
}

type SignUpValues = z.infer<typeof signUpSchema>;

function RegularSignUp() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { toast } = useToast();
  const [emailExists, setEmailExists] = React.useState(false);
  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { clinicName: '', email: '', password: '' },
  });
  const password = useWatch({ control: form.control, name: 'password' });

  const checkEmail = async () => {
    const email = form.getValues('email');
    if (!email || !email.includes('@')) return;
    try {
      const result = await authApi.checkEmail(email);
      setEmailExists(result.exists);
      if (result.exists) {
        form.setError('email', {
          message: 'An account with this email already exists — sign in instead.',
        });
      }
    } catch {}
  };

  const onSubmit = form.handleSubmit(async (values) => {
    if (emailExists) {
      router.push('/auth/signin');
      return;
    }
    try {
      const data = await authApi.signUp(values.email, values.password, values.clinicName);
      dispatch(setAuth({ user: data.user, clinic: data.clinic, token: data.token }));
      toast({ title: 'Account created' });
      router.push('/');
    } catch (err) {
      toast({
        title: 'Could not create account',
        description: errorMessage(err),
        variant: 'destructive',
      });
    }
  });

  return (
    <AuthFrame
      title="Create your clinic account"
      description="Start tracking medications at the unit level."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/auth/signin" className="font-medium text-primary-ink hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <Form {...form}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <TextField
            control={form.control}
            name="clinicName"
            label="Clinic name"
            placeholder="Your clinic name"
          />
          <TextField
            control={form.control}
            name="email"
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@clinic.org"
            onBlur={() => void checkEmail()}
            onChange={(e) => {
              form.setValue('email', e.target.value);
              if (emailExists) {
                setEmailExists(false);
                form.clearErrors('email');
              }
            }}
          />
          <PasswordField
            control={form.control}
            name="password"
            label="Password"
            autoComplete="new-password"
          />
          <PasswordChecklist password={password} />
          <Button
            type="submit"
            size="touch"
            className="w-full"
            loading={form.formState.isSubmitting}
          >
            {emailExists ? 'Go to sign in' : 'Create account'}
          </Button>
        </form>
      </Form>
    </AuthFrame>
  );
}
