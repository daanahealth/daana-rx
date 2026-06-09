'use client';

// EditItemModal — superadmin-editable fields per MVP spec § Inventory Tab
// Editable Fields:
//   - medication name
//   - dosage
//   - unit
//   - form
//   - location
//   - expiry date (if applicable; fallback: 10 years from today)
//   - quantity (if applicable)
//   - status
//   - notes
//
// Validation: JSON-Schema-ish parity with the MASS medication attribute schema
// (medication_name, dosage, unit, form required; form ∈ MEDICATION_FORMS;
// quantity ≥ 0). Cross-field: expiry must be a valid date, status must be a
// known ItemStatus.
//
// PATCH /api/items/{id} on submit. 404 from backend is surfaced inline so the
// orchestrator can wire the route without the UI hard-crashing.

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarClock, Loader2 } from 'lucide-react';
import {
  MEDICATION_FORMS,
  type MedicationForm,
  tenYearsBeforeToday,
} from '@daana-health/domain-mass';
import type { Item, ItemStatus, Location } from '@daana-health/inventory-core';
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
import { Input } from '@/components/ui/input';
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

const STATUS_OPTIONS: Array<{ value: ItemStatus; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'in_cart', label: 'In Cart' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'checked_out', label: 'Checked Out' },
  { value: 'removed', label: 'Removed' },
  { value: 'expired', label: 'Expired' },
];

interface FormState {
  medication_name: string;
  dosage: string;
  unit: string;
  form: MedicationForm | '';
  locationId: string;
  expiryDate: string; // YYYY-MM-DD
  quantity: string; // string for input control; coerced on save
  status: ItemStatus;
  notes: string;
}

interface EditItemModalProps {
  item: (Item & { locationCode?: string | null }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  locations: Location[];
}

function readAttr(attrs: Item['attributes'] | undefined, key: string): string {
  if (!attrs) return '';
  const v = (attrs as Record<string, unknown>)[key];
  if (v === undefined || v === null) return '';
  return String(v);
}

function toDateInput(value: string | null | undefined): string {
  if (!value) return '';
  // Accepts either YYYY-MM-DD or ISO timestamps.
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getUTCFullYear().toString().padStart(4, '0');
  const mm = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const dd = d.getUTCDate().toString().padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function EditItemModal({ item, open, onOpenChange, onSaved, locations }: EditItemModalProps) {
  const { toast } = useToast();

  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<Record<string, string>>({});

  // Reset form whenever a new item is opened.
  useEffect(() => {
    if (!item) return;
    setForm({
      medication_name: readAttr(item.attributes, 'medication_name'),
      dosage: readAttr(item.attributes, 'dosage'),
      unit: readAttr(item.attributes, 'unit'),
      form: (readAttr(item.attributes, 'form') as MedicationForm) || '',
      locationId: item.locationId ?? '',
      expiryDate: toDateInput(item.expiryDate),
      quantity: readAttr(item.attributes, 'quantity'),
      status: item.status,
      notes: readAttr(item.attributes, 'notes'),
    });
    setError(null);
    setIssues({});
  }, [item]);

  const expiryFallback = useMemo(() => tenYearsBeforeToday(), []);
  const usingFallback = form.expiryDate === expiryFallback;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setIssues((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.medication_name.trim()) next.medication_name = 'Medication name is required.';
    if (!form.dosage.trim()) next.dosage = 'Dosage is required.';
    if (!form.unit.trim()) next.unit = 'Unit is required.';
    if (!form.form) next.form = 'Form is required.';
    if (form.form && !MEDICATION_FORMS.includes(form.form as MedicationForm)) {
      next.form = `Form must be one of: ${MEDICATION_FORMS.join(', ')}.`;
    }
    if (form.quantity.trim().length > 0) {
      const n = Number(form.quantity);
      if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
        next.quantity = 'Quantity must be a non-negative integer.';
      }
    }
    if (form.expiryDate) {
      const d = new Date(form.expiryDate);
      if (Number.isNaN(d.getTime())) next.expiryDate = 'Expiry date is invalid.';
    } else {
      next.expiryDate =
        `Expiry date is required. Use the fallback (${expiryFallback}) if the donor packaging has none.`;
    }
    setIssues(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave() {
    if (!item) return;
    if (!validate()) return;
    setSaving(true);
    setError(null);
    try {
      const body = {
        attributes: {
          medication_name: form.medication_name.trim(),
          dosage: form.dosage.trim(),
          unit: form.unit.trim(),
          form: form.form,
          ...(form.quantity.trim().length > 0
            ? { quantity: Number(form.quantity) }
            : {}),
          ...(form.notes.trim().length > 0 ? { notes: form.notes.trim() } : {}),
        },
        locationId: form.locationId || null,
        expiryDate: form.expiryDate,
        status: form.status,
      };
      const res = await fetch(`${API_BASE}/inventory/items/${item.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const bodyErr = await res.json().catch(() => ({}));
        throw new Error(bodyErr.error || `PATCH /inventory/items/${item.id} failed: ${res.status}`);
      }
      toast({ title: 'Saved', description: 'Inventory record updated.' });
      onSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save changes.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit inventory item</DialogTitle>
          <DialogDescription>
            All changes are logged in the transaction history with old → new values.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Medication name" error={issues.medication_name} required>
            <Input
              value={form.medication_name}
              onChange={(e) => update('medication_name', e.target.value)}
            />
          </Field>

          <Field label="Dosage" error={issues.dosage} required>
            <Input value={form.dosage} onChange={(e) => update('dosage', e.target.value)} />
          </Field>

          <Field label="Unit" error={issues.unit} required>
            <Input
              value={form.unit}
              onChange={(e) => update('unit', e.target.value)}
              placeholder="mg, mcg, mL, IU…"
            />
          </Field>

          <Field label="Form" error={issues.form} required>
            <Select
              value={form.form || undefined}
              onValueChange={(v) => update('form', v as MedicationForm)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select form" />
              </SelectTrigger>
              <SelectContent>
                {MEDICATION_FORMS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Location">
            <Select
              value={form.locationId || 'none'}
              onValueChange={(v) => update('locationId', v === 'none' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Expiry date" error={issues.expiryDate} required>
            <div className="flex gap-2">
              <Input
                type="date"
                value={form.expiryDate}
                onChange={(e) => update('expiryDate', e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => update('expiryDate', expiryFallback)}
                title={`Use spec fallback: ${expiryFallback}`}
              >
                <CalendarClock className="mr-2 h-4 w-4" />
                Fallback
              </Button>
            </div>
            {usingFallback ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Using fallback (10 years from today): {expiryFallback}
              </p>
            ) : null}
          </Field>

          <Field label="Quantity" error={issues.quantity}>
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              value={form.quantity}
              onChange={(e) => update('quantity', e.target.value)}
              placeholder="Optional"
            />
          </Field>

          <Field label="Status">
            <Select value={form.status} onValueChange={(v) => update('status', v as ItemStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="sm:col-span-2">
            <Field label="Notes">
              <Textarea
                value={form.notes}
                onChange={(e) => update('notes', e.target.value)}
                placeholder="Optional intake or audit notes."
                rows={3}
              />
            </Field>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
  error,
  required,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function emptyForm(): FormState {
  return {
    medication_name: '',
    dosage: '',
    unit: '',
    form: '',
    locationId: '',
    expiryDate: '',
    quantity: '',
    status: 'active',
    notes: '',
  };
}
