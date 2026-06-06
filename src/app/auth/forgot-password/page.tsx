'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, MailCheck } from 'lucide-react';

/**
 * Forgot Password — Step 1.
 *
 * Per MVP spec → Authentication → Forgot Password:
 *   "Selecting Forgot Password on the login page triggers a reset email to
 *    the registered address. The email contains a secure, time-limited
 *    reset link."
 *
 * We always show the same confirmation, regardless of whether the email
 * exists, to avoid account enumeration.
 */

function DaanaLogo() {
  return (
    <div className="flex flex-col items-center space-y-3">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 shadow-lg shadow-teal-500/30">
        <span className="font-serif text-2xl font-bold text-white">D</span>
      </div>
      <div className="text-center">
        <h1 className="font-sans text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          DaanaRX
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Reset your password
        </p>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const supabase = createClient();
      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/auth/reset-password`
          : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error) {
        // Soft-fail: still show generic confirmation to avoid enumeration,
        // but surface a non-blocking note for debug.
        console.warn('resetPasswordForEmail error:', error.message);
      }
      setSubmitted(true);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-teal-50 to-slate-100 px-4 py-12 font-sans antialiased dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
      style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-teal-300/30 blur-3xl dark:bg-teal-500/20"
      />

      <div className="relative w-full max-w-md space-y-8">
        <DaanaLogo />

        <section
          aria-labelledby="forgot-title"
          className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/60 sm:p-8"
        >
          {submitted ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-200">
                <MailCheck className="h-6 w-6" />
              </div>
              <h2
                id="forgot-title"
                className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50"
              >
                Check your email
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                If an account exists for{' '}
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {email}
                </span>
                , we&apos;ve sent a reset link. The link is time-limited — open
                it on the same device when you&apos;re ready to set a new
                password.
              </p>
              <div className="pt-2">
                <Link
                  href="/auth/signin"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-800 hover:underline dark:text-teal-300"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign in
                </Link>
              </div>
            </div>
          ) : (
            <>
              <header className="mb-6 space-y-1">
                <h2
                  id="forgot-title"
                  className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50"
                >
                  Forgot your password?
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Enter the email associated with your DaanaRX account and
                  we&apos;ll send you a reset link.
                </p>
              </header>

              {errorMessage && (
                <div
                  role="alert"
                  className="mb-5 rounded-xl border border-rose-200/60 bg-rose-50/80 px-4 py-3 text-sm text-rose-900 dark:border-rose-500/30 dark:bg-rose-900/30 dark:text-rose-100"
                >
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="email"
                    className="text-slate-700 dark:text-slate-200"
                  >
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@clinic.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                    required
                    className="h-11 border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400 focus-visible:ring-teal-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting || !email}
                  className="h-11 w-full bg-teal-600 text-base font-medium text-white shadow-md shadow-teal-600/20 transition-colors hover:bg-teal-700 focus-visible:ring-teal-500 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending reset link…
                    </>
                  ) : (
                    'Send reset link'
                  )}
                </Button>

                <div className="pt-1 text-center">
                  <Link
                    href="/auth/signin"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-800 hover:underline dark:text-teal-300"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to sign in
                  </Link>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
