import type { Page } from '@playwright/test';

/** Seeded by `prisma db seed`; see .env.example. */
export const SEEDED = {
  admin: { email: 'admin@test.com', password: 'Admin123!pass' },
  user: { email: 'user@test.com', password: 'User123!pass' },
} as const;

/** Each run registers fresh accounts, so specs never collide over one email. */
export function uniqueEmail(prefix = 'e2e'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`;
}

export async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));
}
