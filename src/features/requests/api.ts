/**
 * Dispense requests — the only file that knows /transactions/requests URLs.
 * Contract: backend PR #13 (`feat/provider-requests`); see mappers.ts for
 * the tolerant wire reading. Conflict semantics the UI relies on:
 *   POST /            409 "That unit was just reserved…" / "No units currently available" /
 *                     "Only N unit(s) … currently available"; 403 {error, flag} when the flag is off
 *   POST /:id/fulfill 409 "This request expired and the unit was released…"
 */
import { apiGet, apiPost } from '@/lib/apiClient';
import { asRecord, readNumber, readString } from '@/features/provider/mappers';
import {
  toDispenseRequest,
  toDispenseRequestList,
  toNotificationList,
  toPendingCount,
  type DispenseRequestVM,
  type RequestNotificationVM,
} from './mappers';

const BASE = '/transactions/requests';

export interface CreateRequestInput {
  medicationKey: string;
  quantity: number;
  patientRef?: string | null;
}

export async function createRequest(input: CreateRequestInput): Promise<DispenseRequestVM> {
  const body: Record<string, unknown> = {
    medicationKey: input.medicationKey,
    quantity: input.quantity,
  };
  if (input.patientRef) body.patientRef = input.patientRef;
  return toDispenseRequest(await apiPost(`${BASE}`, body));
}

export async function listMyRequests(): Promise<DispenseRequestVM[]> {
  return toDispenseRequestList(await apiGet(`${BASE}/mine`));
}

export async function cancelRequest(id: string): Promise<DispenseRequestVM> {
  return toDispenseRequest(await apiPost(`${BASE}/${encodeURIComponent(id)}/cancel`));
}

// ----- superadmin queue -----------------------------------------------------

export async function listQueue(status: 'pending' | 'resolved'): Promise<DispenseRequestVM[]> {
  return toDispenseRequestList(await apiGet(`${BASE}?status=${status}`));
}

export async function getPendingCount(): Promise<number> {
  return toPendingCount(await apiGet(`${BASE}/count`));
}

export async function fulfillRequest(id: string): Promise<DispenseRequestVM> {
  return toDispenseRequest(await apiPost(`${BASE}/${encodeURIComponent(id)}/fulfill`));
}

export async function denyRequest(id: string, reason: string): Promise<DispenseRequestVM> {
  return toDispenseRequest(await apiPost(`${BASE}/${encodeURIComponent(id)}/deny`, { reason }));
}

export async function returnRequestToShelf(id: string, reason: string): Promise<DispenseRequestVM> {
  return toDispenseRequest(await apiPost(`${BASE}/${encodeURIComponent(id)}/return`, { reason }));
}

export interface TopRequestedVM {
  medicationKey: string;
  medicationName: string;
  dose: string | null;
  form: string | null;
  count: number;
}

/** Any role: most-requested medications over the last `days` (top 10). */
export async function listTopRequested(days = 30): Promise<TopRequestedVM[]> {
  const body = asRecord(await apiGet(`${BASE}/top?days=${days}`));
  const rows = Array.isArray(body.topRequested) ? body.topRequested : [];
  return rows
    .map((r) => {
      const w = asRecord(r);
      return {
        medicationKey: readString(w, ['medicationKey', 'key']) ?? '',
        medicationName: readString(w, ['medicationName']) ?? '',
        dose: readString(w, ['dose']),
        form: readString(w, ['form']),
        count: readNumber(w, ['count'], 0),
      };
    })
    .filter((r) => r.medicationKey);
}

// ----- notifications --------------------------------------------------------

export async function listNotifications(unreadOnly = false): Promise<RequestNotificationVM[]> {
  return toNotificationList(await apiGet(`/notifications${unreadOnly ? '?unread=1' : ''}`));
}

export async function getUnreadNotificationCount(): Promise<number> {
  return Math.max(0, readNumber(asRecord(await apiGet('/notifications/count')), ['unread'], 0));
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiPost(`/notifications/${encodeURIComponent(id)}/read`);
}
