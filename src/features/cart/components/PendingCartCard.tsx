'use client';

// A restricted user's submitted cart in the superadmin's approvals tab:
// who, how many, when — then Approve, or Reject with a required reason.

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DateText, StatusChip } from '@/components/composed';
import { pluralize } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import { approveCart, rejectCart } from '../api';
import type { ServerCart } from '../mappers';

export interface PendingCartCardProps {
  readonly cart: ServerCart;
  readonly onDecided: (cartId: string) => void;
}

export function PendingCartCard({ cart, onDecided }: PendingCartCardProps) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState<null | 'approve' | 'reject'>(null);
  const [showReject, setShowReject] = React.useState(false);
  const [reason, setReason] = React.useState('');

  const handleApprove = async () => {
    setBusy('approve');
    try {
      await approveCart(cart.id);
      toast({
        title: 'Cart approved',
        description: `${pluralize(cart.items.length, 'item')} checked out.`,
      });
      onDecided(cart.id);
    } catch (err) {
      toast({
        title: 'Approve failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async () => {
    if (!reason.trim()) return;
    setBusy('reject');
    try {
      await rejectCart(cart.id, reason.trim());
      toast({ title: 'Cart rejected', description: cart.ownerName ?? cart.ownerId });
      onDecided(cart.id);
    } catch (err) {
      toast({
        title: 'Reject failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <li className="space-y-3 rounded-md border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {cart.ownerName ?? cart.ownerId}
          </p>
          <p className="text-xs text-muted-foreground">
            {pluralize(cart.items.length, 'item')} · submitted{' '}
            {cart.submittedAt ? <DateText value={cart.submittedAt} withTime /> : '—'}
          </p>
        </div>
        <StatusChip kind="cart" status="pending_approval" />
      </div>

      <ul className="divide-y divide-border text-xs">
        {cart.items.map((it) => (
          <li key={it.itemId} className="flex items-baseline justify-between gap-3 py-1.5">
            <span className="truncate text-foreground">{it.medicationName}</span>
            <span className="shrink-0 font-mono text-muted-foreground">{it.unitCode}</span>
          </li>
        ))}
      </ul>

      {showReject ? (
        <div className="space-y-2">
          <Label htmlFor={`reason-${cart.id}`} className="text-xs text-subtle-foreground">
            Reason for rejection
          </Label>
          <Textarea
            id={`reason-${cart.id}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="e.g. Patient need not verified."
          />
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!reason.trim() || busy !== null}
              loading={busy === 'reject'}
            >
              Confirm Reject
            </Button>
            <Button variant="outline" onClick={() => setShowReject(false)} disabled={busy !== null}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={handleApprove} disabled={busy !== null} loading={busy === 'approve'}>
            Approve
          </Button>
          <Button variant="outline" onClick={() => setShowReject(true)} disabled={busy !== null}>
            Reject
          </Button>
        </div>
      )}
    </li>
  );
}
