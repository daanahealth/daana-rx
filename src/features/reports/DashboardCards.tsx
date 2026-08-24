import Link from 'next/link';
import { AlertTriangle, MapPin, TrendingUp, Trash2, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCount } from '@/lib/format';
import type { HighUseRow } from './mappers';

/**
 * DashboardCards — four stat tiles that deep-link to the report sections
 * below. Counts come from the same hooks the panels use, so the numbers can
 * never disagree with the tables they point at.
 */
export interface DashboardCardsProps {
  expiringCount: number | null;
  capacityCount: number | null;
  highUse: HighUseRow[] | null;
  removedCount: number | null;
}

const PENDING = '…';

function count(n: number | null): string {
  return n === null ? PENDING : formatCount(n);
}

export function DashboardCards({
  expiringCount,
  capacityCount,
  highUse,
  removedCount,
}: DashboardCardsProps) {
  const top = highUse?.slice(0, 3) ?? [];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <DashboardCard
        href="#expiring"
        icon={AlertTriangle}
        label="Expiring Soon"
        primary={count(expiringCount)}
        sub="Next 30 days"
      />
      <DashboardCard
        href="#capacity"
        icon={MapPin}
        label="Lots Approaching Capacity"
        primary={count(capacityCount)}
        sub="Bins at 90% or fuller"
      />
      <DashboardCard
        href="#high-use"
        icon={TrendingUp}
        label="High-Use Medications"
        primary={
          highUse === null ? PENDING : top.length > 0 ? formatCount(top[0].checkoutCount) : '—'
        }
        sub={top.length > 0 ? `Top: ${top[0].medicationName}` : 'No checkouts in the last 30 days'}
        extra={
          top.length > 0 ? (
            <ol className="mt-2 space-y-0.5 text-xs text-muted-foreground">
              {top.map((h, i) => (
                <li key={h.key} className="flex justify-between gap-2">
                  <span className="truncate">
                    {i + 1}. {h.medicationName}
                  </span>
                  <span className="tabular-nums">{formatCount(h.checkoutCount)}</span>
                </li>
              ))}
            </ol>
          ) : null
        }
      />
      <DashboardCard
        href="#recently-removed"
        icon={Trash2}
        label="Recently Removed"
        primary={count(removedCount)}
        sub="Past 30 days"
      />
    </div>
  );
}

function DashboardCard({
  href,
  icon: Icon,
  label,
  primary,
  sub,
  extra,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  primary: string;
  sub: string;
  extra?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="h-full transition-colors group-hover:border-line-strong">
        <CardContent className="flex h-full flex-col">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{label}</span>
          </div>
          <p className="mt-3 text-2xl font-semibold tabular-nums text-foreground">{primary}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{sub}</p>
          {extra}
          <div className="mt-auto flex items-center gap-1 pt-3 text-xs font-medium text-primary">
            <span className="group-hover:underline">View report</span>
            <ArrowRight className="h-3 w-3" aria-hidden />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
