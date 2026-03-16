'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { setAuth } from '../../../store/authSlice';
import { auth } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Loader2, Package } from 'lucide-react';
import Link from 'next/link';

interface ExpirationInfo {
  title: string;
  message: string;
  variant: 'default' | 'destructive';
}

function getExpirationInfo(reason: string | null): ExpirationInfo | null {
  if (!reason) return null;
  const map: Record<string, ExpirationInfo> = {
    inactivity: { title: 'Session Expired Due to Inactivity', message: 'You were automatically logged out after 2 hours of inactivity for security reasons. Please sign in again to continue.', variant: 'default' },
    token_expired: { title: 'Session Expired', message: 'Your session has expired after 2 hours for security reasons. Please sign in again to continue.', variant: 'default' },
    invalid_token: { title: 'Invalid Session', message: 'Your session is no longer valid. This may have occurred due to signing in on another device. Please sign in again.', variant: 'destructive' },
    session_expired: { title: 'Session Expired', message: 'Your session has ended for security reasons. Please sign in again to continue.', variant: 'default' },
    logged_out: { title: 'Logged Out', message: 'You have been successfully logged out.', variant: 'default' },
  };
  return map[reason] || { title: 'Session Ended', message: 'Your session has ended. Please sign in again to continue.', variant: 'default' };
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
      toast({ title: 'Success', description: 'Signed in successfully' });
      setTimeout(() => router.push('/'), 100);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Incorrect email or password', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-12 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="rounded-full bg-primary p-3"><Package className="h-8 w-8 text-primary-foreground" /></div>
          <h1 className="text-3xl font-bold tracking-tight">DaanaRX</h1>
          <p className="text-muted-foreground">Medication Tracking System</p>
        </div>

        <Card className="border-2 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            {expirationAlert && (
              <Alert variant={expirationAlert.variant} className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{expirationAlert.title}</AlertTitle>
                <AlertDescription>{expirationAlert.message}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading || isRedirecting} required className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading || isRedirecting} required className="h-11" />
              </div>
              <Button type="submit" className="w-full h-11 text-base" disabled={loading || isRedirecting}>
                {loading || isRedirecting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isRedirecting ? 'Redirecting...' : 'Signing in...'}</>
                ) : 'Sign In'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/auth/signup" className="font-medium text-primary hover:underline">Sign up</Link>
            </div>
          </CardFooter>
        </Card>

        <p className="text-center text-xs text-muted-foreground">HIPAA-compliant medication tracking for non-profit clinics</p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <SignInContent />
    </Suspense>
  );
}
