'use client';

import * as React from 'react';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EntityDrawer } from '@/components/composed';
import { cn } from '@/lib/utils';

/** Title + description + actions for one settings section (inside a tab). */
export function SectionHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn('flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}
    >
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="mt-0.5 max-w-[70ch] text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row [&>*]:w-full sm:[&>*]:w-auto">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

/** Quiet notice for an endpoint that is not live yet. Informational, not a status. */
export function Notice({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-sm border border-border bg-panel p-3 text-sm"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <div>
        <p className="font-medium text-foreground">{title}</p>
        {children ? <p className="mt-0.5 text-xs text-muted-foreground">{children}</p> : null}
      </div>
    </div>
  );
}

/** Replaces window.confirm for destructive actions: a dialog with a named action. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  busy = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  busy?: boolean;
}) {
  return (
    <EntityDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      desktop="dialog"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => void onConfirm()} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-subtle-foreground">{description}</p>
    </EntityDrawer>
  );
}

/** "Active" / "Deactivated" as text — not a status chip (outside the item/request vocabulary). */
export function ActiveText({ deactivatedAt }: { deactivatedAt: string | null }) {
  return deactivatedAt ? (
    <span className="text-muted-foreground">Deactivated</span>
  ) : (
    <span>Active</span>
  );
}
