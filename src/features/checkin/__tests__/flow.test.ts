/**
 * Regression for PR #9: a failed save must never reach the success screen.
 * The flow reducer is pure and the save runner talks to the mocked fetch, so
 * the property is checked end to end without a browser.
 */
import {
  canConfirm,
  flowReducer,
  initialFlowState,
  previewUnitCode,
  runCodePreview,
  runSave,
  type FlowAction,
  type FlowState,
} from '../flow';

const mockFetch = global.fetch as jest.Mock;

function play(actions: FlowAction[], from: FlowState = initialFlowState): FlowState {
  return actions.reduce(flowReducer, from);
}

const atLabel = play([
  { type: 'setLocation', locationCode: 'CARDIO1' },
  { type: 'goTo', phase: 'label' },
  { type: 'codeLoaded', data: { counter: 12, unitCode: 'DRX-MASS-CARDIO-00012' } },
]);

const payload = {
  typeName: 'medication',
  locationCode: 'CARDIO1',
  expiryDate: '2027-03-07',
  dateReceived: '2026-08-23',
  attributes: { medication_name: 'Lisinopril' },
};
const meta = { previewUnitCode: 'DRX-MASS-CARDIO-00012', medicationName: 'Lisinopril' };

function jsonResponse(status: number, body: unknown): Partial<Response> {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

describe('flowReducer', () => {
  it('stays on the label step with the message when the save fails', () => {
    const next = flowReducer(atLabel, { type: 'saveFailed', message: 'duplicate unit' });
    expect(next.phase).toBe('label');
    expect(next.created).toBeNull();
    expect(next.save).toEqual({ status: 'error', message: 'duplicate unit' });
  });

  it('reaches success only through saveSucceeded, carrying the stored code', () => {
    const every: FlowAction[] = [
      { type: 'goTo', phase: 'form' },
      { type: 'goTo', phase: 'location' },
      { type: 'goTo', phase: 'label' },
      { type: 'setLocation', locationCode: 'PSYCH1' },
      { type: 'codeLoading' },
      { type: 'codeLoaded', data: { counter: 1, unitCode: 'X' } },
      { type: 'codeFailed', message: 'down' },
      { type: 'validationIssues', issues: ['expiry'] },
      { type: 'saveStarted' },
      { type: 'saveFailed', message: 'nope' },
      { type: 'reset' },
    ];
    for (const action of every) {
      expect(flowReducer(atLabel, action).phase).not.toBe('success');
    }
    const ok = flowReducer(atLabel, {
      type: 'saveSucceeded',
      created: { unitCode: 'DRX-MASS-CARDIO-00012', locationCode: 'CARDIO1', medicationName: 'L' },
    });
    expect(ok.phase).toBe('success');
    expect(ok.created?.unitCode).toBe('DRX-MASS-CARDIO-00012');
  });

  it('drops a previewed code when the bin changes so the label refetches', () => {
    const next = flowReducer(atLabel, { type: 'setLocation', locationCode: 'PSYCH1' });
    expect(next.code.status).toBe('idle');
    expect(previewUnitCode(next)).toBeNull();
  });

  it('only allows Confirm with a server-issued code, when not saving or blocked', () => {
    expect(canConfirm(atLabel, false)).toBe(true);
    expect(canConfirm(atLabel, true)).toBe(false);
    expect(canConfirm(flowReducer(atLabel, { type: 'saveStarted' }), false)).toBe(false);
    expect(canConfirm(flowReducer(atLabel, { type: 'codeFailed', message: 'x' }), false)).toBe(false);
    expect(canConfirm(initialFlowState, false)).toBe(false);
  });
});

describe('runSave', () => {
  it('does not dispatch saveSucceeded on a 4xx/5xx and surfaces the server error', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(409, { error: 'Unit code already exists' }));
    const dispatched: FlowAction[] = [];
    const saved = await runSave((a) => dispatched.push(a), payload, meta);
    expect(saved).toBe(false);
    expect(dispatched.map((a) => a.type)).toEqual(['saveStarted', 'saveFailed']);
    const end = play(dispatched, atLabel);
    expect(end.phase).toBe('label');
    expect(end.save).toEqual({ status: 'error', message: 'Unit code already exists' });
  });

  it('does not dispatch saveSucceeded when the network fails', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'));
    const dispatched: FlowAction[] = [];
    expect(await runSave((a) => dispatched.push(a), payload, meta)).toBe(false);
    expect(play(dispatched, atLabel).phase).toBe('label');
    expect(dispatched.some((a) => a.type === 'saveSucceeded')).toBe(false);
  });

  it('uses the unit code the server persisted, not the preview', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(201, { unit_code: 'DRX-MASS-CARDIO-00013' }));
    const dispatched: FlowAction[] = [];
    expect(await runSave((a) => dispatched.push(a), payload, meta)).toBe(true);
    const end = play(dispatched, atLabel);
    expect(end.phase).toBe('success');
    expect(end.created?.unitCode).toBe('DRX-MASS-CARDIO-00013');
    const [url, init] = mockFetch.mock.calls[0];
    expect(String(url)).toMatch(/\/inventory\/items$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual(payload);
  });
});

describe('runCodePreview', () => {
  it('asks the server for the code with the medication context and never invents one', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(500, { error: 'allocator down' }));
    const dispatched: FlowAction[] = [];
    await runCodePreview((a) => dispatched.push(a), {
      location: 'CARDIO1',
      medicationName: 'Lisinopril',
      dosage: '10',
    });
    const [url] = mockFetch.mock.calls[0];
    expect(String(url)).toContain('/inventory/items/next-code?location=CARDIO1');
    expect(String(url)).toContain('medication_name=Lisinopril');
    expect(String(url)).toContain('dosage=10');
    const end = play(dispatched, atLabel);
    expect(end.code).toEqual({ status: 'error', message: 'allocator down' });
    expect(previewUnitCode(end)).toBeNull();
  });
});
