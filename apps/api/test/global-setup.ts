import { execFileSync } from 'node:child_process';
import { config } from 'dotenv';

/**
 * Brings the test database schema up to date once per run, using the same
 * migrations that are deployed to production rather than a schema push, so the
 * suite would catch a migration that fails to apply.
 */
export default function setup(): void {
  config({ path: new URL('../../../.env', import.meta.url).pathname, quiet: true });

  const databaseUrl =
    process.env['TEST_DATABASE_URL'] ??
    'postgresql://cloover:cloover_local_password@localhost:5433/cloover_test?schema=public';

  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    cwd: new URL('..', import.meta.url).pathname,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  });
}
