import {
  deriveFirstName,
  searchDelayFor,
  searchStatusFor,
  toResultView,
  DEBOUNCE_MS,
} from '../mappers';

describe('searchDelayFor', () => {
  it('debounces single characters and fast-paths 2+', () => {
    expect(searchDelayFor('m')).toBe(DEBOUNCE_MS);
    expect(searchDelayFor('me')).toBe(0);
    expect(searchDelayFor('  m ')).toBe(DEBOUNCE_MS);
  });
});

describe('searchStatusFor', () => {
  it('only superadmins see expired stock', () => {
    expect(searchStatusFor(true)).toBe('active,expired');
    expect(searchStatusFor(false)).toBe('active');
  });
});

describe('deriveFirstName', () => {
  it('prefers the username, then the email local part', () => {
    expect(deriveFirstName('rithik.g', null)).toBe('Rithik');
    expect(deriveFirstName(null, 'kim_lee@massclinic.org')).toBe('Kim');
    expect(deriveFirstName('', '')).toBe('there');
  });
});

describe('toResultView', () => {
  it('flags expired and joins dose + unit', () => {
    const v = toResultView({
      id: 'i1',
      unit_code: 'DRX-1',
      status: 'expired',
      expiry_date: '2020-01-01',
      location_code: 'PSYCH2',
      attributes: { medication_name: 'Sertraline', dose: '50', unit: 'mg', form: 'Tablet' },
      created_at: 'c',
    });
    expect(v.isExpired).toBe(true);
    expect(v.dose).toBe('50 mg');
    expect(v.locationCode).toBe('PSYCH2');
  });
});
