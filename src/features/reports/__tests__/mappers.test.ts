import {
  actorLabel,
  mapCapacity,
  mapExpiring,
  mapInventoryEdits,
  mapLegacyTransaction,
  mapTransactionPage,
  mapUserDirectory,
  resolveActorId,
} from '../mappers';
import { transactionsToCsv, transactionRowToCsv, csvCell } from '../export';
import { formatDateTime } from '@/lib/format';
import { TRANSACTION_ACTION, transactionActionMeta } from '@/lib/status';

const TS = '2026-08-21T14:05:00.000Z';
const USER_ID = '24b5d2b2-b27f-4316-b48e-f0ad7d71fe3d';

describe('mapTransactionPage', () => {
  const core = {
    next_cursor: 'abc',
    transactions: [
      {
        transaction_id: 't1',
        timestamp: TS,
        action_type: 'check_out',
        medication_name: 'Lisinopril',
        dose: '10 mg',
        form: 'Tablet',
        location: { code: 'CARDIO1', specialty: 'CARDIO' },
        drx_code: 'DRX-MASS-CARDIO1-00001',
        user: USER_ID,
        reason: null,
        notes: 'note',
      },
    ],
  };

  it('reads the gateway snake_case shape', () => {
    const page = mapTransactionPage(core);
    expect(page.nextCursor).toBe('abc');
    expect(page.rows).toHaveLength(1);
    const r = page.rows[0];
    expect(r.actionType).toBe('check_out');
    expect(r.location).toBe('CARDIO1');
    expect(r.drxCode).toBe('DRX-MASS-CARDIO1-00001');
    expect(r.actorId).toBe(USER_ID);
    expect(r.actorKind).toBeNull();
  });

  it('tolerates the camelCase { rows } shape', () => {
    const page = mapTransactionPage({
      rows: [{ transactionId: 't2', timestamp: TS, actionType: 'edit', user: 'kim' }],
      nextCursor: null,
    });
    expect(page.rows[0].transactionId).toBe('t2');
    expect(page.rows[0].actorId).toBe('kim');
    expect(page.nextCursor).toBeNull();
  });

  it('carries actor_kind when the backend sends it', () => {
    const page = mapTransactionPage({
      transactions: [
        {
          transaction_id: 't3',
          timestamp: TS,
          action_type: 'request_expired',
          actor_id: null,
          actor_kind: 'system_ttl',
        },
      ],
    });
    expect(page.rows[0].actorKind).toBe('system_ttl');
  });
});

describe('actorLabel', () => {
  const dir = { [USER_ID]: 'kim' };
  it('names system writers from actor_kind', () => {
    expect(actorLabel({ actorId: null, actorKind: 'system_ttl' })).toBe('System (TTL)');
    expect(actorLabel({ actorId: null, actorKind: 'system_expiry_sweep' })).toBe(
      'System (expiry sweep)'
    );
  });
  it('resolves humans through the directory, falling back to a short id', () => {
    expect(actorLabel({ actorId: USER_ID, actorKind: 'user' }, dir)).toBe('kim');
    expect(actorLabel({ actorId: USER_ID, actorKind: null })).toBe('User 24b5d2b2');
    expect(actorLabel({ actorId: 'kim', actorKind: null })).toBe('kim');
  });
  it('is a plain System when nothing is known', () => {
    expect(actorLabel({ actorId: null, actorKind: null })).toBe('System');
  });
  it('resolves an actor filter to an id by name', () => {
    expect(resolveActorId('KIM', dir)).toBe(USER_ID);
    expect(resolveActorId('nobody', dir)).toBeUndefined();
    expect(resolveActorId(USER_ID, dir)).toBe(USER_ID);
  });
});

