'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, MapPin, TrendingUp, Trash2, ArrowRight, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { reports, type HighUseRow } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Summary {
  expiringCount: number | null;
  capacityCount: number | null;
  highUse: HighUseRow[];
  removedCount: number | null;
}

const INITIAL: Summary = {
  expiringCount: null,
  capacityCount: null,
  highUse: [],
  removedCount: null,
};

export function DashboardCards() {
  const [summary, setSummary] = useState<Summary>(INITIAL);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const safe = <T,>(p: Promise<T>): Promise<T | null> =>
        p.catch(() => null);

      const [exp, cap, hu, rem] = await Promise.all([
        safe(reports.expiring(30)),
        safe(reports.capacity()),
        safe(reports.highUse()),
        safe(reports.recentlyRemoved()),
      ]);

      if (cancelled) return;
      setSummary({
        expiringCount: exp?.rows?.length ?? 0,
        capacityCount: cap?.rows?.length ?? 0,
        highUse: (hu?.rows ?? []).slice(0, 3),
        removedCount: rem?.rows?.length ?? 0,
      });
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <DashboardCard
        href="#expiring"
        icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
        label="Expiring Soon"
        primary={summary.expiringCount === null ? '…' : String(summary.expiringCount)}
        sub="Next 30 days"
        accent="amber"
      />
      <DashboardCard
        href="#capacity"
        icon={<MapPin className="h-5 w-5 text-orange-500" />}
        label="Lots Approaching Capacity"
        primary={summary.capacityCount === null ? '…' : String(summary.capacityCount)}
        sub="Bins ≥ 90% full"
        accent="orange"
      />
      <DashboardCard
        href="#high-use"
        icon={<TrendingUp className="h-5 w-5 text-emerald-500" />}
        label="High-Use Medications"
        primary={summary.highUse.length > 0 ? `${summary.highUse[0].checkoutCount}` : '—'}
        sub={
          summary.highUse.length > 0
            ? `Top: ${summary.highUse[0].medicationName}`
            : 'No checkouts in last 30 days'
        }
        accent="emerald"
        extra={
          summary.highUse.length > 0 ? (
            <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
              {summary.highUse.map((h, i) => (
                <li key={h.drugId} className="flex justify-between">
                  <span className="truncate">{i + 1}. {h.medicationName}</span>
                  <span className="font-mono tabular-nums">{h.checkoutCount}</span>
                </li>
              ))}
            </ul>
          ) : null
        }
      />
      <DashboardCard
        href="#recently-removed"
        icon={<Trash2 className="h-5 w-5 text-rose-500" />}
        label="Recently Removed"
        primary={summary.removedCount === null ? '…' : String(summary.removedCount)}
        sub="Past 30 days"
        accent="rose"
      />
    </div>
  );
}

function DashboardCard({
  href,
  icon,
  label,
  primary,
  sub,
  extra,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  primary: string;
  sub: string;
  /** Reserved for future theming hooks. */
  accent?: 'amber' | 'orange' | 'emerald' | 'rose';
  extra?: React.ReactNode;
}) {
  return (
    <Link href={href} className="group block focus:outline-none">
      <Card
        className={cn(
          'transition-shadow group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-primary',
          'h-full'
        )}
      >
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {icon}
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
            </div>
            {/* Trend placeholder icon */}
            <Minus className="h-4 w-4 text-muted-foreground/60" aria-label="Trend placeholder" />
          </div>
          <p className="mt-3 text-3xl font-semibold tabular-nums">{primary}</p>
          <p className="mt-1 text-xs text-muted-foreground truncate">{sub}</p>
          {extra}
          <div className="mt-3 flex items-center gap-1 text-xs text-primary">
            <span className="group-hover:underline">View report</span>
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
