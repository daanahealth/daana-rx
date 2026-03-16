'use client';

import { useEffect } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { store } from '../store';
import { restoreAuth } from '../store/authSlice';
import { restoreCart } from '../store/cartSlice';
import { FeedbackButton } from './FeedbackButton';
import { Toaster } from '@/components/ui/toaster';

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(restoreAuth());
    dispatch(restoreCart());
  }, [dispatch]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <AuthInitializer>
        {children}
      </AuthInitializer>
      <FeedbackButton />
      <Toaster />
    </Provider>
  );
}
