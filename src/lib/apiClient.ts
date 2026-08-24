const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    try {
      const token = localStorage.getItem('authToken');
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const clinic = localStorage.getItem('clinic');
      if (clinic) {
        const { clinicId } = JSON.parse(clinic);
        if (clinicId) headers['x-clinic-id'] = clinicId;
      }
    } catch {}
  }
  return headers;
}

/** Gateway base URL (NEXT_PUBLIC_API_URL in prod). */
export const API_BASE = API_URL;

/**
 * Auth headers (Bearer token + x-clinic-id) for fetches made outside the
 * apiGet/apiPost helpers — e.g. components that need custom status handling.
 * Backend services authenticate via this Bearer token, NOT cookies, so any
 * call to the gateway must send these instead of `credentials: 'include'`.
 */
export function authHeaders(): Record<string, string> {
  return getHeaders();
}

/**
 * Error thrown by the api* helpers. `status` is the HTTP status (0 when the
 * request never reached the gateway — offline, DNS, cold-start timeout) so
 * callers can branch on 403 / 409 without string-matching the message.
 */
export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

async function run<T>(path: string, init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers: getHeaders() });
  } catch (err) {
    throw new ApiError(
      err instanceof Error && err.message ? err.message : 'Network request failed',
      0
    );
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body?.error || `Request failed: ${res.status}`, res.status);
  }
  return res.json();
}

export async function apiGet<T>(path: string): Promise<T> {
  return run<T>(path, { method: 'GET' });
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return run<T>(path, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return run<T>(path, {
    method: 'PUT',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return run<T>(path, {
    method: 'PATCH',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function apiDelete<T>(path: string): Promise<T> {
  return run<T>(path, { method: 'DELETE' });
}
