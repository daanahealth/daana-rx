'use client';

// MedicationForm — schema-driven medication intake form for MASS Check In.
//
// Fields are derived from `medicationAttributeSchema` in
// @daana-health/domain-mass (Required Fields per MVP spec): medication_name,
// dosage, unit, form, specialty_class, plus optional quantity, notes,
// supervisor_acknowledged. `expiry_date` lives on the core item row (not in
// attributes) but is collected here as part of the intake form, alongside
// `date_received` (defaults to today; editable).
//
// react-hook-form + zod power the form. The zod schema is hand-translated
// from the JSON Schema in domain-mass (the JSON Schema is the source of
// truth — see attribute-schema.ts).

import { useEffect } from 'react';
import { useForm, Controller, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MEDICATION_FORMS } from '@daana-health/domain-mass';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Zod schema — hand-translated from medicationAttributeSchema.
// ---------------------------------------------------------------------------

export const medicationFormSchema = z.object({
  medication_name: z
    .string()
    .min(1, 'Medication name is required')
    .max(200, 'Too long'),
  dosage: z
    .string()
    .min(1, 'Dosage is required (e.g. 10, 500, 0.5)')
    .max(40, 'Too long'),
  unit: z
    .string()
    .min(1, 'Unit is required (e.g. mg, mcg, mL, IU)')
    .max(20, 'Too long'),
  form: z.enum(MEDICATION_FORMS as unknown as [string, ...string[]], {
    message: 'Select a form',
  }),
  specialty_class: z
    .string()
    .min(1, 'Specialty class is required'),
  expiry_date: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v),
      'Use YYYY-MM-DD',
    ),
  date_received: z
    .string()
    .min(1, 'Date received is required')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  quantity: z
    .union([z.number().int().min(0), z.nan()])
    .optional()
    .transform((v) => (typeof v === 'number' && !Number.isNaN(v) ? v : undefined)),
  notes: z.string().max(1000).optional(),
  supervisor_acknowledged: z.boolean().optional(),
});

export type MedicationFormValues = z.infer<typeof medicationFormSchema>;

// ---------------------------------------------------------------------------

export interface MedicationFormProps {
  readonly form: UseFormReturn<MedicationFormValues>;
  /** Called whenever the (debounced) specialty class changes. */
  readonly onSpecialtyChange?: (value: string) => void;
}

/**
 * Build a default value blob with today's date as `date_received`.
 */
export function buildDefaultMedicationFormValues(): MedicationFormValues {
  const today = new Date();
  const yyyy = today.getFullYear().toString().padStart(4, '0');
  const mm = (today.getMonth() + 1).toString().padStart(2, '0');
  const dd = today.getDate().toString().padStart(2, '0');
  return {
    medication_name: '',
    dosage: '',
    unit: '',
    form: 'Bottle' as MedicationFormValues['form'],
    specialty_class: '',
    expiry_date: '',
    date_received: `${yyyy}-${mm}-${dd}`,
    quantity: undefined,
    notes: '',
    supervisor_acknowledged: false,
  };
}

/**
 * Create a configured react-hook-form for the medication intake form.
 */
export function useMedicationForm(): UseFormReturn<MedicationFormValues> {
  return useForm<MedicationFormValues>({
    resolver: zodResolver(medicationFormSchema),
    defaultValues: buildDefaultMedicationFormValues(),
    mode: 'onBlur',
  });
}

export function MedicationForm({ form, onSpecialtyChange }: MedicationFormProps) {
  const { register, control, watch, formState: { errors } } = form;

  const specialtyClass = watch('specialty_class');

  // Notify parent whenever the specialty class string mutates.
  useEffect(() => {
    onSpecialtyChange?.(specialtyClass ?? '');
  }, [specialtyClass, onSpecialtyChange]);

  return (
    <div className="space-y-5">
      <Field
        id="medication_name"
        label="Medication name"
        required
        error={errors.medication_name?.message}
      >
        <Input
          id="medication_name"
          placeholder="e.g. Lisinopril"
          autoComplete="off"
          {...register('medication_name')}
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          id="dosage"
          label="Dosage"
          required
          error={errors.dosage?.message}
        >
          <Input
            id="dosage"
            placeholder="e.g. 10"
            inputMode="decimal"
            autoComplete="off"
            {...register('dosage')}
          />
        </Field>
        <Field
          id="unit"
          label="Unit"
          required
          error={errors.unit?.message}
        >
          <Input
            id="unit"
            placeholder="e.g. mg, mcg, mL"
            autoComplete="off"
            {...register('unit')}
          />
        </Field>
      </div>

      <Field
        id="form"
        label="Form"
        required
        error={errors.form?.message}
      >
        <Controller
          control={control}
          name="form"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="form">
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
          )}
        />
      </Field>

      <Field
        id="specialty_class"
        label="Specialty / Class"
        required
        error={errors.specialty_class?.message}
        hint="Type the class (e.g. CARDIO) or a drug name (e.g. Lisinopril)."
      >
        <Input
          id="specialty_class"
          placeholder="CARDIO, PSYCH, etc. — or a drug name to auto-suggest"
          autoComplete="off"
          {...register('specialty_class')}
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          id="expiry_date"
          label="Expiry date"
          error={errors.expiry_date?.message}
          hint="If donor packaging has none, leave blank — system will offer the 10-year fallback."
        >
          <Input
            id="expiry_date"
            type="date"
            {...register('expiry_date')}
          />
        </Field>
        <Field
          id="date_received"
          label="Date received"
          required
          error={errors.date_received?.message}
        >
          <Input
            id="date_received"
            type="date"
            {...register('date_received')}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          id="quantity"
          label="Quantity"
          error={errors.quantity?.message}
          hint="Units in this package (tablets per bottle, mL per vial, etc.)."
        >
          <Input
            id="quantity"
            type="number"
            inputMode="numeric"
            min={0}
            {...register('quantity', {
              setValueAs: (v) => (v === '' || v == null ? undefined : parseInt(v, 10)),
            })}
          />
        </Field>
        <div />
      </div>

      <Field
        id="notes"
        label="Notes"
        error={errors.notes?.message}
      >
        <Textarea
          id="notes"
          rows={3}
          placeholder="Optional intake notes"
          {...register('notes')}
        />
      </Field>
    </div>
  );
}

function Field({
  id,
  label,
  required,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-semibold">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p className={cn('text-xs', 'text-destructive')}>{error}</p>
      )}
    </div>
  );
}
