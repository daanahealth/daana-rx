import {
  toMedicationCard,
  toMedicationDetail,
  toMedicationList,
  toProviderHome,
  toClinicFlags,
  toProviderUser,
  flagsToWire,
  specialtyLabel,
  providerDisplayName,
  ttlLabel,
} from '../mappers';

describe('provider mappers', () => {
  it('maps a card and drops anything that is not provider-safe', () => {
    const card = toMedicationCard({
      key: 'abc',
      medicationName: 'Metformin',
      dose: '500 mg',
      form: 'Tablet',
      specialtyClass: 'ENDOCRINE',
      availableUnits: 3,
      availableQuantity: 13,
      earliestExpiry: '2026-12-01',
      unit_code: 'DRX-MASS-CARDIO1-00042',
      location: 'CARDIO1',
    });
    expect(card).toEqual({
      key: 'abc',
      medicationName: 'Metformin',
      dose: '500 mg',
      form: 'Tablet',
      specialtyClass: 'ENDOCRINE',
      availableUnits: 3,
      availableQuantity: 13,
      earliestExpiry: '2026-12-01',
    });
    expect(JSON.stringify(card)).not.toMatch(/DRX|CARDIO1/);
  });

  it('treats zero availability as none (E1) and nulls the expiry', () => {
    const card = toMedicationCard({
      key: 'k',
      medicationName: 'X',
      availableUnits: 0,
      earliestExpiry: '2020-01-01',
    });
    expect(card.availableUnits).toBe(0);
    expect(card.earliestExpiry).toBeNull();
  });

  it('accepts snake_case and coerces numbers', () => {
    const card = toMedicationCard({
      key: 'k',
      medication_name: 'Y',
      available_units: '4',
      earliest_expiry: '2027-03-07T00:00:00Z',
    });
    expect(card.availableUnits).toBe(4);
    expect(card.earliestExpiry).toBe('2027-03-07');
  });

  it('maps a list with total and a detail with sorted FEFO buckets', () => {
    const list = toMedicationList({
      medications: [{ key: 'a', medicationName: 'A' }, { medicationName: 'no key' }],
      total: 9,
    });
    expect(list.medications).toHaveLength(1);
    expect(list.total).toBe(9);
    const detail = toMedicationDetail({
      medication: {
        key: 'a',
        medicationName: 'A',
        availableUnits: 2,
        nextExpiries: [
          { expiryDate: '2027-05-01', availableUnits: 1, availableQuantity: 1 },
          { expiryDate: '2026-11-01', availableUnits: 1, availableQuantity: 1 },
        ],
      },
    });
    expect(detail.nextExpiries[0].expiryDate).toBe('2026-11-01');
  });

  it('maps the home feed', () => {
    const home = toProviderHome({
      specialty: 'CARDIO',
      available: [{ key: 'a', medicationName: 'A', availableUnits: 1 }],
      topRequested: [],
    });
    expect(home.specialty).toBe('CARDIO');
    expect(home.available).toHaveLength(1);
    expect(home.topRequested).toEqual([]);
  });

  it('maps flags from the wrapped { flags } shape and defaults everything off', () => {
    expect(
      toClinicFlags({
        flags: {
          provider_requests_enabled: true,
          patient_ref_enabled: false,
          attestation_mode: 'none',
          request_ttl: 4,
        },
      })
    ).toEqual({
      providerRequestsEnabled: true,
      patientRefEnabled: false,
      attestationMode: 'none',
      requestTtl: 4,
    });
    expect(toClinicFlags({})).toEqual({
      providerRequestsEnabled: false,
      patientRefEnabled: false,
      attestationMode: 'none',
      requestTtl: 'end_of_day',
    });
    expect(flagsToWire({ patientRefEnabled: true, requestTtl: 'end_of_day' })).toEqual({
      patient_ref_enabled: true,
      request_ttl: 'end_of_day',
    });
  });

  it('maps a provider user with profile', () => {
    const u = toProviderUser({
      userId: 'u1',
      email: 'k@x.org',
      username: 'k',
      providerProfile: {
        fullName: 'Karol Patel',
        credential: 'NP',
        specialty: 'CARDIO',
        active: true,
      },
    });
    expect(u.profile?.fullName).toBe('Karol Patel');
    expect(providerDisplayName(u.profile!)).toBe('Karol Patel, NP');
    expect(specialtyLabel('CARDIO')).toBe('Cardiology');
    expect(specialtyLabel('foo')).toBe('Foo');
    expect(ttlLabel('end_of_day')).toBe('End of clinic day');
    expect(ttlLabel(1)).toBe('1 hour');
  });
});
