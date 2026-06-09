'use client';

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Eye, EyeOff, Loader2, ShieldCheck, Users as UsersIcon, Check, X, AlertTriangle } from 'lucide-react';
import { RootState } from '../../store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { evaluatePassword, validatePassword } from '@/lib/passwordRules';

interface AccountPanelProps {
  /** Switch the parent Settings page to the Users tab. */
  onJumpToUsers?: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    try {
      const token = localStorage.getItem('authToken');
      if (token) h['Authorization'] = `Bearer ${token}`;
      const clinic = localStorage.getItem('clinic');
      if (clinic) {
        const parsed = JSON.parse(clinic);
        if (parsed?.clinicId) h['x-clinic-id'] = parsed.clinicId;
      }
    } catch {}
  }
  return h;
}

export function AccountPanel({ onJumpToUsers }: AccountPanelProps) {
  const { toast } = useToast();
  const user = useSelector((s: RootState) => s.auth.user);
  const isSuperadmin = user?.userRole === 'superadmin';

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [saving, setSaving] = useState(false);

  const ruleStatus = evaluatePassword(next);
  const matches = next.length > 0 && next === confirm;

  async function handleChangePassword() {
    const validation = validatePassword(next);
    if (!validation.ok) {
      toast({
        title: 'Password does not meet requirements',
        description: validation.failures.join(' · '),
        variant: 'destructive',
      });
      return;
    }
    if (next !== confirm) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (!current) {
      toast({ title: 'Current password required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/auth/account/password`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      if (res.status === 404) {
        toast({
          title: 'Endpoint pending',
          description: 'Password change API isn’t live yet. Your password was not updated.',
        });
      } else if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      } else {
        toast({ title: 'Password updated', description: 'Use your new password the next time you sign in.' });
        setCurrent('');
        setNext('');
        setConfirm('');
      }
    } catch (err: any) {
      toast({ title: 'Update failed', description: err?.message ?? 'Unknown error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Role view */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Your account</CardTitle>
          <CardDescription>Manage your password and view your assigned role.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <p className="font-medium">{user?.email ?? user?.username ?? '—'}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Role</Label>
              <div>
                <Badge variant={isSuperadmin ? 'default' : 'outline'}>
                  {isSuperadmin ? 'Superadmin' : 'Restricted User'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Change password</CardTitle>
          <CardDescription>Must satisfy every requirement below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pw-current">Current password</Label>
            <div className="relative">
              <Input
                id="pw-current"
                type={showCurrent ? 'text' : 'password'}
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowCurrent((v) => !v)}
                aria-label={showCurrent ? 'Hide password' : 'Show password'}
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw-new">New password</Label>
            <div className="relative">
              <Input
                id="pw-new"
                type={showNext ? 'text' : 'password'}
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowNext((v) => !v)}
                aria-label={showNext ? 'Hide password' : 'Show password'}
              >
                {showNext ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw-confirm">Confirm new password</Label>
            <Input
              id="pw-confirm"
              type={showNext ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            {confirm.length > 0 && !matches && (
              <p className="text-xs text-destructive">Passwords do not match.</p>
            )}
          </div>

          <div className="rounded-md border p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Requirements</p>
            <ul className="space-y-1 text-sm">
              {ruleStatus.map((r) => (
                <li key={r.id} className="flex items-center gap-2">
                  {r.passed ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={r.passed ? 'text-foreground' : 'text-muted-foreground'}>{r.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <Button
            onClick={handleChangePassword}
            disabled={saving || !next || !confirm || ruleStatus.some((r) => !r.passed) || !matches}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update password
          </Button>
        </CardContent>
      </Card>

      {/* Superadmin-only quick links */}
      {isSuperadmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Superadmin actions</CardTitle>
            <CardDescription>Manage other users from the Users tab.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" onClick={onJumpToUsers}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              Add another user as superadmin
            </Button>
            <Button variant="outline" onClick={onJumpToUsers}>
              <UsersIcon className="mr-2 h-4 w-4" />
              Manage users
            </Button>
          </CardContent>
        </Card>
      )}

      {!isSuperadmin && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            User and location management is restricted to superadmins. Ask an upstairs staff member if you need elevated access.
          </p>
        </div>
      )}

    </div>
  );
}
