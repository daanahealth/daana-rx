import type { Item } from '@daana-health/inventory-core';
import {
  capacityLines,
  expiringLines,
  friendlyFirstName,
  highUseLines,
  itemToResult,
} from '../mappers';
import { parseItems } from '../api';

describe('home mappers', () => {
  it('maps an item to a result row with dose and location', () => {
    const item = {
      id: 'i1',
      unitCode: 'DRX-MASS-CARDIO-00012',
      status: 'active',
      expiryDate: '2027-03-07',
      attributes: {
        medication_name: 'Metformin',
        dosage: 500,
        unit: 'mg',
        form: 'Tablet',
        location_code: 'ENDO1',
      },
    } as unknown as Item;
    expect(itemToResult(item)).toEqual({
      id: 'i1',
      name: 'Metformin',
      dose: '500 mg',
      form: 'Tablet',
      locationCode: 'ENDO1',
      unitCode: 'DRX-MASS-CARDIO-00012',
      expiryDate: '2027-03-07',
      status: 'active',
    });
  });

  it('falls back when attributes are missing', () => {
    const row = itemToResult({
      id: 'x',
      unitCode: 'U',
      status: 'expired',
      attributes: null,
    } as unknown as Item);
    expect(row.name).toBe('Unknown medication');
    expect(row.dose).toBeNull();
    expect(row.expiryDate).toBeNull();
  });

  it('derives a first name from username or email', () => {
    expect(friendlyFirstName('karol.patel@clinic.org')).toBe('Karol');
    expect(friendlyFirstName('kim_m')).toBe('Kim');
    expect(friendlyFirstName('')).toBe('');
    expect(friendlyFirstName(undefined)).toBe('');
  });

  it('accepts bare arrays and { items } bodies', () => {
    expect(parseItems([{ id: 1 }])).toHaveLength(1);
    expect(parseItems({ items: [{ id: 1 }, { id: 2 }] })).toHaveLength(2);
    expect(parseItems({ nope: true })).toEqual([]);
  });

  it('builds insight lines with MM/DD/YYYY dates and capped at 3', () => {
    const exp = expiringLines(
      [1, 2, 3, 4].map((n) => ({
        unitId: String(n),
        medicationName: 'Amox',
        dosage: '500 mg',
        expiryDate: '2026-09-0' + n,
        daysUntilExpiry: n,
        drxCode: 'X',
      }))
    );
    expect(exp).toHaveLength(3);
    expect(exp[0]).toEqual({ primary: 'Amox 500 mg', secondary: '09/01/2026' });
    expect(
      capacityLines([
        { locationId: 'a', name: 'CARDIO1', current: 10, capacity: 50, percent: 20 },
        { locationId: 'b', name: 'PSYCH1', current: 48, capacity: 50, percent: 96 },
      ])[0]
    ).toEqual({ primary: 'PSYCH1', secondary: '48/50' });
    expect(
      highUseLines([
        { drugId: 'd', medicationName: 'Lisinopril', dosage: '10 mg', checkoutCount: 7 },
      ])[0].secondary
    ).toBe('7×');
  });
});
