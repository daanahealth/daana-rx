'use client';

import { Suspense } from 'react';
import { SignInScreen } from '@/features/auth/SignInScreen';
import { AuthSpinner } from '@/features/auth/components/AuthFrame';

export default function SignInPage() {
  return (
    <Suspense fallback={<AuthSpinner />}>
      <SignInScreen />
    </Suspense>
  );
}
