import { config } from 'dotenv';
import type { NextConfig } from 'next';

// One .env at the repository root configures Compose, the API and this app.
config({ path: new URL('../../.env', import.meta.url).pathname, quiet: true });

const apiUrl = process.env.API_INTERNAL_URL ?? 'http://localhost:3001';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // The Docker image runs the standalone server bundle. Local `next start`
  // does not support that output mode, so it is opt-in.
  ...(process.env.NEXT_OUTPUT === 'standalone'
    ? {
        output: 'standalone' as const,
        outputFileTracingRoot: new URL('../../', import.meta.url).pathname,
      }
    : {}),

  /**
   * The browser talks to this origin only. Requests to /api are proxied to the
   * API server, which keeps the session cookie first-party: no CORS
   * preflight, no SameSite=None, and no token in reach of page scripts.
   */
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }];
  },
};

export default nextConfig;
