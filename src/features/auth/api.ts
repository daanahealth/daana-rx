/**
 * Auth — the only file in this feature that knows a URL. Sign-in/up go through
 * the gateway (src/lib/api.ts › auth); password reset uses Supabase directly
 * (the one place the browser touches Supabase).
 */
import { auth } from '@/lib/api';
import { API_BASE } from '@/lib/apiClient';
import { createClient } from '@/lib/supabase/client';

export const authApi = {
  signIn: (email: string, password: string) => auth.signIn(email, password),
  signUp: (email: string, password: string, clinicName: string) =>
    auth.signUp(email, password, clinicName),
  checkEmail: (email: string) => auth.checkEmail(email),
  getInvitation: (token: string) => auth.getInvitationByToken(token),
  acceptInvitation: (token: string, password: string) => auth.acceptInvitation(token, password),
  /**
   * Warm the free-tier fleet the moment the sign-in screen mounts so the
   * post-login fan-out does not wake services one by one. Fire-and-forget.
   */
  warmup: () => fetch(`${API_BASE}/warmup`).catch(() => {}),
  sendResetEmail: async (email: string) => {
    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}/auth/reset-password` : undefined;
    const { error } = await createClient().auth.resetPasswordForEmail(email, { redirectTo });
    return error;
  },
  updatePassword: async (password: string) => {
    const { error } = await createClient().auth.updateUser({ password });
    return error;
  },
};
