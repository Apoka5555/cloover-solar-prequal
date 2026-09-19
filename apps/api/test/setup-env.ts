import { config } from 'dotenv';

// Integration tests run against a throwaway database so a test run can never
// destroy development data. Start it with:
//   docker compose --profile test up -d db-test
config({ path: new URL('../../../.env', import.meta.url).pathname, quiet: true });

process.env['NODE_ENV'] = 'test';
process.env['DATABASE_URL'] =
  process.env['TEST_DATABASE_URL'] ??
  'postgresql://cloover:cloover_local_password@localhost:5433/cloover_test?schema=public';
process.env['LOG_LEVEL'] = 'silent';
process.env['LOG_PRETTY'] = 'false';
process.env['JWT_SECRET'] ??= 'integration-test-secret-value-at-least-32-chars';
