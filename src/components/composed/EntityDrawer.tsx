'use client';

import * as React from 'react';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

/**
 * EntityDrawer — one detail/edit surface for both breakpoints: a right-hand
 * sheet on desktop (`side="right"`, the default for entity details) or a
 * centred dialog (`desktop="dialog"`, for short confirmations), and a
 * bottom sheet on phones. Footer actions pin to the bottom and stretch
 * full-width on phones.
 *
 *   <EntityDrawer open={!!item} onOpenChange={close} title={item.name}
 *     description={<StatusChip status={item.status} />}
 *     footer={<><Button variant="outline">Cancel</Button><Button>Save</Button></>}>
 *     <KeyValueList items={…} />
 *   </EntityDrawer>
 */
export interface EntityDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  desktop?: 'sheet' | 'dialog';
  /** Width class for the desktop surface. */
  className?: string;
}

export function EntityDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  desktop = 'sheet',
  className,
}: EntityDrawerProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const footerNode = footer ? (
    <div className="mt-auto flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end [&>*]:w-full sm:[&>*]:w-auto">
      {footer}
    </div>
  ) : null;

  if (isDesktop && desktop === 'dialog') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={cn('flex max-h-[85vh] flex-col gap-4 sm:max-w-lg', className)}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? (
              <DialogDescription asChild={typeof description !== 'string'}>
                {typeof description === 'string' ? description : <div>{description}</div>}
              </DialogDescription>
            ) : null}
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
          {footerNode}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isDesktop ? 'right' : 'bottom'}
        className={cn(
          'flex flex-col gap-4',
          isDesktop ? 'w-full sm:max-w-xl' : 'max-h-[92vh] rounded-t-xl',
          className
        )}
      >
        <SheetHeader className="text-left">
          <SheetTitle>{title}</SheetTitle>
          {description ? (
            <SheetDescription asChild={typeof description !== 'string'}>
              {typeof description === 'string' ? description : <div>{description}</div>}
            </SheetDescription>
          ) : null}
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footerNode}
      </SheetContent>
    </Sheet>
  );
}
