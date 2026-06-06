'use client';

import * as React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ItemStatus } from '@daana-health/inventory-core';

// Status colors per MVP spec "Status Chips":
//   active           -> green
//   in_cart          -> blue
//   pending_approval -> amber
//   checked_out      -> gray
//   removed          -> dark gray
//   expired          -> red with (!) indicator
const STATUS_STYLES: Record<ItemStatus, { label: string; classes: string; showAlert?: boolean }> = {
  active: {
    label: 'Active',
    classes: 'bg-success/10 text-success border-success/30',
  },
  in_cart: {
    label: 'In Cart',
    classes: 'bg-primary/10 text-primary border-primary/30',
  },
  pending_approval: {
    label: 'Pending Approval',
    classes: 'bg-warning/10 text-warning border-warning/30',
  },
  checked_out: {
    label: 'Checked Out',
    classes: 'bg-muted text-muted-foreground border-border',
  },
  removed: {
    label: 'Removed',
    classes: 'bg-foreground/10 text-foreground/70 border-foreground/20',
  },
  expired: {
    label: 'Expired',
    classes: 'bg-destructive/10 text-destructive border-destructive/30',
    showAlert: true,
  },
};

export interface StatusChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: ItemStatus;
}

export function StatusChip({ status, className, ...rest }: StatusChipProps) {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        style.classes,
        className,
      )}
      {...rest}
    >
      {style.showAlert ? <AlertCircle className="h-3 w-3" /> : null}
      {style.label}
    </span>
  );
}
