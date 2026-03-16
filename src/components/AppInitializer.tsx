'use client';

import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { setAuth } from '../store/authSlice';
import { auth as authApi } from '@/lib/api';
import { Progress } from '@/components/ui/progress';
import { Loader2, Package } from 'lucide-react';

interface AppInitializerProps {
  children: React.ReactNode;
}

export function AppInitializer({ children }: AppInitializerProps) {
  const dispatch = useDispatch();
  const { isAuthenticated, hasHydrated, user, clinic } = useSelector((state: RootState) => state.auth);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isInitialized || !hasHydrated) return;

    if (!isAuthenticated) {
      setIsInitialized(true);
      return;
    }

    const initializeApp = async () => {
      setLoadingProgress(20);
      setLoadingMessage('Loading your data...');
      try {
        setLoadingProgress(50);
        setLoadingMessage('Loading clinic information...');
        const clinics = await authApi.getClinics();
        setLoadingProgress(100);
        setLoadingMessage('Ready!');
        if (user && clinic) {
          dispatch(setAuth({ user, clinic, token: localStorage.getItem('token') || '', clinics }));
        }
        setTimeout(() => setIsInitialized(true), 300);
      } catch {
        setIsInitialized(true);
      }
    };

    initializeApp();
  }, [isAuthenticated, hasHydrated, isInitialized, user, clinic, dispatch]);

  if (isMounted && isAuthenticated && !isInitialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <Loader2 className="h-16 w-16 animate-spin text-white" />
            <Package className="absolute inset-0 m-auto h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">DaanaRX</h1>
          <div className="w-[300px] space-y-2">
            <Progress value={loadingProgress} className="h-2 bg-white/20" />
            <p className="text-center text-sm text-white">{loadingMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