describe('report mappers', () => {
  it('maps expiring items and computes days left', () => {
    const rows = mapExpiring(
      {
        items: [
          {
            item_id: 'i1',
            medication_name: 'Metformin',
            dose: '500 mg',
            expiry_date: '2026-09-01',
            unit_code: 'X',
            location: { code: 'ENDO1' },
          },
        ],
      },
      new Date(2026, 7, 22)
    );
    expect(rows[0].daysUntilExpiry).toBe(10);
    expect(rows[0].location).toBe('ENDO1');
  });

  it('maps capacity ratios to percentages', () => {
    const rows = mapCapacity({
      locations: [
        { location: { id: 'l1', code: 'CARDIO1', capacity: 50 }, used: 47, percent: 0.94 },
      ],
    });
    expect(rows[0]).toMatchObject({
      locationId: 'l1',
      name: 'CARDIO1',
      current: 47,
      capacity: 50,
      percent: 94,
    });
    expect(
      mapCapacity({
        rows: [{ locationId: 'l2', name: 'B', current: 9, capacity: 10, percent: 90 }],
      })[0].percent
    ).toBe(90);
  });

  it('flattens edits to one row per changed field', () => {
    const rows = mapInventoryEdits({
      edits: [
        {
          transaction_id: 't',
          timestamp: TS,
          actor_id: USER_ID,
          item: { medication_name: 'Med' },
          changes: [
            { field: 'dose', old: '5 mg', new: '10 mg' },
            { field: 'form', old: null, new: 'Tablet' },
          ],
        },
      ],
    });
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({
      field: 'form',
      oldValue: null,
      newValue: 'Tablet',
      medicationName: 'Med',
    });
  });

  it('maps legacy /transactions/all rows', () => {
    const r = mapLegacyTransaction({
      transactionId: 'x',
      timestamp: TS,
      type: 'check_in',
      quantity: 3,
      unit: { drug: { medicationName: 'Aspirin', strength: '81', strengthUnit: 'mg' } },
      user: { username: 'ansh' },
    });
    expect(r).toMatchObject({
      type: 'check_in',
      quantity: 3,
      medicationName: 'Aspirin',
      strength: '81mg',
      user: 'ansh',
    });
  });

  it('builds a user directory from /auth/users', () => {
    expect(
      mapUserDirectory([
        { userId: USER_ID, username: 'kim' },
        { user_id: 'u2', email: 'a@b.c' },
      ])
    ).toEqual({ [USER_ID]: 'kim', u2: 'a@b.c' });
  });
});

describe('transaction vocabulary', () => {
  it('labels the request actions', () => {
    expect(TRANSACTION_ACTION.request_created.label).toBe('Request Created');
    expect(TRANSACTION_ACTION.unit_returned.label).toBe('Unit Returned');
    expect(transactionActionMeta('some_new_thing').label).toBe('Some New Thing');
  });
});

describe('CSV export (spec B3/T10)', () => {
  const row = mapTransactionPage({
    transactions: [
      {
        transaction_id: 't1',
        timestamp: TS,
        action_type: 'check_out',
        medication_name: 'Lisinopril, 10 mg',
        user: USER_ID,
        notes: 'He said "ok"',
      },
    ],
  }).rows[0];

  it('formats the date with formatDate (MM/DD/YYYY), never ISO', () => {
    const csv = transactionsToCsv([row], { [USER_ID]: 'kim' });
    expect(csv).toContain(formatDateTime(TS));
    expect(csv).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(csv).not.toContain(TS);
    expect(csv).not.toContain('2026-08-21');
  });

  it('uses the action label and the human actor', () => {
    const cells = transactionRowToCsv(row, { [USER_ID]: 'kim' });
    expect(cells[1]).toBe('Check Out');
    expect(cells[7]).toBe('kim');
  });

  it('quotes cells with commas and quotes', () => {
    expect(csvCell('Lisinopril, 10 mg')).toBe('"Lisinopril, 10 mg"');
    expect(csvCell('He said "ok"')).toBe('"He said ""ok"""');
    expect(transactionsToCsv([row]).split('\r\n')[0]).toContain('Date & Time');
  });
});
