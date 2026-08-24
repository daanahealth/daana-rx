'use client';

// EditItemDrawer — the editable fields per MVP spec § Inventory Tab:
// medication name, dosage, unit, form, location, expiry date (fallback: 10
// years from today), quantity, status, notes.
//
// Validation mirrors the MASS medication attribute schema (name / dosage /
// unit / form required; form ∈ MEDICATION_FORMS; quantity ≥ 0 integer;
// expiry a valid date). PATCH /inventory/items/{id} on save; every change is
// logged with old → new values.

import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, CalendarClock } from 'lucide-react';
import {
  MEDICATION_FORMS,
  type MedicationForm,
  tenYearsBeforeToday,
} from '@daana-health/domain-mass';
import type { Item, ItemStatus, Location } from '@daana-health/inventory-core';
import {
  EntityDrawer,
  FieldRow,
  SelectField,
  TextField,
  TextareaField,
} from '@/components/composed';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { ITEM_STATUS, ITEM_STATUSES, isItemStatus } from '@/lib/status';
import { toISODate } from '@/lib/format';
import { updateItem } from '../api';
import { readAttr } from '../mappers';

const NO_LOCATION = 'none';

const FORM_OPTIONS = MEDICATION_FORMS.map((f) => ({ value: f, label: f }));
const STATUS_OPTIONS = ITEM_STATUSES.map((s) => ({ value: s, label: ITEM_STATUS[s].label }));

function isMedicationForm(v: unknown): v is MedicationForm {
  return typeof v === 'string' && (MEDICATION_FORMS as readonly string[]).includes(v);
}

function buildSchema(expiryFallback: string) {
  return z.object({
    medication_name: z.string().trim().min(1, 'Medication name is required.'),
    dosage: z.string().trim().min(1, 'Dosage is required.'),
    unit: z.string().trim().min(1, 'Unit is required.'),
    form: z.custom<MedicationForm>(isMedicationForm, {
      message: `Form is required (one of: ${MEDICATION_FORMS.join(', ')}).`,
    }),
    locationId: z.string(),
    expiryDate: z
      .string()
      .min(
        1,
        `Expiry date is required. Use the fallback (${expiryFallback}) if the donor packaging has none.`
      )
      .refine((v) => !Number.isNaN(new Date(v).getTime()), 'Expiry date is invalid.'),
    quantity: z.string().refine((v) => {
      if (v.trim().length === 0) return true;
      const n = Number(v);
      return Number.isFinite(n) && Number.isInteger(n) && n >= 0;
    }, 'Quantity must be a non-negative integer.'),
    status: z.custom<ItemStatus>(isItemStatus, { message: 'Status must be a known status.' }),
    notes: z.string(),
  });
}
type Values = z.infer<ReturnType<typeof buildSchema>>;

function valuesFor(item: Item | null): Values {
  return {
    medication_name: readAttr(item?.attributes, 'medication_name'),
    dosage: readAttr(item?.attributes, 'dosage'),
    unit: readAttr(item?.attributes, 'unit'),
    form: readAttr(item?.attributes, 'form') as MedicationForm,
    locationId: item?.locationId ?? NO_LOCATION,
    expiryDate: toISODate(item?.expiryDate),
    quantity: readAttr(item?.attributes, 'quantity'),
    status: item?.status ?? 'active',
    notes: readAttr(item?.attributes, 'notes'),
  };
}

interface EditItemDrawerProps {
  item: Item | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  locations: Location[];
}

export function EditItemDrawer({
  item,
  open,
  onOpenChange,
  onSaved,
  locations,
}: EditItemDrawerProps) {
  const { toast } = useToast();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const expiryFallback = useMemo(() => tenYearsBeforeToday(), []);
  const schema = useMemo(() => buildSchema(expiryFallback), [expiryFallback]);

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: valuesFor(item) });

  // The screen remounts this drawer per item (key={item.id}), so the
  // defaultValues above are always the opened item's.

  const expiryValue = useWatch({ control: form.control, name: 'expiryDate' });
  const usingFallback = expiryValue === expiryFallback;

  const locationOptions = useMemo(
    () => [
      { value: NO_LOCATION, label: 'Unassigned' },
      ...locations.map((loc) => ({ value: loc.id, label: loc.code })),
    ],
    [locations]
  );

  async function onSubmit(values: Values) {
    if (!item) return;
    setSubmitError(null);
    try {
      const quantity = values.quantity.trim();
      const notes = values.notes.trim();
      await updateItem(item.id, {
        attributes: {
          medication_name: values.medication_name.trim(),
          dosage: values.dosage.trim(),
          unit: values.unit.trim(),
          form: values.form,
          ...(quantity.length > 0 ? { quantity: Number(quantity) } : {}),
          ...(notes.length > 0 ? { notes } : {}),
        },
        locationId: values.locationId === NO_LOCATION ? null : values.locationId,
        expiryDate: values.expiryDate,
        status: values.status,
      });
      toast({ title: 'Saved', description: 'Inventory record updated.' });
      onSaved();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save changes.');
    }
  }

  const saving = form.formState.isSubmitting;

  return (
    <EntityDrawer
      open={open}
      onOpenChange={onOpenChange}
      desktop="dialog"
      className="sm:max-w-2xl"
      title="Edit inventory item"
      description="All changes are logged in the transaction history with old → new values."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="edit-item-form" loading={saving}>
            Save changes
          </Button>
        </>
      }
    >
      <Form {...form}>
        <form
          id="edit-item-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          {submitError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" aria-hidden />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          ) : null}

          <FieldRow>
            <TextField control={form.control} name="medication_name" label="Medication name" />
            <TextField control={form.control} name="dosage" label="Dosage" />
            <TextField
              control={form.control}
              name="unit"
              label="Unit"
              placeholder="mg, mcg, mL, IU…"
            />
            <SelectField
              control={form.control}
              name="form"
              label="Form"
              placeholder="Select form"
              options={FORM_OPTIONS}
            />
            <SelectField
              control={form.control}
              name="locationId"
              label="Location"
              placeholder="Unassigned"
              options={locationOptions}
            />
            <div className="space-y-1.5">
              <TextField
                control={form.control}
                name="expiryDate"
                label="Expiry date"
                type="date"
                description={
                  usingFallback
                    ? `Using fallback (10 years from today): ${expiryFallback}`
                    : undefined
                }
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  form.setValue('expiryDate', expiryFallback, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                title={`Use spec fallback: ${expiryFallback}`}
              >
                <CalendarClock aria-hidden />
                Use fallback expiry
              </Button>
            </div>
            <TextField
              control={form.control}
              name="quantity"
              label="Quantity"
              optional
              type="number"
              min={0}
              inputMode="numeric"
            />
            <SelectField
              control={form.control}
              name="status"
              label="Status"
              options={STATUS_OPTIONS}
            />
          </FieldRow>
          <TextareaField
            control={form.control}
            name="notes"
            label="Notes"
            optional
            rows={3}
            placeholder="Intake or audit notes."
          />
        </form>
      </Form>
    </EntityDrawer>
  );
}
