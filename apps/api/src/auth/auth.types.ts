import type { UserRole } from '@cloover/contracts';

/** The principal attached to a request once its session token is verified. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

/** Claims carried by the session token. */
export interface JwtPayload {
  /** Subject: the user id. */
  sub: string;
  email: string;
  name: string;
  role: UserRole;
}

export const SESSION_COOKIE_NAME = 'cloover_session';
