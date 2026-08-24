import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/**
 * The frame every auth page shares: brand mark, one card, one footer line.
 * Flat by design — no gradient, blur or shadow (DESIGN.md). Operate-mode copy.
 */
export function AuthFrame({
  title,
  description,
  children,
  backToSignIn = false,
  footer,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  backToSignIn?: boolean;
  footer?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="flex items-center justify-center gap-2.5">
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary text-base font-semibold text-primary-foreground"
          >
            D
          </span>
          <span className="text-lg font-semibold tracking-tight text-foreground">DaanaRX</span>
        </div>
        <section
          aria-labelledby="auth-title"
          className="rounded-lg border border-border bg-card p-5 sm:p-6"
        >
          <h1 id="auth-title" className="text-xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          <div className="mt-5">{children}</div>
          {backToSignIn ? (
            <div className="mt-5 text-center">
              <Link
                href="/auth/signin"
                className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-primary-ink hover:underline"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden /> Back to sign in
              </Link>
            </div>
          ) : null}
        </section>
        {footer ? <p className="text-center text-xs text-muted-foreground">{footer}</p> : null}
      </div>
    </main>
  );
}

/** Inline notice inside an auth card (session ended, request failed). */
export function AuthNotice({
  title,
  message,
  tone = 'info',
}: {
  title: string;
  message?: string;
  tone?: 'info' | 'error';
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live="polite"
      className="mb-4 rounded-sm border border-border bg-panel px-3 py-2.5 text-sm"
    >
      <p className={tone === 'error' ? 'font-medium text-danger' : 'font-medium text-foreground'}>
        {title}
      </p>
      {message ? <p className="mt-0.5 text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}

export function AuthSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background" aria-busy>
      <span
        className="h-6 w-6 animate-spin rounded-full border-2 border-border-strong border-t-primary"
        aria-label="Loading"
      />
    </div>
  );
}
