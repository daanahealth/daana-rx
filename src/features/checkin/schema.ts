/**
 * Check-in form schema — hand-translated from `medicationAttributeSchema` in
 * @daana-health/domain-mass (the JSON Schema is the source of truth for what
 * the API accepts). Dates are stored as YYYY-MM-DD for the API; DateField
 * shows and accepts MM/DD/YYYY.
 */
import { z } from 'zod';
import { MEDICATION_FORMS } from '@daana-health/domain-mass';
import { toISODate } from '@/lib/format';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_MESSAGE = 'Enter the date as MM/DD/YYYY';

/** "12" → 12; "" / null / NaN → undefined. Shared with the API mapper. */
export function normalizeQuantity(v: unknown): number | undefined {
  if (v === '' || v === null || v === undefined) return undefined;
  const n = typeof v === 'number' ? v : Number.parseInt(String(v), 10);
  return Number.isFinite(n) ? n : undefined;
}

export const medicationFormSchema = z.object({
  medication_name: z
    .string()
    .min(1, 'Medication name is required')
    .max(200, 'Keep the name under 200 characters'),
  dosage: z.string().min(1, 'Dosage is required (e.g. 10, 500, 0.5)').max(40, 'Too long'),
  unit: z.string().min(1, 'Unit is required (e.g. mg, mcg, mL, IU)').max(20, 'Too long'),
  form: z.enum(MEDICATION_FORMS as unknown as [string, ...string[]], {
    message: 'Select a form',
  }),
  specialty_class: z.string().min(1, 'Specialty class is required'),
  expiry_date: z
    .string()
    .optional()
    .refine((v) => !v || ISO_DATE.test(v), DATE_MESSAGE),
  date_received: z.string().min(1, 'Date received is required').regex(ISO_DATE, DATE_MESSAGE),
  // The <input> hands us a string at runtime; blank means "not counted". Typed
  // as the number the API receives (see normalizeQuantity in the mapper).
  quantity: z.custom<number | undefined>(
    (v) => {
      if (v === '' || v === null || v === undefined) return true;
      const n = Number(v);
      return Number.isInteger(n) && n >= 0;
    },
    { message: 'Enter a whole number of units (0 or more)' }
  ),
  notes: z.string().max(1000, 'Keep notes under 1000 characters').optional(),
  supervisor_acknowledged: z.boolean().optional(),
});

export type MedicationFormValues = z.infer<typeof medicationFormSchema>;

/** Default values: empty medication, form "Bottle", received today. */
export function buildDefaultMedicationFormValues(today: Date = new Date()): MedicationFormValues {
  return {
    medication_name: '',
    dosage: '',
    unit: '',
    form: 'Bottle' as MedicationFormValues['form'],
    specialty_class: '',
    expiry_date: '',
    date_received: toISODate(today),
    quantity: undefined,
    notes: '',
    supervisor_acknowledged: false,
  };
}
