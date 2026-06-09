import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';
import type { InventoryFiltersInput } from '../types/inventory';

// ─── Auth ───────────────────────────────────────────────────────────────────

export const auth = {
  signIn: (email: string, password: string) =>
    apiPost<{ token: string; user: any; clinic: any }>('/auth/signin', { email, password }),

  signUp: (email: string, password: string, clinicName: string) =>
    apiPost<{ token: string; user: any; clinic: any }>('/auth/signup', { email, password, clinicName }),

  me: () => apiGet<{ user: any; clinic: any }>('/auth/me'),

  checkEmail: (email: string) =>
    apiGet<{ exists: boolean; message: string }>(`/auth/check-email?email=${encodeURIComponent(email)}`),

  getUsers: () => apiGet<any[]>('/auth/users'),

  getClinic: () => apiGet<any>('/auth/clinic'),

  createClinic: (name: string) =>
    apiPost<{ token: string; user: any; clinic: any }>('/auth/clinic', { name }),

  updateClinic: (data: Record<string, any>) => apiPut<any>('/auth/clinic', data),

  deleteClinic: (clinicId: string) => apiDelete<any>(`/auth/clinic/${clinicId}`),

  switchClinic: (clinicId: string) =>
    apiPost<{ token: string; user: any; clinic: any }>('/auth/clinic/switch', { clinicId }),

  getClinics: () => apiGet<any[]>('/auth/clinics'),

  getInvitations: () => apiGet<any[]>('/auth/invitations'),

  getInvitationByToken: (token: string) =>
    apiGet<any>(`/auth/invitations/token/${token}`),

  sendInvitation: (email: string, userRole: string) =>
    apiPost<any>('/auth/invitations', { email, userRole }),

  resendInvitation: (invitationId: string) =>
    apiPost<any>(`/auth/invitations/${invitationId}/resend`),

  cancelInvitation: (invitationId: string) =>
    apiDelete<any>(`/auth/invitations/${invitationId}`),

  acceptInvitation: (invitationToken: string, password: string) =>
    apiPost<{ token: string; user: any; clinic: any }>('/auth/invitations/accept', { invitationToken, password }),
};

// ─── Inventory ──────────────────────────────────────────────────────────────

function filtersToParams(filters: InventoryFiltersInput, page: number, pageSize: number): string {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  if (filters.medicationName) params.set('medicationName', filters.medicationName);
  if (filters.genericName) params.set('genericName', filters.genericName);
  if (filters.ndcId) params.set('ndcId', filters.ndcId);
  if (filters.expiryDateFrom) params.set('expiryDateFrom', filters.expiryDateFrom);
  if (filters.expiryDateTo) params.set('expiryDateTo', filters.expiryDateTo);
  if (filters.locationIds) filters.locationIds.forEach(id => params.append('locationId', id));
  if (filters.strengthUnit) params.set('strengthUnit', filters.strengthUnit);
  if (filters.minStrength !== undefined) params.set('minStrength', String(filters.minStrength));
  if (filters.maxStrength !== undefined) params.set('maxStrength', String(filters.maxStrength));
  if (filters.expirationWindow) params.set('expirationWindow', filters.expirationWindow);
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
  return params.toString();
}

export const inventory = {
  getStats: () =>
    apiGet<{ totalUnits: number; unitsExpiringSoon: number; recentCheckIns: number; recentCheckOuts: number; lowStockAlerts: number }>('/inventory/stats'),

  searchDrugs: (q: string) =>
    apiGet<any[]>(`/inventory/drugs/search?q=${encodeURIComponent(q)}`),

  searchMedications: (q: string) =>
    apiGet<any[]>(`/inventory/drugs/medications?q=${encodeURIComponent(q)}`),

  getLocations: () => apiGet<any[]>('/inventory/locations'),

  createLocation: (name: string, temp: string) =>
    apiPost<any>('/inventory/locations', { name, temp }),

  updateLocation: (locationId: string, name: string, temp: string) =>
    apiPut<any>(`/inventory/locations/${locationId}`, { name, temp }),

  deleteLocation: (locationId: string) =>
    apiDelete<any>(`/inventory/locations/${locationId}`),

  getLots: () => apiGet<any[]>('/inventory/lots'),

  createLot: (data: { lotCode: string; source?: string; note?: string; locationId: string }) =>
    apiPost<any>('/inventory/lots', data),

  getUnitsAdvanced: (filters: InventoryFiltersInput, page: number, pageSize: number) =>
    apiGet<{ units: any[]; total: number; page: number; pageSize: number }>(
      `/inventory/units/advanced?${filtersToParams(filters, page, pageSize)}`
    ),

  searchUnits: (query: string) =>
    apiGet<any[]>(`/inventory/units/search?q=${encodeURIComponent(query)}`),

  getUnit: (unitId: string) =>
    apiGet<any>(`/inventory/units/${unitId}`),

  updateUnit: (unitId: string, data: Record<string, any>) =>
    apiPut<any>(`/inventory/units/${unitId}`, data),

  batchCreateUnits: (input: { lotId: string; medicationName: string; dosage: string; quantity: number; expiryDate?: string; manufacturerLotNumber?: string }) =>
    apiPost<any[]>('/inventory/units/batch', input),

  getExpiryMedications: (days: number) =>
    apiGet<any[]>(`/inventory/expiry/medications?days=${days}`),

  getExpiryReport: () =>
    apiGet<{ summary: any; medications: any[] }>('/inventory/expiry/report'),
};

