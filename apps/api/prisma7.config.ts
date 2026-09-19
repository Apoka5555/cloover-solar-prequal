import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// The repository keeps a single .env at its root so that Docker Compose, the
// API and the web app all read the same values.
config({ path: new URL('../../.env', import.meta.url).pathname, quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node --experimental-strip-types prisma/seed.ts',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
