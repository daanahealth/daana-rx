import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * ReportSection — one report on the dashboard: an anchored card with a
 * Title-size heading, one-line description and optional header actions
 * (window toggles, export). The dashboard cards deep-link to `#id`.
 */
export interface ReportSectionProps {
  id: string;
  icon?: React.ComponentType<{ className?: string }>;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function ReportSection({
  id,
  icon: Icon,
  title,
  description,
  actions,
  children,
  className,
}: ReportSectionProps) {
  const titleId = `${id}-title`;
  return (
    <section id={id} aria-labelledby={titleId} className={cn('scroll-mt-24', className)}>
      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              {Icon ? (
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              ) : null}
              <h2 id={titleId} className="text-base font-semibold leading-snug">
                {title}
              </h2>
            </CardTitle>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
          ) : null}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </section>
  );
}
