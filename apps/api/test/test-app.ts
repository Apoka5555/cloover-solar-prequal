import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { AuthUserDto, UserRole } from '@cloover/contracts';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/bootstrap.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
  /** Issues requests against the running application. */
  http: () => TestAgent;
  close: () => Promise<void>;
  reset: () => Promise<void>;
}

export async function createTestContext(): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

  const app = moduleRef.createNestApplication({ logger: false });
  configureApp(app);
  await app.init();

  const prisma = app.get(PrismaService);

  return {
    app,
    prisma,
    http: () => request(app.getHttpServer()),
    close: () => app.close(),
    reset: async () => {
      // Truncating is both faster than deleting and resets every table at
      // once, so no test can depend on rows another test left behind.
      await prisma.$executeRawUnsafe(
        'TRUNCATE TABLE "quote_offers", "quotes", "users" RESTART IDENTITY CASCADE',
      );
    },
  };
}

export interface TestUser extends AuthUserDto {
  password: string;
  cookie: string;
}

/**
 * Registers a user through the public API, so tests exercise the real
 * registration path rather than inserting rows behind it.
 */
export async function registerUser(
  context: TestContext,
  overrides: Partial<{ email: string; fullName: string; password: string; role: UserRole }> = {},
): Promise<TestUser> {
  const email = overrides.email ?? `user-${Math.random().toString(36).slice(2, 10)}@test.com`;
  const password = overrides.password ?? 'Password123!';
  const fullName = overrides.fullName ?? 'Test Person';

  const response = await context
    .http()
    .post('/api/auth/register')
    .send({ email, fullName, password })
    .expect(201);

  if (overrides.role === 'ADMIN') {
    await context.prisma.user.update({ where: { email }, data: { role: 'ADMIN' } });
  }

  return {
    ...(response.body as { user: AuthUserDto }).user,
    role: overrides.role ?? 'USER',
    password,
    cookie: extractSessionCookie(response.headers['set-cookie']),
  };
}

export function extractSessionCookie(header: string | string[] | undefined): string {
  const cookies = Array.isArray(header) ? header : [header ?? ''];
  const session = cookies.find((cookie) => cookie.startsWith('cloover_session='));

  if (!session) {
    throw new Error('Response did not set a session cookie');
  }

  return session.split(';')[0] ?? '';
}

export const VALID_QUOTE = {
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  address: 'Hauptstrasse 1, 10115 Berlin',
  monthlyConsumptionKwh: 450,
  systemSizeKw: 6,
  downPayment: 1200,
} as const;
