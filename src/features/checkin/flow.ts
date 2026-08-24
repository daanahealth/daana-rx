/**
 * Check-in flow state — a pure reducer plus the two async steps that drive it
 * (code preview, save). Kept free of React so the safety property can be unit
 * tested: the success screen is reachable ONLY through `saveSucceeded`, which
 * carries the unit code the server persisted. A failed save leaves the flow on
 * the label step with the server's message (regression for PR #9, where a
 * phantom "check-in complete" showed after a 4xx/5xx).
 */
import {
  createItem,
  fetchNextCode,
  type CreateItemPayload,
  type NextCode,
  type NextCodeParams,
} from './api';

export type Phase = 'form' | 'location' | 'label' | 'success';

export const STEP_LABELS = ['Medication', 'Location', 'Label & confirm'] as const;

export type CodeState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: NextCode };

export type SaveState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'error'; message: string };

export interface CreatedUnit {
  unitCode: string;
  locationCode: string;
  medicationName: string;
}

export interface FlowState {
  phase: Phase;
  locationCode: string;
  code: CodeState;
  save: SaveState;
  validationIssues: string[];
  created: CreatedUnit | null;
}

export type FlowAction =
  | { type: 'goTo'; phase: Exclude<Phase, 'success'> }
  | { type: 'setLocation'; locationCode: string }
  | { type: 'codeLoading' }
  | { type: 'codeLoaded'; data: NextCode }
  | { type: 'codeFailed'; message: string }
  | { type: 'validationIssues'; issues: string[] }
  | { type: 'saveStarted' }
  | { type: 'saveFailed'; message: string }
  | { type: 'saveSucceeded'; created: CreatedUnit }
  | { type: 'reset' };

export const initialFlowState: FlowState = {
  phase: 'form',
  locationCode: '',
  code: { status: 'idle' },
  save: { status: 'idle' },
  validationIssues: [],
  created: null,
};

export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case 'goTo':
      return { ...state, phase: action.phase, save: { status: 'idle' } };
    case 'setLocation':
      // A new bin invalidates any previewed code; the label step refetches.
      return action.locationCode === state.locationCode
        ? state
        : { ...state, locationCode: action.locationCode, code: { status: 'idle' } };
    case 'codeLoading':
      return { ...state, code: { status: 'loading' } };
    case 'codeLoaded':
      return { ...state, code: { status: 'success', data: action.data } };
    case 'codeFailed':
      return { ...state, code: { status: 'error', message: action.message } };
    case 'validationIssues':
      return { ...state, validationIssues: action.issues };
    case 'saveStarted':
      return { ...state, save: { status: 'saving' }, validationIssues: [] };
    case 'saveFailed':
      // Nothing was persisted: stay exactly where we are and say so.
      return { ...state, save: { status: 'error', message: action.message } };
    case 'saveSucceeded':
      return {
        ...state,
        phase: 'success',
        save: { status: 'idle' },
        validationIssues: [],
        created: action.created,
      };
    case 'reset':
      return initialFlowState;
  }
}

/** The code shown on the sticker: server-issued or nothing. */
export function previewUnitCode(state: FlowState): string | null {
  return state.code.status === 'success' ? state.code.data.unitCode : null;
}

/** Whether "Confirm placed" may be pressed. */
export function canConfirm(state: FlowState, supervisorBlocked: boolean): boolean {
  return state.code.status === 'success' && state.save.status !== 'saving' && !supervisorBlocked;
}

export type Dispatch = (action: FlowAction) => void;

/** Fetch the code the server will assign for `params.location`. */
export async function runCodePreview(
  dispatch: Dispatch,
  params: NextCodeParams,
  signal?: AbortSignal
): Promise<void> {
  if (!params.location) return;
  dispatch({ type: 'codeLoading' });
  try {
    dispatch({ type: 'codeLoaded', data: await fetchNextCode(params, signal) });
  } catch (err) {
    if (signal?.aborted) return;
    dispatch({
      type: 'codeFailed',
      message: err instanceof Error ? err.message : 'Could not reach the code service',
    });
  }
}

/**
 * Persist the unit. Resolves to true only when the server confirmed the save;
 * every other outcome dispatches `saveFailed` and resolves false.
 */
export async function runSave(
  dispatch: Dispatch,
  payload: CreateItemPayload,
  meta: { previewUnitCode: string; medicationName: string }
): Promise<boolean> {
  dispatch({ type: 'saveStarted' });
  try {
    const { unitCode } = await createItem(payload);
    dispatch({
      type: 'saveSucceeded',
      created: {
        // Prefer what the server persisted; the preview can drift if someone
        // else checked in concurrently.
        unitCode: unitCode ?? meta.previewUnitCode,
        locationCode: payload.locationCode,
        medicationName: meta.medicationName,
      },
    });
    return true;
  } catch (err) {
    dispatch({
      type: 'saveFailed',
      message: err instanceof Error ? err.message : 'Could not reach the inventory service.',
    });
    return false;
  }
}
