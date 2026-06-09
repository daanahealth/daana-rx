'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { setAuth } from '../../../store/authSlice';
import { auth } from '@/lib/api';
import { API_BASE } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

interface ExpirationInfo {
  title: string;
  message: string;
  tone: 'info' | 'warn' | 'error';
}

function getExpirationInfo(reason: string | null): ExpirationInfo | null {
  if (!reason) return null;
  const cartNote = 'Items in your cart are preserved for 24 hours.';
  const map: Record<string, ExpirationInfo> = {
    expired: {
      title: 'Your session has ended due to inactivity.',
      message: `Please sign in again. ${cartNote}`,
      tone: 'info',
    },
    inactivity: {
      title: 'Your session has ended due to inactivity.',
      message: `Please sign in again. ${cartNote}`,
      tone: 'info',
    },
    token_expired: {
      title: 'Session expired.',
      message: `Please sign in again to continue. ${cartNote}`,
      tone: 'info',
    },
    invalid_token: {
      title: 'Invalid session.',
      message: 'Your session is no longer valid. Please sign in again.',
      tone: 'error',
    },
    session_expired: {
      title: 'Session expired.',
      message: `Please sign in again to continue. ${cartNote}`,
      tone: 'info',
    },
    logged_out: {
      title: 'You have been signed out.',
      message: cartNote,
      tone: 'info',
    },
  };
  return (
    map[reason] ?? {
      title: 'Session ended.',
      message: `Please sign in again. ${cartNote}`,
      tone: 'info',
    }
  );
}

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
          Donated medication, accounted for.
        </p>
      </div>
    </div>
  );
}

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [expirationAlert, setExpirationAlert] = useState<ExpirationInfo | null>(null);

  // Warm the backend fleet in parallel the moment the sign-in screen mounts.
  // Render free-tier services spin down after ~15 min idle; without this the
  // post-login fan-out wakes them one-by-one and the app appears to hang on
  // "Loading clinic information…". Fire-and-forget — never blocks the UI.
  useEffect(() => {
    fetch(`${API_BASE}/warmup`).catch(() => {});
  }, []);

  useEffect(() => {
    const reason = searchParams?.get('reason');
    const timeout = searchParams?.get('timeout');
    if (reason) {
      setExpirationAlert(getExpirationInfo(reason));
      if (typeof window !== 'undefined') localStorage.removeItem('logoutReason');
    } else if (timeout === 'true') {
      setExpirationAlert(getExpirationInfo('inactivity'));
      if (typeof window !== 'undefined') localStorage.removeItem('logoutReason');
    } else if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('logoutReason');
      if (stored) {
        setExpirationAlert(getExpirationInfo(stored));
        localStorage.removeItem('logoutReason');
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await auth.signIn(email, password);
      setIsRedirecting(true);
      dispatch(setAuth({ user: data.user, clinic: data.clinic, token: data.token }));
      toast({ title: 'Welcome back', description: 'Signed in successfully.' });
      setTimeout(() => router.push('/'), 100);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Incorrect email or password';
      toast({
        title: 'Sign-in failed',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toneClasses: Record<ExpirationInfo['tone'], string> = {
    info: 'border-teal-200/60 bg-teal-50/80 text-teal-900 dark:border-teal-500/30 dark:bg-teal-900/30 dark:text-teal-100',
    warn: 'border-amber-200/60 bg-amber-50/80 text-amber-900 dark:border-amber-500/30 dark:bg-amber-900/30 dark:text-amber-100',
    error:
      'border-rose-200/60 bg-rose-50/80 text-rose-900 dark:border-rose-500/30 dark:bg-rose-900/30 dark:text-rose-100',
  };

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-teal-50 to-slate-100 px-4 py-12 font-sans antialiased dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
      style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}
    >
      {/* ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-teal-300/30 blur-3xl dark:bg-teal-500/20"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-teal-200/30 blur-3xl dark:bg-teal-700/10"
      />

      <div className="relative w-full max-w-md space-y-8">
        <DaanaLogo />

        {/* Glass panel */}
        <section
          aria-labelledby="signin-title"
          className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/60 sm:p-8"
        >
          <header className="mb-6 space-y-1">
            <h2
              id="signin-title"
              className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50"
            >
              Sign in
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Enter your DaanaRX credentials to continue.
            </p>
          </header>

          {expirationAlert && (
            <div
              role="status"
              aria-live="polite"
              className={`mb-5 rounded-xl border px-4 py-3 text-sm ${toneClasses[expirationAlert.tone]}`}
            >
              <div className="font-medium">{expirationAlert.title}</div>
              <div className="mt-0.5 text-xs opacity-90">
                {expirationAlert.message}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-700 dark:text-slate-200">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@clinic.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || isRedirecting}
                required
                className="h-11 border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400 focus-visible:ring-teal-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-slate-700 dark:text-slate-200"
              >
                Password
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || isRedirecting}
                required
                className="h-11 border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400 focus-visible:ring-teal-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100"
              />
            </div>

            <Button
              type="submit"
              disabled={loading || isRedirecting}
              className="h-11 w-full bg-teal-600 text-base font-medium text-white shadow-md shadow-teal-600/20 transition-colors hover:bg-teal-700 focus-visible:ring-teal-500 disabled:opacity-60"
            >
              {loading || isRedirecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isRedirecting ? 'Redirecting…' : 'Signing in…'}
                </>
              ) : (
                'Sign In'
              )}
            </Button>

            <div className="pt-1 text-center">
              <Link
                href="/auth/forgot-password"
                className="text-sm font-medium text-teal-700 hover:text-teal-800 hover:underline dark:text-teal-300 dark:hover:text-teal-200"
              >
                Forgot password?
              </Link>
            </div>
          </form>
        </section>

        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          HIPAA-aware medication tracking for non-profit clinics.
        </p>
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
