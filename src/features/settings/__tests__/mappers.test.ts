import {
  capacityAlertAt,
  classificationFromForm,
  classificationToForm,
  legacyTempLabel,
  legacyTempToForm,
  normaliseLocation,
  normaliseUser,
  seedFromGuide,
  userDisplayName,
} from '../mappers';

describe('settings mappers', () => {
  it('normalises location aliases and defaults capacity to 50', () => {
    expect(normaliseLocation({ id: 'l1', name: 'CARDIO1', temp: 'room temp' })).toEqual({
      locationId: 'l1',
      code: 'CARDIO1',
      specialty: '',
      capacity: 50,
      item_type: 'room temp',
      deactivated_at: null,
    });
    expect(
      normaliseLocation({
        locationId: 'l2',
        code: 'PSYCH2',
        maxCapacity: 20,
        deactivatedAt: '2026-01-01',
      })
    ).toMatchObject({
      capacity: 20,
      deactivated_at: '2026-01-01',
    });
    expect(capacityAlertAt(50)).toBe(45);
  });

  it('maps legacy roles onto the two-role model with checkout defaults', () => {
    expect(normaliseUser({ userId: 'u1', email: 'a@b.c', userRole: 'admin' })).toMatchObject({
      role: 'Superadmin',
      canCheckout: true,
    });
    expect(normaliseUser({ id: 'u2', email: 'e@b.c', userRole: 'employee' })).toMatchObject({
      role: 'Restricted User',
      canCheckout: false,
    });
    expect(
      normaliseUser({ id: 'u3', email: 'e@b.c', userRole: 'employee', canCheckout: true })
        .canCheckout
    ).toBe(true);
    expect(userDisplayName({ email: '', username: 'kim' })).toBe('kim');
  });

  it('round-trips classification form values', () => {
    const entry = classificationFromForm(
      {
        className: ' cardio ',
        examples: 'Lisinopril, , Metoprolol',
        locationCode: 'CARDIO',
        twoDigit: 'cd',
        supervisorReview: true,
      },
      null
    );
    expect(entry).toEqual({
      class_name: 'CARDIO',
      common_examples: ['Lisinopril', 'Metoprolol'],
      location_code: 'CARDIO',
      two_digit_code: 'CD',
      supervisor_review: true,
      deactivated_at: null,
    });
    expect(classificationToForm(entry).examples).toBe('Lisinopril, Metoprolol');
    expect(seedFromGuide().length).toBeGreaterThan(5);
  });

  it('maps legacy temperature values both ways', () => {
    expect(legacyTempToForm('room temp')).toBe('room_temp');
    expect(legacyTempToForm('fridge')).toBe('fridge');
    expect(legacyTempLabel('fridge')).toBe('Refrigerated');
  });
});
