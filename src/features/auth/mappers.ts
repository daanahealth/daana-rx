/**
 * Auth — pure helpers: session-ended notices and the invitation shape.
 */
import { z } from 'zod';
import { validatePassword } from '@/lib/passwordRules';

export interface SessionNotice {
  title: string;
  message: string;
  tone: 'info' | 'error';
}

const CART_NOTE = 'Items in your cart are preserved for 24 hours.';

export function sessionNoticeFor(reason: string | null | undefined): SessionNotice | null {
  if (!reason) return null;
  const map: Record<string, SessionNotice> = {
    expired: {
      title: 'Your session ended due to inactivity.',
      message: `Sign in again. ${CART_NOTE}`,
      tone: 'info',
    },
    inactivity: {
      title: 'Your session ended due to inactivity.',
      message: `Sign in again. ${CART_NOTE}`,
      tone: 'info',
    },
    token_expired: {
      title: 'Session expired.',
      message: `Sign in again to continue. ${CART_NOTE}`,
      tone: 'info',
    },
    session_expired: {
      title: 'Session expired.',
      message: `Sign in again to continue. ${CART_NOTE}`,
      tone: 'info',
    },
    invalid_token: {
      title: 'Invalid session.',
      message: 'Your session is no longer valid. Sign in again.',
      tone: 'error',
    },
    logged_out: { title: 'You have been signed out.', message: CART_NOTE, tone: 'info' },
  };
  return (
    map[reason] ?? { title: 'Session ended.', message: `Sign in again. ${CART_NOTE}`, tone: 'info' }
  );
}

export interface InvitationView {
  email: string;
  clinicName: string;
  invitedBy: string;
  role: string;
}

export function normaliseInvitation(raw: unknown): InvitationView {
  const r = (raw ?? {}) as {
    email?: string;
    userRole?: string;
    clinic?: { name?: string };
    invitedByUser?: { username?: string };
  };
  return {
    email: r.email ?? '',
    clinicName: r.clinic?.name || 'the clinic',
    invitedBy: r.invitedByUser?.username || 'A superadmin',
    role: r.userRole ?? 'member',
  };
}

// ─── Zod schemas shared by the auth screens ──────────────────────────────────

export const emailSchema = z.string().trim().email('Enter a valid email address.');

export const newPasswordSchema = z
  .string()
  .refine((p) => validatePassword(p).ok, 'Meet every requirement below.');

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.'),
});

export const signUpSchema = z.object({
  clinicName: z.string().trim().min(1, 'Enter your clinic name.'),
  email: emailSchema,
  password: newPasswordSchema,
});

export const invitationSchema = z.object({ password: newPasswordSchema });

export const forgotSchema = z.object({ email: emailSchema });

export const resetSchema = z
  .object({ password: newPasswordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'Passwords do not match.',
  });
