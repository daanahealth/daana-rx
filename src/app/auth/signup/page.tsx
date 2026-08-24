'use client';

import { Suspense } from 'react';
import { SignUpScreen } from '@/features/auth/SignUpScreen';
import { AuthSpinner } from '@/features/auth/components/AuthFrame';

export default function SignUpPage() {
  return (
    <Suspense fallback={<AuthSpinner />}>
      <SignUpScreen />
    </Suspense>
  );
}