// ─── Transactions ────────────────────────────────────────────────────────────

export const transactions = {
  getTransactions: (params: { page?: number; pageSize?: number; search?: string; unitId?: string }) => {
    const p = new URLSearchParams();
    if (params.page) p.set('page', String(params.page));
    if (params.pageSize) p.set('pageSize', String(params.pageSize));
    if (params.search) p.set('search', params.search);
    if (params.unitId) p.set('unitId', params.unitId);
    return apiGet<{ transactions: any[]; total: number; page: number; pageSize: number }>(`/transactions?${p}`);
  },

  getAllTransactions: (params: { page?: number; pageSize?: number; type?: string; startDate?: string; endDate?: string; medicationName?: string }) => {
    const p = new URLSearchParams();
    if (params.page) p.set('page', String(params.page));
    if (params.pageSize) p.set('pageSize', String(params.pageSize));
    if (params.type) p.set('type', params.type);
    if (params.startDate) p.set('startDate', params.startDate);
    if (params.endDate) p.set('endDate', params.endDate);
    if (params.medicationName) p.set('medicationName', params.medicationName);
    return apiGet<{ transactions: any[]; total: number; page: number; pageSize: number }>(`/transactions/all?${p}`);
  },

  checkout: (unitId: string, quantity: number, notes?: string) =>
    apiPost<any>('/transactions/checkout', { unitId, quantity, notes }),

  batchCheckout: (items: { unitId: string; quantity: number }[], notes?: string) =>
    apiPost<{ transactions: any[]; totalItems: number; totalQuantity: number }>(
      '/transactions/checkout/batch', { items, notes }
    ),
};

// ─── Reports ─────────────────────────────────────────────────────────────────
// All endpoints are provided by be-reports-api (services/transaction/src/routes/reports).
// FE consumes them through the gateway-prefixed paths used elsewhere in this client.

export interface ExpiringItem {
  unitId: string;
  medicationName: string;
  dosage: string;
  form?: string;
  expiryDate: string;
  daysUntilExpiry: number;
  location?: { locationId: string; name: string };
  drxCode: string;
}

export interface CapacityBin {
  locationId: string;
  name: string;
  current: number;
  capacity: number;
  percent: number;
}

export interface HighUseRow {
  drugId: string;
  medicationName: string;
  dosage: string;
  strengthUnit?: string;
  form?: string;
  checkoutCount: number;
}

export interface RecentlyRemovedRow {
  unitId: string;
  medicationName: string;
  dosage: string;
  location?: string;
  drxCode: string;
  removedAt: string;
  removedBy?: string;
  reason: string;
  notes?: string;
}

export interface InventoryEditRow {
  transactionId: string;
  timestamp: string;
  medicationName: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  actor?: string;
}

export interface TransactionLogRow {
  transactionId: string;
  timestamp: string;
  actionType: string;
  medicationName?: string;
  dosage?: string;
  form?: string;
  location?: string;
  drxCode?: string;
  user?: string;
  reason?: string;
  notes?: string;
}

export interface CursorPage<T> {
  rows: T[];
  nextCursor: string | null;
}

export interface TransactionFilters {
  dateFrom?: string;
  dateTo?: string;
  actionTypes?: string[];
  actor?: string;
  q?: string;
  cursor?: string;
  limit?: number;
}

export const reports = {
  expiring: (window: 30 | 60 | 90 = 30) =>
    apiGet<{ window: number; rows: ExpiringItem[] }>(`/transactions/reports/expiring?window=${window}`),

  capacity: () => apiGet<{ rows: CapacityBin[] }>('/transactions/reports/capacity'),

  highUse: () => apiGet<{ rows: HighUseRow[] }>('/transactions/reports/high-use'),

  recentlyRemoved: () => apiGet<{ rows: RecentlyRemovedRow[] }>('/transactions/reports/recently-removed'),

  inventoryEdits: () => apiGet<{ rows: InventoryEditRow[] }>('/transactions/reports/inventory-edits'),

  recentlyCheckedOut: () =>
    apiGet<{ rows: TransactionLogRow[] }>('/transactions/reports/recently-checked-out'),

  transactionLog: (filters: TransactionFilters = {}) => {
    const p = new URLSearchParams();
    if (filters.dateFrom) p.set('date_from', filters.dateFrom);
    if (filters.dateTo) p.set('date_to', filters.dateTo);
    if (filters.actionTypes && filters.actionTypes.length > 0)
      p.set('action_type', filters.actionTypes.join(','));
    if (filters.actor) p.set('actor', filters.actor);
    if (filters.q) p.set('q', filters.q);
    if (filters.cursor) p.set('cursor', filters.cursor);
    p.set('limit', String(filters.limit ?? 50));
    return apiGet<CursorPage<TransactionLogRow>>(`/transactions?${p.toString()}`);
  },
};

// ─── Notifications ───────────────────────────────────────────────────────────

export const notifications = {
  submitFeedback: (feedbackType: string, feedbackMessage: string) =>
    apiPost<any>('/notifications/feedback', { feedbackType, feedbackMessage }),
};
