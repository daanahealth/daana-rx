/**
 * Provider feature — the only file that knows provider-facing URLs.
 *
 *   Read surface   GET /inventory/provider/{home,medications,medications/:key}   (backend PR #11)
 *   Profile/flags  GET /auth/me · GET|PATCH /inventory/settings/flags            (backend PR #12)
 *   Accounts       POST /auth/invite · GET /auth/providers · PATCH /auth/providers/:userId
 *
 * Every response is mapped in ./mappers.ts; callers never see wire shapes.
 */
import { apiGet, apiPatch, apiPost } from '@/lib/apiClient';
import {
  toClinicFlags,
  toMedicationDetail,
  toMedicationList,
  toProviderHome,
  toProviderProfile,
  toProviderUser,
  flagsToWire,
  asRecord,
  pick,
  type ClinicFlagsVM,
  type MedicationDetailVM,
  type MedicationListVM,
  type ProviderCredential,
  type ProviderHomeVM,
  type ProviderProfileVM,
  type ProviderUserVM,
} from './mappers';

export type MedicationSort = 'quantity' | 'name' | 'expiry';

export interface MedicationListParams {
  specialty?: string | null;
  /** 2+ characters; shorter values are dropped (API contract). */
  q?: string | null;
  sort?: MedicationSort;
  limit?: number;
  offset?: number;
}

function qs(params: Record<string, string | number | null | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === '') continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export async function getProviderHome(
  specialty?: string | null,
  limit = 40
): Promise<ProviderHomeVM> {
  return toProviderHome(await apiGet(`/inventory/provider/home${qs({ specialty, limit })}`));
}

export async function listProviderMedications(
  params: MedicationListParams = {}
): Promise<MedicationListVM> {
  const q = params.q?.trim();
  return toMedicationList(
    await apiGet(
      `/inventory/provider/medications${qs({
        specialty: params.specialty,
        q: q && q.length >= 2 ? q : undefined,
        sort: params.sort,
        limit: params.limit ?? 200,
        offset: params.offset,
      })}`
    )
  );
}

export async function getProviderMedication(key: string): Promise<MedicationDetailVM> {
  return toMedicationDetail(
    await apiGet(`/inventory/provider/medications/${encodeURIComponent(key)}`)
  );
}

/** The signed-in user's provider profile (null for non-provider roles). */
export async function getMyProviderProfile(): Promise<ProviderProfileVM | null> {
  const body = asRecord(await apiGet('/auth/me'));
  return toProviderProfile(pick(body, ['providerProfile', 'provider_profile']));
}

export async function getClinicFlags(): Promise<ClinicFlagsVM> {
  return toClinicFlags(await apiGet('/inventory/settings/flags'));
}

export async function patchClinicFlags(patch: Partial<ClinicFlagsVM>): Promise<ClinicFlagsVM> {
  return toClinicFlags(await apiPatch('/inventory/settings/flags', flagsToWire(patch)));
}

export async function listProviders(): Promise<ProviderUserVM[]> {
  const body: unknown = await apiGet('/auth/providers');
  const rows = Array.isArray(body) ? body : (asRecord(body).providers as unknown[]) || [];
  return rows.map(toProviderUser).filter((p) => p.userId);
}

export interface ProviderPatch {
  fullName?: string;
  credential?: ProviderCredential;
  specialty?: string;
  active?: boolean;
}

export async function patchProvider(userId: string, patch: ProviderPatch): Promise<ProviderUserVM> {
  return toProviderUser(await apiPatch(`/auth/providers/${encodeURIComponent(userId)}`, patch));
}

export interface InviteProviderInput {
  email: string;
  username: string;
  fullName: string;
  credential: ProviderCredential;
  specialty: string;
}

/** Superadmin-only: creates the account directly (POST /auth/invite, role provider). */
export async function inviteProvider(input: InviteProviderInput): Promise<ProviderUserVM> {
  return toProviderUser(await apiPost('/auth/invite', { ...input, userRole: 'provider' }));
}
