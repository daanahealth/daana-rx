'use client';

import { Suspense } from 'react';
import { ResetPasswordScreen } from '@/features/auth/ResetPasswordScreen';
import { AuthSpinner } from '@/features/auth/components/AuthFrame';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthSpinner />}>
      <ResetPasswordScreen />
    </Suspense>
  );
}
