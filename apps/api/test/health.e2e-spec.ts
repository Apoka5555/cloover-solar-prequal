import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestContext, type TestContext } from './test-app.js';

describe('health', () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await createTestContext();
  });

  afterAll(async () => {
    await context.close();
  });

  it('reports liveness without authentication', async () => {
    const response = await context.http().get('/api/health').expect(200);

    expect(response.body).toMatchObject({ status: 'ok' });
    expect(response.body.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it('reports readiness once the database answers', async () => {
    const response = await context.http().get('/api/health/ready').expect(200);

    expect(response.body.status).toBe('ok');
    expect(response.body.details.database.status).toBe('up');
  });

  it('echoes a request id that callers can quote in a bug report', async () => {
    const response = await context
      .http()
      .get('/api/health')
      .set('x-request-id', 'test-correlation-id')
      .expect(200);

    expect(response.headers['x-request-id']).toBe('test-correlation-id');
  });
});
