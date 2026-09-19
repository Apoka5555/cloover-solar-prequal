import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE = 'cloover_session';
const PROTECTED_PREFIXES = ['/quotes', '/admin'];

/**
 * Sends anonymous visitors to the sign-in page before a protected page starts
 * rendering. This is a convenience only: it checks that a cookie is present,
 * not that it is valid. Every piece of data still comes from the API, which
 * verifies the session and the caller's role on each request.
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  if (request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.next();
  }

  const signIn = new URL('/login', request.url);
  signIn.searchParams.set('next', pathname);

  return NextResponse.redirect(signIn);
}

export const config = {
  matcher: ['/quotes/:path*', '/admin/:path*'],
};
