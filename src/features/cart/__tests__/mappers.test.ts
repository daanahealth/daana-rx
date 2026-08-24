import { itemSubtitle, toItemView, toServerCart, unavailableCart } from '../mappers';

const item = {
  id: 'i1',
  unit_code: 'DRX-MASS-CARDIO1-00042',
  status: 'in_cart' as const,
  expiry_date: '2027-03-07',
  location: { code: 'CARDIO1' },
  attributes: {
    medication_name: 'Metformin',
    dosage: '500',
    unit: 'mg',
    form: 'Tablet',
    quantity: '3',
  },
  created_at: '2026-01-01T00:00:00Z',
};

describe('toItemView', () => {
  it('reads medication fields out of attributes', () => {
    const v = toItemView({ item_id: 'i1', added_at: 'now', added_by_name: 'kim', item });
    expect(v).toMatchObject({
      itemId: 'i1',
      unitCode: 'DRX-MASS-CARDIO1-00042',
      locationCode: 'CARDIO1',
      medicationName: 'Metformin',
      dose: '500',
      unit: 'mg',
      form: 'Tablet',
      quantity: 3,
      addedBy: 'kim',
    });
    expect(itemSubtitle(v)).toBe('500 mg · Tablet · Qty 3');
  });

  it('degrades gracefully without an embedded item', () => {
    const v = toItemView({ item_id: 'i2', added_at: 'now' });
    expect(v.unitCode).toBe('i2');
    expect(v.medicationName).toBe('Unknown medication');
    expect(v.status).toBe('in_cart');
  });
});

describe('toServerCart / unavailableCart', () => {
  it('maps snake_case cart fields', () => {
    const c = toServerCart({
      id: 'c1',
      owner_id: 'u1',
      owner_name: 'Kim',
      status: 'pending_approval',
      submitted_at: 's',
      decided_at: null,
      expires_at: 'e',
      items: [{ item_id: 'i1', added_at: 'now', item }],
    });
    expect(c).toMatchObject({
      id: 'c1',
      ownerName: 'Kim',
      status: 'pending_approval',
      submittedAt: 's',
    });
    expect(c.items).toHaveLength(1);
  });
  it('unavailable cart has an empty id so Add stays disabled', () => {
    expect(unavailableCart('u1', null).id).toBe('');
  });
});
