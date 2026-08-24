import {
  buildPreviewItem,
  domainIssues,
  specialtyClassForLocation,
  suggestedLocation,
  toCreateItemPayload,
  toLocationOptions,
  toMedicationAttributes,
} from '../mappers';
import { buildDefaultMedicationFormValues, medicationFormSchema } from '../schema';

const values = () => ({
  ...buildDefaultMedicationFormValues(new Date(2026, 7, 23)),
  medication_name: 'Lisinopril',
  dosage: '10',
  unit: 'mg',
  form: 'Bottle' as const,
  specialty_class: 'CARDIO',
  expiry_date: '2027-03-07',
});

describe('specialtyClassForLocation', () => {
  it('strips the trailing bin index and maps through the guide', () => {
    expect(specialtyClassForLocation('CARDIO1')).toBe('CARDIO');
    expect(specialtyClassForLocation('cardio')).toBe('CARDIO');
  });
  it('returns null for bins outside the guide (caller must ask, not guess)', () => {
    expect(specialtyClassForLocation('FRIDGE-A')).toBeNull();
    expect(specialtyClassForLocation('')).toBeNull();
  });
});

describe('suggestedLocation', () => {
  it('suggests a bin for a class and nothing for empty input', () => {
    expect(suggestedLocation('CARDIO')).toBe('CARDIO');
    expect(suggestedLocation('  ')).toBeNull();
  });
});

describe('schema + attributes', () => {
  it('defaults date_received to today as YYYY-MM-DD', () => {
    expect(buildDefaultMedicationFormValues(new Date(2026, 7, 3)).date_received).toBe('2026-08-03');
  });
  it('rejects a date that is not ISO with an MM/DD/YYYY message', () => {
    const r = medicationFormSchema.safeParse({ ...values(), date_received: '13/40/2026' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe('Enter the date as MM/DD/YYYY');
  });
  it('accepts the quantity input string, rejects fractions, and maps blank to undefined', () => {
    expect(medicationFormSchema.safeParse({ ...values(), quantity: '12' }).success).toBe(true);
    expect(medicationFormSchema.safeParse({ ...values(), quantity: '' }).success).toBe(true);
    expect(medicationFormSchema.safeParse({ ...values(), quantity: '1.5' }).success).toBe(false);
    expect(toMedicationAttributes({ ...values(), quantity: '7' as unknown as number }).quantity).toBe(7);
    expect(toMedicationAttributes({ ...values(), quantity: '' as unknown as number }).quantity).toBeUndefined();
  });
});

describe('preview item and payload', () => {
  it('never invents a unit code: empty until the server issues one', () => {
    expect(buildPreviewItem(values(), null).unitCode).toBe('');
    expect(buildPreviewItem(values(), 'DRX-MASS-CARDIO-00012').unitCode).toBe('DRX-MASS-CARDIO-00012');
  });
  it('flags a missing expiry through the domain validators', () => {
    const issues = domainIssues(buildPreviewItem({ ...values(), expiry_date: '' }, 'X'));
    expect(issues.some((i) => /expir/i.test(i))).toBe(true);
    expect(domainIssues(buildPreviewItem(values(), 'X'))).toEqual([]);
  });
  it('builds the POST /inventory/items body', () => {
    expect(toCreateItemPayload(values(), 'CARDIO1')).toEqual({
      typeName: 'medication',
      locationCode: 'CARDIO1',
      expiryDate: '2027-03-07',
      dateReceived: '2026-08-23',
      attributes: expect.objectContaining({ medication_name: 'Lisinopril', specialty_class: 'CARDIO' }),
    });
  });
});

describe('toLocationOptions', () => {
  it('prefers configured bins and falls back to the guide', () => {
    const configured = toLocationOptions([{ id: '1', code: 'CARDIO1', specialty: 'CARDIO', capacity: 50 }]);
    expect(configured).toEqual([{ code: 'CARDIO1', hint: 'CARDIO' }]);
    expect(toLocationOptions([]).length).toBeGreaterThan(5);
  });
});
