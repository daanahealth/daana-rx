'use client';

import { useState, useMemo, Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  CheckCircle2,
  Circle,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import {
  evaluatePassword,
  validatePassword,
} from '@/lib/passwordRules';

/**
 * Reset Password — Step 2.
 *
 * Per MVP spec → Authentication → Forgot Password:
 *   "The user sets a new password and must confirm it in a second field.
 *    The new password must meet the rules above."
 *
 * Supabase auto-authenticates the user when they land on this page via the
 * recovery link (the browser SDK exchanges the token from the URL hash for
 * a session). We then call `supabase.auth.updateUser({ password })`.
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
          Choose a new password
        </p>
      </div>
    </div>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Supabase parses the recovery token from the URL hash automatically on
  // load. We just need to be mounted as a client component.
  useEffect(() => {
    // no-op: presence of this effect documents the recovery-flow contract.
  }, []);

  const ruleState = useMemo(() => evaluatePassword(password), [password]);
  const passwordOk = useMemo(() => validatePassword(password).ok, [password]);
  const passwordsMatch = password.length > 0 && password === confirm;
  const canSubmit = passwordOk && passwordsMatch && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const result = validatePassword(password);
    if (!result.ok) {
      setErrorMessage('Password does not meet the requirements below.');
      return;
    }
    if (password !== confirm) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setErrorMessage(error.message);
        return;
      }
      setDone(true);
      setTimeout(() => router.push('/auth/signin'), 1800);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to reset password.',
      );
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
          aria-labelledby="reset-title"
          className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/60 sm:p-8"
        >
          {done ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-200">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h2
                id="reset-title"
                className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50"
              >
                Password updated
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Your password has been reset. Redirecting you to sign in…
              </p>
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-teal-600" />
            </div>
          ) : (
            <>
              <header className="mb-6 space-y-1">
                <h2
                  id="reset-title"
                  className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50"
                >
                  Set a new password
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Your new password must meet the requirements below.
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
                    htmlFor="new-password"
                    className="text-slate-700 dark:text-slate-200"
                  >
                    New password
                  </Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="At least 10 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                    required
                    className="h-11 border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400 focus-visible:ring-teal-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="confirm-password"
                    className="text-slate-700 dark:text-slate-200"
                  >
                    Confirm password
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Re-enter password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    disabled={submitting}
                    required
                    aria-invalid={confirm.length > 0 && !passwordsMatch}
                    className="h-11 border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400 focus-visible:ring-teal-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100"
                  />
                  {confirm.length > 0 && !passwordsMatch && (
                    <p className="text-xs text-rose-600 dark:text-rose-400">
                      Passwords do not match.
                    </p>
                  )}
                </div>

                {/* Live checklist */}
                <fieldset
                  aria-label="Password requirements"
                  className="rounded-xl border border-slate-200/70 bg-white/60 p-3 dark:border-slate-700/60 dark:bg-slate-900/40"
                >
                  <legend className="px-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Requirements
                  </legend>
                  <ul className="mt-1 space-y-1.5">
                    {ruleState.map((r) => (
                      <li
                        key={r.id}
                        className={`flex items-center gap-2 text-sm transition-colors ${
                          r.passed
                            ? 'text-teal-700 dark:text-teal-300'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {r.passed ? (
                          <CheckCircle2 className="h-4 w-4 flex-none" />
                        ) : (
                          <Circle className="h-4 w-4 flex-none opacity-60" />
                        )}
                        <span>{r.label}</span>
                      </li>
                    ))}
                  </ul>
                </fieldset>

                <Button
                  type="submit"
                  disabled={!canSubmit}
                  className="h-11 w-full bg-teal-600 text-base font-medium text-white shadow-md shadow-teal-600/20 transition-colors hover:bg-teal-700 focus-visible:ring-teal-500 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating password…
                    </>
                  ) : (
                    'Update password'
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
