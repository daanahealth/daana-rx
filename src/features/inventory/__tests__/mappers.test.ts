import {
  DEFAULT_FILTERS,
  activeFilterCount,
  checkedInBy,
  diffEntries,
  doseLine,
  isExpired,
  isTerminal,
  mapInventoryRow,
  medicationName,
  readAttr,
  stringifyValue,
  toQuery,
} from '../mappers';

const raw = {
  id: 'i1',
  type_id: 't1',
  status: 'active',
  location_id: 'l1',
  location: { code: 'CARDIO1' },
  expiry_date: '2027-03-07',
  unit_code: 'DRX-MASS-CARDIO-00012',
  attributes: {
    medication_name: 'Lisinopril',
    dosage: '10',
    unit: 'mg',
    form: 'Card',
    quantity: 3,
  },
  created_at: '2026-01-02T10:00:00Z',
  created_by_name: 'Kim',
};

describe('mapInventoryRow', () => {
  it('maps snake_case wire rows to the camelCase view model', () => {
    const row = mapInventoryRow(raw);
    expect(row.id).toBe('i1');
    expect(row.locationCode).toBe('CARDIO1');
    expect(row.unitCode).toBe('DRX-MASS-CARDIO-00012');
    expect(row.expiryDate).toBe('2027-03-07');
    expect(row.status).toBe('active');
    expect(checkedInBy(row)).toBe('Kim');
  });
  it('falls back to location_code and to active for unknown statuses', () => {
    const row = mapInventoryRow({ id: 'x', status: 'bogus', location_code: 'PSYCH2' });
    expect(row.locationCode).toBe('PSYCH2');
    expect(row.status).toBe('active');
    expect(row.attributes).toEqual({});
  });
});

describe('attribute helpers', () => {
  const row = mapInventoryRow(raw);
  it('reads attributes as strings', () => {
    expect(readAttr(row.attributes, 'quantity')).toBe('3');
    expect(readAttr(row.attributes, 'missing')).toBe('');
    expect(readAttr(undefined, 'x')).toBe('');
  });
  it('builds the name and dose line', () => {
    expect(medicationName(row)).toBe('Lisinopril');
    expect(medicationName({ attributes: {} as never })).toBe('Item');
    expect(doseLine(row)).toBe('10 mg · Card');
  });
  it('knows expired and terminal units', () => {
    expect(isExpired(row, new Date('2026-01-01').getTime())).toBe(false);
    expect(isExpired(row, new Date('2028-01-01').getTime())).toBe(true);
    expect(isExpired({ expiryDate: null })).toBe(false);
    expect(isTerminal({ status: 'checked_out' })).toBe(true);
    expect(isTerminal({ status: 'active' })).toBe(false);
  });
});

describe('filters', () => {
  it('always requests the max page and only sets non-default params', () => {
    expect(toQuery(DEFAULT_FILTERS)).toBe('limit=200');
    const q = toQuery({
      q: ' amox ',
      status: 'expired',
      locationId: 'l1',
      expiryBefore: '2026-12-31',
    });
    expect(q).toBe('q=amox&status=expired&locationId=l1&expiryBefore=2026-12-31&limit=200');
  });
  it('counts active filters', () => {
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0);
    expect(activeFilterCount({ ...DEFAULT_FILTERS, q: 'a', status: 'active' })).toBe(2);
  });
});

describe('diffs', () => {
  it('lists only changed keys', () => {
    const d = diffEntries({ a: 1, b: 2 }, { a: 1, b: 3, c: 'new' });
    expect(d.map((x) => x.key)).toEqual(['b', 'c']);
  });
  it('stringifies empties and objects', () => {
    expect(stringifyValue('')).toBe('∅');
    expect(stringifyValue({ k: 1 })).toBe('{"k":1}');
    expect(stringifyValue(5)).toBe('5');
  });
});
