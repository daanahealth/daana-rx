'use client';

// RemoveItemModal — soft-delete an inventory item with a required reason.
//
// Per MVP spec § Remove from Inventory:
//   Required removal fields:
//     - Removal reason (required, from enum below)
//     - Removed by (auto-populated server-side from logged-in user)
//     - Date and time (auto-populated server-side)
//     - Note (optional)
//
// Removal reasons (enum):
//   expired | damaged | duplicate_entry | incorrect_entry | lost_or_missing |
//   disposed | other
//
// POST /api/items/{id}/remove on submit. Removed records remain visible in
// transaction logs / reports — never hard-deleted.

import { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, Loader2 } from 'lucide-react';
import type { Item } from '@daana-health/inventory-core';
import { API_BASE, authHeaders } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export const REMOVAL_REASONS = [
  'expired',
  'damaged',
  'duplicate_entry',
  'incorrect_entry',
  'lost_or_missing',
  'disposed',
  'other',
] as const;

export type RemovalReason = (typeof REMOVAL_REASONS)[number];

const REASON_LABELS: Record<RemovalReason, string> = {
  expired: 'Expired',
  damaged: 'Damaged',
  duplicate_entry: 'Duplicate entry',
  incorrect_entry: 'Incorrect entry',
  lost_or_missing: 'Lost or missing',
  disposed: 'Disposed',
  other: 'Other',
};

interface RemoveItemModalProps {
  item: Item | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemoved: () => void;
}

function readAttr(attrs: Item['attributes'] | undefined, key: string): string {
  if (!attrs) return '';
  const v = (attrs as Record<string, unknown>)[key];
  if (v === undefined || v === null) return '';
  return String(v);
}

export function RemoveItemModal({ item, open, onOpenChange, onRemoved }: RemoveItemModalProps) {
  const { toast } = useToast();
  const [reason, setReason] = useState<RemovalReason | ''>('');
  const [note, setNote] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset state whenever the modal opens for a new item.
  useEffect(() => {
    if (!open) return;
    setReason('');
    setNote('');
    setReasonError(null);
    setSubmitError(null);
  }, [open, item?.id]);

  async function handleSubmit() {
    if (!item) return;
    if (!reason) {
      setReasonError('Removal reason is required.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`${API_BASE}/inventory/items/${item.id}/remove`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          reason,
          ...(note.trim().length > 0 ? { note: note.trim() } : {}),
        }),
      });
      if (!res.ok) {
        const bodyErr = await res.json().catch(() => ({}));
        throw new Error(bodyErr.error || `POST /inventory/items/${item.id}/remove failed: ${res.status}`);
      }
      toast({
        title: 'Item removed',
        description: `Removal logged with reason: ${REASON_LABELS[reason]}.`,
      });
      onRemoved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to remove item.';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Remove from inventory
          </DialogTitle>
          <DialogDescription>
            This soft-deletes the record. It will no longer appear in active search but remains in
            the transaction log and reports.
          </DialogDescription>
        </DialogHeader>

        {item ? (
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <p className="font-medium">
              {readAttr(item.attributes, 'medication_name') || '—'}
            </p>
            <p className="text-xs text-muted-foreground">
              {readAttr(item.attributes, 'dosage')} {readAttr(item.attributes, 'unit')} ·{' '}
              <span className="font-mono">{item.unitCode}</span>
            </p>
          </div>
        ) : null}

        {submitError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Removal reason <span className="text-destructive">*</span>
            </Label>
            <Select
              value={reason || undefined}
              onValueChange={(v) => {
                setReason(v as RemovalReason);
                setReasonError(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REMOVAL_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {REASON_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {reasonError ? <p className="text-xs text-destructive">{reasonError}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="remove-note" className="text-xs font-medium text-muted-foreground">
              Note (optional)
            </Label>
            <Textarea
              id="remove-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Add any context for the audit log."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Confirm removal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
