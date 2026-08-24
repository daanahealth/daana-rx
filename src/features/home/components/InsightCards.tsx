'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowRight, Boxes, History, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCount } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Insight, InsightId } from '../hooks';

/**
 * "At a glance" — four flat cards fed by the Reports endpoints. Counts are
 * tabular; each card links to its section of Reports. Colour is not used to
 * rank the cards (status tones are reserved for chips and expiry cells).
 */
const META: Record<
  InsightId,
  { title: string; href: string; icon: React.ComponentType<{ className?: string }>; unit: string }
> = {
  expiring: {
    title: 'Expiring soon',
    href: '/reports#expiring',
    icon: AlertTriangle,
    unit: 'units in 30 days',
  },
  capacity: {
    title: 'Bins near capacity',
    href: '/reports#capacity',
    icon: Boxes,
    unit: 'at 90%+',
  },
  'high-use': {
    title: 'High-use medications',
    href: '/reports#high-use',
    icon: TrendingUp,
    unit: 'in 30 days',
  },
  // Per spec: Recently Checked Out is not a Reports section — link to /reports root.
  recent: { title: 'Recently checked out', href: '/reports', icon: History, unit: 'recent' },
};

const ORDER: InsightId[] = ['expiring', 'capacity', 'high-use', 'recent'];

interface InsightCardsProps {
  insights?: Insight[];
  loading: boolean;
}

export function InsightCards({ insights, loading }: InsightCardsProps) {
  const byId = new Map((insights ?? []).map((i) => [i.id, i]));
  return (
    <section aria-labelledby="home-insights">
      <h2 id="home-insights" className="mb-3 text-base font-semibold text-foreground">
        At a glance
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ORDER.map((id) => {
          const meta = META[id];
          const insight = byId.get(id);
          const Icon = meta.icon;
          return (
            <Link
              key={id}
              href={meta.href}
              className="group flex min-h-[44px] flex-col rounded-lg border border-border bg-card p-4 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-panel text-subtle-foreground">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                {loading ? (
                  <Skeleton className="h-7 w-10" />
                ) : (
                  <span className="text-2xl font-semibold tabular-nums leading-none text-foreground">
                    {insight?.count == null ? '—' : formatCount(insight.count)}
                  </span>
                )}
              </div>
              <h3 className="mt-3 text-sm font-semibold text-foreground">{meta.title}</h3>
              <p className="text-xs text-muted-foreground">{meta.unit}</p>
              <ul className="mt-3 flex flex-col gap-1 text-xs">
                {loading ? (
                  <>
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </>
                ) : insight?.error ? (
                  <li className="text-muted-foreground">Couldn&apos;t load — open Reports.</li>
                ) : insight && insight.lines.length === 0 ? (
                  <li className="text-muted-foreground">Nothing to show.</li>
                ) : (
                  insight?.lines.map((line, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span className="truncate text-foreground">{line.primary}</span>
                      {line.secondary ? (
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {line.secondary}
                        </span>
                      ) : null}
                    </li>
                  ))
                )}
              </ul>
              <span
                className={cn(
                  'mt-auto inline-flex items-center gap-1 pt-3 text-xs font-medium text-primary-ink'
                )}
              >
                View all <ArrowRight className="h-3 w-3" aria-hidden />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
