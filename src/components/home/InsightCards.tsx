'use client';

import * as React from 'react';
import Link from 'next/link';
import { AlertTriangle, Boxes, TrendingUp, History, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Insight cards are populated from real data once the reports API ships.
 * Until then we render structurally-correct stub data so the layout, copy,
 * and routes match the spec exactly.
 */

interface InsightRow {
  primary: string;
  secondary?: string;
}

interface InsightCardData {
  id: 'expiring' | 'capacity' | 'high-use' | 'recent';
  title: string;
  count: number | null;
  rows: InsightRow[];
  accent: 'red' | 'amber' | 'teal' | 'gray';
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

const STUB_INSIGHTS: InsightCardData[] = [
  {
    id: 'expiring',
    title: 'Expiring Soon',
    count: null,
    rows: [
      { primary: 'Inventory data pending', secondary: 'Connect /api/reports' },
    ],
    accent: 'red',
    icon: AlertTriangle,
    href: '/reports#expiring',
  },
  {
    id: 'capacity',
    title: 'Lots Approaching Capacity',
    count: null,
    rows: [
      { primary: 'Inventory data pending', secondary: 'Connect /api/reports' },
    ],
    accent: 'amber',
    icon: Boxes,
    href: '/reports#capacity',
  },
  {
    id: 'high-use',
    title: 'High-Use Medications',
    count: null,
    rows: [
      { primary: 'Inventory data pending', secondary: 'Connect /api/reports' },
    ],
    accent: 'teal',
    icon: TrendingUp,
    href: '/reports#high-use',
  },
  {
    id: 'recent',
    title: 'Recently Checked Out',
    count: null,
    rows: [
      { primary: 'Inventory data pending', secondary: 'Last 25 or last 7 days' },
    ],
    accent: 'gray',
    icon: History,
    // Per spec: Recently Checked Out is NOT a section in Reports — link to /reports root.
    href: '/reports',
  },
];

const ACCENT_CLASSES: Record<InsightCardData['accent'], { icon: string; bg: string; ring: string }> = {
  red: {
    icon: 'text-destructive',
    bg: 'bg-destructive/10',
    ring: 'border-destructive/30',
  },
  amber: {
    icon: 'text-warning',
    bg: 'bg-warning/10',
    ring: 'border-warning/30',
  },
  teal: {
    icon: 'text-primary',
    bg: 'bg-primary/10',
    ring: 'border-primary/30',
  },
  gray: {
    icon: 'text-muted-foreground',
    bg: 'bg-muted',
    ring: 'border-border',
  },
};

function InsightCard({ data }: { data: InsightCardData }) {
  const Icon = data.icon;
  const accent = ACCENT_CLASSES[data.accent];
  return (
    <Link
      href={data.href}
      className={cn(
        'group block snap-start shrink-0 w-[280px] sm:w-auto',
        'rounded-xl border bg-card/70 backdrop-blur-xl shadow-soft hover:shadow-md',
        'transition-all duration-200 hover:-translate-y-0.5',
        'p-4 sm:p-5',
        accent.ring,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className={cn('flex items-center justify-center h-9 w-9 rounded-lg', accent.bg)}>
          <Icon className={cn('h-5 w-5', accent.icon)} />
        </div>
        {data.count !== null && (
          <span className={cn('text-2xl font-bold tracking-tight', accent.icon)}>
            {data.count}
          </span>
        )}
      </div>

      <h3 className="mt-3 text-sm font-semibold text-foreground">{data.title}</h3>

      <ul className="mt-3 space-y-1.5">
        {data.rows.slice(0, 3).map((row, i) => (
          <li key={i} className="text-xs text-muted-foreground truncate">
            <span className="text-foreground/80">{row.primary}</span>
            {row.secondary ? <span> · {row.secondary}</span> : null}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-center gap-1 text-xs font-medium text-primary group-hover:gap-2 transition-all">
        View all
        <ArrowRight className="h-3 w-3" />
      </div>
    </Link>
  );
}

interface InsightCardsProps {
  hidden: boolean;
}

export function InsightCards({ hidden }: InsightCardsProps) {
  return (
    <div
      aria-hidden={hidden}
      className={cn(
        'w-full max-w-5xl mx-auto transition-opacity duration-250',
        hidden ? 'opacity-0 pointer-events-none' : 'opacity-100',
      )}
      style={{ transitionDuration: '250ms' }}
    >
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 px-1">
        At a glance
      </h2>
      {/* Mobile: horizontal scroll. Desktop: grid. */}
      <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 overflow-x-auto sm:overflow-visible snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0 pb-2 sm:pb-0">
        {STUB_INSIGHTS.map((card) => (
          <InsightCard key={card.id} data={card} />
        ))}
      </div>
    </div>
  );
}
