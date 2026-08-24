/**
 * Reports API — every fetch the Reports and Activity Logs screens make.
 *
 * Paths and query params are unchanged from the pre-refactor components
 * (`/transactions/reports/*`, `/transactions`, `/transactions/all`). The raw
 * payload types below describe what the gateway actually returns (snake_case,
 * one collection key per report); `mappers.ts` turns them into screen rows
 * and also tolerates the camelCase `{ rows }` shape older clients typed.
 */
import { apiGet } from '@/lib/apiClient';

/** Loose record: the mappers pick fields defensively. */
export type RawRecord = Record<string, unknown>;

export type ExpiryWindow = 30 | 60 | 90;

export interface TransactionLogQuery {
  dateFrom?: string;
  dateTo?: string;
  actionTypes?: string[];
  /** Free-text actor (username / email) — forwarded as `actor`. */
  actor?: string;
  /** Resolved user id — forwarded as `actor_id`, which the log route filters on. */
  actorId?: string;
  q?: string;
  cursor?: string;
  limit?: number;
}

export interface LegacyTransactionQuery {
  page?: number;
  pageSize?: number;
  type?: string;
  startDate?: string;
  endDate?: string;
  medicationName?: string;
}

export interface LegacyTransactionPage {
  transactions: RawRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export const reportsApi = {
  expiring: (window: ExpiryWindow = 30) =>
    apiGet<RawRecord>(`/transactions/reports/expiring?window=${window}`),

  capacity: () => apiGet<RawRecord>('/transactions/reports/capacity'),

  highUse: () => apiGet<RawRecord>('/transactions/reports/high-use'),

  recentlyRemoved: () => apiGet<RawRecord>('/transactions/reports/recently-removed'),

  inventoryEdits: () => apiGet<RawRecord>('/transactions/reports/inventory-edits'),

  transactionLog: (filters: TransactionLogQuery = {}) => {
    const p = new URLSearchParams();
    if (filters.dateFrom) p.set('date_from', filters.dateFrom);
    if (filters.dateTo) p.set('date_to', filters.dateTo);
    if (filters.actionTypes && filters.actionTypes.length > 0)
      p.set('action_type', filters.actionTypes.join(','));
    if (filters.actor) p.set('actor', filters.actor);
    if (filters.actorId) p.set('actor_id', filters.actorId);
    if (filters.q) p.set('q', filters.q);
    if (filters.cursor) p.set('cursor', filters.cursor);
    p.set('limit', String(filters.limit ?? 50));
    return apiGet<RawRecord>(`/transactions?${p.toString()}`);
  },

  /** Legacy units-table log used by /logs (page-numbered). */
  legacyTransactions: (params: LegacyTransactionQuery) => {
    const p = new URLSearchParams();
    if (params.page) p.set('page', String(params.page));
    if (params.pageSize) p.set('pageSize', String(params.pageSize));
    if (params.type) p.set('type', params.type);
    if (params.startDate) p.set('startDate', params.startDate);
    if (params.endDate) p.set('endDate', params.endDate);
    if (params.medicationName) p.set('medicationName', params.medicationName);
    return apiGet<LegacyTransactionPage>(`/transactions/all?${p}`);
  },

  /**
   * Clinic user directory, used to turn `actor_id` into a name. Admin-only on
   * the backend; callers must treat a failure as "no directory".
   */
  users: () => apiGet<RawRecord[]>('/auth/users'),
};
