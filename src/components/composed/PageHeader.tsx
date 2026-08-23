import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * PageHeader — the one Display-size title per page, plus an optional
 * one-line description, a meta slot (chips, counts) and right-aligned actions.
 *
 *   <PageHeader title="Inventory" description="Every unit on the shelf."
 *     actions={<Button>Check In</Button>} />
 *
 * On phones the actions wrap under the title and stretch full-width.
 */
export interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Small trailing content next to the title: a StatusChip, a count. */
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  /** Breadcrumb / back link rendered above the title. */
  eyebrow?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  meta,
  actions,
  eyebrow,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn('mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end', className)}>
      <div className="min-w-0 flex-1">
        {eyebrow ? <div className="mb-1 text-sm text-muted-foreground">{eyebrow}</div> : null}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {meta}
        </div>
        {description ? (
          <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center [&>*]:w-full sm:[&>*]:w-auto">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
