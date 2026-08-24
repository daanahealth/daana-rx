'use client';

import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusChip, DateText, KeyValueList } from '@/components/composed';
import { formatAge, pluralize } from '@/lib/format';
import { cn } from '@/lib/utils';
import { providerDisplayName, doseForm } from '@/features/provider/mappers';
import { ttlCountdown, type DispenseRequestVM } from '../mappers';

/**
 * QueueCard — one dispense request as the superadmin sees it: who asked,
 * what, how many, the reserved unit (location + DRX code + expiry), age and
 * TTL. Actions are passed in so the screen owns the mutations.
 */
export interface QueueCardProps {
  request: DispenseRequestVM;
  now?: Date;
  busy?: boolean;
  onFulfill?: (r: DispenseRequestVM) => void;
  onDeny?: (r: DispenseRequestVM) => void;
  onReturn?: (r: DispenseRequestVM) => void;
  className?: string;
}

export function requestSubject(r: DispenseRequestVM): string {
  const df = doseForm(r);
  return `${r.medicationName}${df ? ` ${df}` : ''} · ${pluralize(r.quantity, 'unit')}`;
}

export function QueueCard({
  request: r,
  now = new Date(),
  busy = false,
  onFulfill,
  onDeny,
  onReturn,
  className,
}: QueueCardProps) {
  const pending = r.status === 'pending';
  const countdown = pending ? ttlCountdown(r.expiresAt, now) : null;
  const unit = r.reservedUnits[0] ?? null;
  const extraUnits = r.reservedUnits.length - 1;

  return (
    <article
      data-request-id={r.id}
      data-status={r.status}
      className={cn('flex flex-col gap-3 rounded-lg border border-border bg-card p-4', className)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold leading-snug text-foreground">
            {r.medicationName}
            <span className="ml-2 text-sm font-medium tabular-nums text-subtle-foreground">
              × {r.quantity}
            </span>
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{doseForm(r) || '—'}</p>
        </div>
        <StatusChip kind="request" status={r.status} />
      </div>

      <KeyValueList
        columns="inline"
        items={[
          {
            label: 'Provider',
            value: r.provider ? providerDisplayName(r.provider) : '—',
          },
          { label: 'Patient ref', value: r.patientRef ?? '—', code: !!r.patientRef },
          {
            label: extraUnits > 0 ? `Reserved (${r.reservedUnits.length} units)` : 'Reserved unit',
            value: unit ? (
              <span className="inline-flex flex-wrap items-center justify-end gap-x-2 gap-y-0.5">
                {unit.location ? <span className="font-medium">{unit.location}</span> : null}
                {unit.unitCode ? (
                  <code className="font-mono text-[0.8125rem] tabular-nums">{unit.unitCode}</code>
                ) : null}
                {unit.expiryDate ? <DateText value={unit.expiryDate} expiry noHint /> : null}
                {extraUnits > 0 ? (
                  <span className="text-xs text-muted-foreground">+{extraUnits} more</span>
                ) : null}
              </span>
            ) : (
              <span className="text-muted-foreground">{pending ? 'Not recorded' : 'Released'}</span>
            ),
          },
          {
            label: 'Requested',
            value: r.createdAt ? (
              <span className="inline-flex items-center gap-2">
                <span className="text-muted-foreground">
                  {Number.isFinite(r.ageSeconds)
                    ? formatAge(new Date(now.getTime() - r.ageSeconds * 1000), now)
                    : formatAge(r.createdAt, now)}{' '}
                  ago
                </span>
                <DateText value={r.createdAt} withTime />
              </span>
            ) : (
              '—'
            ),
          },
          ...(pending
            ? [
                {
                  label: 'Time left',
                  value: countdown ? (
                    <span
                      data-ttl={countdown.expired ? 'expired' : 'live'}
                      className={cn(
                        'inline-flex items-center gap-1.5 tabular-nums',
                        countdown.expired
                          ? 'font-medium text-danger'
                          : countdown.minutes <= 30
                            ? 'text-warn'
                            : 'text-foreground'
                      )}
                    >
                      <Clock className="h-3.5 w-3.5" aria-hidden />
                      {countdown.expired ? 'Expired — refresh' : countdown.label}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">End of clinic day</span>
                  ),
                },
              ]
            : []),
          ...(!pending && r.resolvedAt
            ? [{ label: 'Resolved', value: <DateText value={r.resolvedAt} withTime /> }]
            : []),
          ...(r.reason ? [{ label: 'Reason', value: r.reason }] : []),
        ]}
      />

      {pending && (onFulfill || onDeny) ? (
        <div className="flex flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row sm:justify-end [&>*]:w-full sm:[&>*]:w-auto">
          {onDeny ? (
            <Button variant="outline" size="touch" disabled={busy} onClick={() => onDeny(r)}>
              Deny
            </Button>
          ) : null}
          {onFulfill ? (
            <Button size="touch" loading={busy} disabled={busy} onClick={() => onFulfill(r)}>
              Fulfill
            </Button>
          ) : null}
        </div>
      ) : null}

      {r.status === 'fulfilled' && onReturn ? (
        <div className="flex border-t border-border pt-3 sm:justify-end [&>*]:w-full sm:[&>*]:w-auto">
          <Button variant="outline" size="sm" disabled={busy} onClick={() => onReturn(r)}>
            Return to shelf
          </Button>
        </div>
      ) : null}
    </article>
  );
}
