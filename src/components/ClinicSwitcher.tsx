'use client';

import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Building2, ChevronDown, Loader2 } from 'lucide-react';
import { RootState } from '../store';
import { setAuth } from '../store/authSlice';
import { Clinic } from '../types';
import { auth as authApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export function ClinicSwitcher() {
  const dispatch = useDispatch();
  const { toast } = useToast();
  const { clinic, clinics } = useSelector((state: RootState) => state.auth);
  const [isSwitching, setIsSwitching] = useState(false);

  // If user only has one clinic, just show the clinic name without dropdown
  if (!clinics || clinics.length <= 1) {
    return (
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{clinic?.name || 'No Clinic'}</span>
      </div>
    );
  }

  const handleClinicSwitch = async (selectedClinic: Clinic) => {
    if (selectedClinic.clinicId === clinic?.clinicId) {
      return; // Already on this clinic
    }

    setIsSwitching(true);

    try {
      const data = await authApi.switchClinic(selectedClinic.clinicId);
      dispatch(setAuth({
        user: data.user,
        clinic: data.clinic,
        token: data.token,
        clinics: clinics,
      }));
      toast({ title: 'Success', description: `Switched to "${data.clinic.name}"` });
      window.location.reload();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to switch clinic',
        variant: 'destructive',
      });
      setIsSwitching(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={isSwitching}>
          {isSwitching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Building2 className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">{clinic?.name || 'Select Clinic'}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[250px]">
        <DropdownMenuLabel>Switch Clinic</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {clinics.map((c) => (
          <DropdownMenuItem
            key={c.clinicId}
            onClick={() => handleClinicSwitch(c)}
            disabled={c.clinicId === clinic?.clinicId || isSwitching}
            className={cn(
              'cursor-pointer',
              c.clinicId === clinic?.clinicId && 'bg-accent'
            )}
          >
            <Avatar className="mr-2 h-6 w-6">
              <AvatarImage src={c.logoUrl} alt={c.name} />
              <AvatarFallback style={{ backgroundColor: c.primaryColor || '#3b82f6' }}>
                {c.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{c.name}</span>
              {c.userRole && (
                <span className="text-xs text-muted-foreground">{c.userRole}</span>
              )}
            </div>
            {c.clinicId === clinic?.clinicId && (
              <span className="ml-auto text-xs text-primary">Active</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
