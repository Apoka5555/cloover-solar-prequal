import 'server-only';
import type { AuthUserDto, SessionDto } from '@cloover/contracts';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { apiFetch } from './api';

/**
 * Resolves the signed-in user by asking the API, which is the only component
 * that can validate the session token. Cached per request so that a page
 * rendering several server components verifies the session once.
 */
export const getSession = cache(async (): Promise<AuthUserDto | null> => {
  try {
    const session = await apiFetch<SessionDto>('/auth/me');
    return session.user;
  } catch {
    return null;
  }
});

export async function requireUser(returnTo?: string): Promise<AuthUserDto> {
  const user = await getSession();

  if (!user) {
    redirect(returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : '/login');
  }

  return user;
}
