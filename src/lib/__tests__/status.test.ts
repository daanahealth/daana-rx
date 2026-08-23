import {
  ITEM_STATUS,
  ITEM_STATUSES,
  REQUEST_STATUS,
  REQUEST_STATUSES,
  CART_STATUS,
  TONE_CLASSES,
  isItemStatus,
  isRequestStatus,
  statusLabels,
} from '../status';

describe('status vocabulary', () => {
  it('covers every engine item status with a label, tone and hint', () => {
    expect(ITEM_STATUSES.sort()).toEqual(
      ['active', 'in_cart', 'pending_approval', 'checked_out', 'removed', 'expired'].sort()
    );
    for (const s of ITEM_STATUSES) {
      expect(ITEM_STATUS[s].label).toBeTruthy();
      expect(TONE_CLASSES[ITEM_STATUS[s].tone]).toBeDefined();
      expect(ITEM_STATUS[s].hint).toBeTruthy();
    }
  });

  it('covers the dispense-request lifecycle (Provider spec §6)', () => {
    expect(REQUEST_STATUSES.sort()).toEqual(
      ['pending', 'fulfilled', 'denied', 'expired', 'cancelled'].sort()
    );
    expect(REQUEST_STATUS.denied.tone).toBe('danger');
    expect(REQUEST_STATUS.pending.tone).toBe('warn');
    expect(REQUEST_STATUS.fulfilled.tone).toBe('ok');
  });

  it('maps safety-critical statuses to the expected tones', () => {
    expect(ITEM_STATUS.expired.tone).toBe('danger');
    expect(ITEM_STATUS.active.tone).toBe('ok');
    expect(ITEM_STATUS.pending_approval.tone).toBe('warn');
    expect(CART_STATUS.rejected.tone).toBe('danger');
  });

  it('type guards reject unknown values', () => {
    expect(isItemStatus('active')).toBe(true);
    expect(isItemStatus('fulfilled')).toBe(false);
    expect(isRequestStatus('fulfilled')).toBe(true);
    expect(isRequestStatus(42)).toBe(false);
  });

  it('keeps the legacy statusLabels export in sync', () => {
    expect(statusLabels.pending_approval).toBe('Pending Approval');
    expect(Object.keys(statusLabels)).toHaveLength(ITEM_STATUSES.length);
  });
});
