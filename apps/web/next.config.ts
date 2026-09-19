import { config } from 'dotenv';
import type { NextConfig } from 'next';

// One .env at the repository root configures Compose, the API and this app.
config({ path: new URL('../../.env', import.meta.url).pathname, quiet: true });

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
};

export default nextConfig;
