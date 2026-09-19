import 'server-only';
import type { ApiErrorDto } from '@cloover/contracts';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.API_INTERNAL_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: Partial<ApiErrorDto>,
  ) {
    super(body.message ?? `Request failed with status ${status}`);
    this.name = 'ApiError';
  }
}

/**
 * Calls the API from a server component or server action.
 *
 * The browser never holds an API address: it talks to this origin, and either
 * a rewrite or this function forwards the request. The session cookie is
 * forwarded explicitly because server-side fetch does not inherit it.
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const cookieStore = await cookies();

  const response = await fetch(`${API_BASE_URL}/api${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      cookie: cookieStore.toString(),
      ...init.headers,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as Partial<ApiErrorDto>;
    throw new ApiError(response.status, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
