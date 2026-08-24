import {
  toDispenseRequest,
  toDispenseRequestList,
  toPendingCount,
  toNotificationList,
  ttlCountdown,
  sortOldestFirst,
  hasPending,
} from '../mappers';

const queueRow = {
  id: 'r1',
  status: 'pending',
  medicationName: 'Metformin',
  dose: '500 mg',
  form: 'Tablet',
  quantity: 2,
  patientRef: '0012345',
  denialReason: null,
  createdAt: '2026-08-23T14:00:00Z',
  expiresAt: '2026-08-24T03:59:59Z',
  resolvedAt: null,
  provider: { userId: 'u', fullName: 'Karol Patel', credential: 'NP', specialty: 'CARDIO' },
  ageSeconds: 812,
  units: [
    {
      itemId: 'i1',
      unitCode: 'DRX-MASS-CARDIO1-00042',
      locationCode: 'CARDIO1',
      expiryDate: '2027-01-31',
      status: 'pending_approval',
      released: false,
    },
    {
      itemId: 'i2',
      unitCode: 'DRX-MASS-CARDIO1-00043',
      locationCode: 'CARDIO1',
      expiryDate: '2027-02-28',
      status: 'active',
      released: true,
    },
  ],
};

describe('request mappers (backend PR #13 contract)', () => {
  it('maps a queue row incl. provider, age and the still-held units', () => {
    const r = toDispenseRequest(queueRow);
    expect(r.id).toBe('r1');
    expect(r.status).toBe('pending');
    expect(r.provider).toEqual({ fullName: 'Karol Patel', credential: 'NP' });
    expect(r.ageSeconds).toBe(812);
    expect(r.reservedUnits).toHaveLength(1);
    expect(r.reservedUnits[0]).toMatchObject({
      location: 'CARDIO1',
      unitCode: 'DRX-MASS-CARDIO1-00042',
      expiryDate: '2027-01-31',
    });
  });

  it('unwraps { request } and { requests }, reads denialReason, tolerates unknown status', () => {
    const one = toDispenseRequest({
      request: {
        id: 'x',
        status: 'denied',
        medicationName: 'A',
        quantity: 1,
        denialReason: 'stock damaged',
      },
    });
    expect(one.reason).toBe('stock damaged');
    expect(one.reservedUnits).toEqual([]);
    const list = toDispenseRequestList({
      requests: [{ id: 'a', status: 'weird' }, { status: 'pending' }],
    });
    expect(list).toHaveLength(1);
    expect(list[0].status).toBe('pending');
  });

  it('reads the pending count and notifications', () => {
    expect(toPendingCount({ pending: 4 })).toBe(4);
    const n = toNotificationList({
      notifications: [
        {
          id: 'n1',
          kind: 'request_denied',
          payload: { requestId: 'r1', medication: 'A', quantity: 1, reason: 'per provider' },
          readAt: null,
          createdAt: '2026-08-23T14:00:00Z',
        },
      ],
    });
    expect(n[0].read).toBe(false);
    expect(n[0].requestId).toBe('r1');
    expect(n[0].message).toContain('Request denied');
  });

  it('ttl countdown labels and expiry', () => {
    const now = new Date('2026-08-23T14:00:00Z');
    expect(ttlCountdown(null, now)).toBeNull();
    expect(ttlCountdown('2026-08-23T13:00:00Z', now)).toEqual({ expired: true });
    expect(ttlCountdown('2026-08-23T14:20:00Z', now)).toMatchObject({
      expired: false,
      label: '20 min left',
    });
    expect(ttlCountdown('2026-08-23T16:05:00Z', now)).toMatchObject({ label: '2 h 5 min left' });
  });

  it('orders the queue oldest first', () => {
    const rows = toDispenseRequestList([
      { id: 'b', status: 'pending', createdAt: '2026-08-23T15:00:00Z' },
      { id: 'a', status: 'pending', createdAt: '2026-08-23T14:00:00Z' },
    ]);
    expect(sortOldestFirst(rows).map((r) => r.id)).toEqual(['a', 'b']);
    expect(hasPending(rows)).toBe(true);
  });
});
