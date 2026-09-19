import { expect, test } from '@playwright/test';
import { SEEDED, signIn, uniqueEmail } from './fixtures.js';

test.describe('access control', () => {
  test('an anonymous visitor is sent to sign in and back again afterwards', async ({ page }) => {
    await page.goto('/quotes');

    await expect(page).toHaveURL(/\/login\?next=%2Fquotes$/);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

    await page.getByLabel('Email').fill(SEEDED.user.email);
    await page.getByLabel('Password').fill(SEEDED.user.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/quotes$/);
  });

  test('wrong credentials are announced rather than silently ignored', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(SEEDED.user.email);
    await page.getByLabel('Password').fill('WrongPassword1!');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Scoped by text because Next renders an empty route announcer that also
    // carries role="alert".
    await expect(page.getByRole('alert').filter({ hasText: /./ })).toContainText(
      'Invalid email or password',
    );
    await expect(page).toHaveURL(/\/login$/);
  });

  test('an ordinary user is neither offered nor served the admin view', async ({ page }) => {
    await signIn(page, SEEDED.user.email, SEEDED.user.password);

    await expect(page.getByRole('link', { name: 'All quotes' })).toBeHidden();

    // Navigating there directly still refuses; hiding the link is not what
    // protects it.
    await page.goto('/admin/quotes');
    await expect(page.getByRole('alert').filter({ hasText: /./ })).toContainText(
      'restricted to administrators',
    );
  });

  test('an administrator sees every customer and can filter them', async ({ page }) => {
    await signIn(page, SEEDED.admin.email, SEEDED.admin.password);

    await page.getByRole('link', { name: 'All quotes' }).click();
    await expect(page).toHaveURL(/\/admin\/quotes$/);

    const table = page.getByRole('table', { name: /All pre-qualification quotes/ });
    await expect(table).toBeVisible();
    await expect(table.getByText('user@test.com').first()).toBeVisible();
    await expect(table.getByText('mia@test.com').first()).toBeVisible();

    await page.getByLabel('Search by name or email').fill('mia@test.com');
    await page.getByRole('button', { name: 'Apply' }).click();

    await expect(page).toHaveURL(/search=mia/);
    await expect(table.getByText('mia@test.com').first()).toBeVisible();
    await expect(table.getByText('user@test.com')).toHaveCount(0);
  });

  test('signing out ends the session', async ({ page }) => {
    const email = uniqueEmail('signout');

    await page.goto('/register');
    await page.getByLabel('Full name').fill('Temporary Person');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('Password123!');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL(/\/quotes\/new$/);

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto('/quotes');
    await expect(page).toHaveURL(/\/login/);
  });
});
