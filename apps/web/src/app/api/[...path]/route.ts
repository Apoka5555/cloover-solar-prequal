import { NextResponse, type NextRequest } from 'next/server';
import { apiBaseUrl } from '@/lib/api-url';

/**
 * Forwards browser calls to the API.
 *
 * Doing this at request time, rather than through a Next rewrite, keeps the
 * API address a runtime setting: a rewrite is resolved when the app is built
 * and would bake a hostname into the image.
 *
 * Because the browser only ever calls this origin, the session cookie stays
 * first-party. There is no CORS preflight, no SameSite=None, and the cookie
 * can remain httpOnly.
 */

/** Headers that belong to a single connection and must not be relayed. */
const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
]);

async function forward(request: NextRequest, context: RouteContext<'/api/[...path]'>) {
  const { path } = await context.params;

  const target = new URL(`/api/${path.join('/')}`, apiBaseUrl());
  target.search = request.nextUrl.search;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key)) {
      headers.set(key, value);
    }
  });

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';

  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    redirect: 'manual',
    cache: 'no-store',
  });

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    // fetch has already decoded the body, so the upstream encoding and length
    // no longer describe what is being sent on.
    if (!HOP_BY_HOP.has(key) && key !== 'set-cookie' && key !== 'content-encoding') {
      responseHeaders.set(key, value);
    }
  });

  // Set-Cookie may appear several times and must survive as separate headers,
  // which a plain copy would collapse into one.
  for (const cookie of upstream.headers.getSetCookie()) {
    responseHeaders.append('set-cookie', cookie);
  }

  return new NextResponse(upstream.body, { status: upstream.status, headers: responseHeaders });
}

export {
  forward as GET,
  forward as POST,
  forward as PUT,
  forward as PATCH,
  forward as DELETE,
  forward as HEAD,
};
