'use client';

// /checkout — composition only. The flow lives in features/checkout.

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { CheckoutScreen } from '@/features/checkout/CheckoutScreen';

export default function CheckOutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading" />
        </div>
      }
    >
      <AppShell>
        <CheckoutScreen />
      </AppShell>
    </Suspense>
  );
}
