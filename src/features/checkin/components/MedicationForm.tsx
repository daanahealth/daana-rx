'use client';

/**
 * MedicationForm — the intake fields, one composed field wrapper per input.
 * Placeholders are stable: the e2e check-in specs target them.
 */
import type { UseFormReturn } from 'react-hook-form';
import { MEDICATION_FORMS } from '@daana-health/domain-mass';
import { Form } from '@/components/ui/form';
import { DateField, FieldRow, SelectField, TextareaField, TextField } from '@/components/composed';
import type { MedicationFormValues } from '../schema';

const FORM_OPTIONS = MEDICATION_FORMS.map((f) => ({ value: f, label: f }));

export interface MedicationFormProps {
  readonly form: UseFormReturn<MedicationFormValues>;
}

export function MedicationForm({ form }: MedicationFormProps) {
  const { control } = form;
  return (
    <Form {...form}>
      <div className="space-y-4">
        <TextField
          control={control}
          name="medication_name"
          label="Medication name"
          placeholder="e.g. Lisinopril"
          autoComplete="off"
          autoCapitalize="words"
        />

        <FieldRow>
          <TextField
            control={control}
            name="dosage"
            label="Dosage"
            placeholder="e.g. 10"
            inputMode="decimal"
            autoComplete="off"
          />
          <TextField
            control={control}
            name="unit"
            label="Unit"
            placeholder="e.g. mg, mcg, mL"
            autoComplete="off"
          />
        </FieldRow>

        <SelectField
          control={control}
          name="form"
          label="Form"
          options={FORM_OPTIONS}
          placeholder="Select form"
        />

        <TextField
          control={control}
          name="specialty_class"
          label="Specialty class"
          placeholder="CARDIO, PSYCH, etc. — or a drug name to auto-suggest"
          description="Type the class (e.g. CARDIO) or a drug name; the next step suggests the bin."
          autoComplete="off"
        />

        <FieldRow>
          <DateField
            control={control}
            name="expiry_date"
            label="Expiry date"
            optional
            description="Leave blank if the donor package has none — the 10-year fallback is offered below."
          />
          <DateField control={control} name="date_received" label="Date received" />
        </FieldRow>

        <FieldRow>
          <TextField
            control={control}
            name="quantity"
            label="Quantity"
            optional
            type="number"
            inputMode="numeric"
            min={0}
            description="Units in this package (tablets per bottle, mL per vial)."
          />
        </FieldRow>

        <TextareaField
          control={control}
          name="notes"
          label="Notes"
          optional
          rows={3}
          placeholder="Intake notes"
        />
      </div>
    </Form>
  );
}
