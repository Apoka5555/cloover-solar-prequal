import { expect, test } from '@playwright/test';
import { SEEDED, signIn, uniqueEmail } from './fixtures.js';

test.describe('pre-qualification', () => {
  test('a new customer registers, requests a quote and sees three offers', async ({ page }) => {
    const email = uniqueEmail('customer');

    await page.goto('/register');
    await page.getByLabel('Full name').fill('Ada Lovelace');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('Password123!');
    await page.getByRole('button', { name: 'Create account' }).click();

    // Registration signs the customer in and sends them straight to the form.
    await expect(page).toHaveURL(/\/quotes\/new$/);

    // The applicant details come from the account that just signed in.
    await expect(page.getByLabel('Full name')).toHaveValue('Ada Lovelace');
    await expect(page.getByLabel('Email')).toHaveValue(email);

    await page.getByLabel('Installation address').fill('Hauptstrasse 1, 10115 Berlin');
    await page.getByLabel('Monthly consumption').fill('450');
    await page.getByLabel('System size').fill('6');
    await page.getByLabel('Down payment (optional)').fill('1200');
    await page.getByRole('button', { name: 'Get pre-qualification' }).click();

    await expect(page).toHaveURL(/\/quotes\/[0-9a-f-]+$/);

    await expect(page.getByText('7.200,00 €').first()).toBeVisible();
    await expect(page.getByText('6.000,00 €').first()).toBeVisible();
    await expect(page.getByText('Band A, the lowest rate')).toBeVisible();

    // The offers render as cards on a phone and as a table on a wide screen,
    // so both are in the document and only one of them is shown. Filtering by
    // visibility asserts the figure reaches the user at either width.
    for (const monthly of ['118,52 €', '69,36 €', '53,59 €']) {
      await expect(page.getByText(monthly).filter({ visible: true }).first()).toBeVisible();
    }
  });

  test('the quote appears in the customer’s own list', async ({ page }) => {
    const email = uniqueEmail('lister');

    await page.goto('/register');
    await page.getByLabel('Full name').fill('Mia Fischer');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('Password123!');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL(/\/quotes\/new$/);

    await page.getByLabel('Installation address').fill('Lindenweg 12, 80331 Munich');
    await page.getByLabel('Monthly consumption').fill('200');
    await page.getByLabel('System size').fill('4');
    await page.getByRole('button', { name: 'Get pre-qualification' }).click();
    await expect(page).toHaveURL(/\/quotes\/[0-9a-f-]+$/);

    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'My quotes' })
      .click();
    await expect(page).toHaveURL(/\/quotes$/);
    await expect(page.getByText('1 pre-qualification.')).toBeVisible();
    await expect(page.getByText('Band C, the highest rate')).toBeVisible();
  });

  test('the form refuses a down payment above the system price', async ({ page }) => {
    await signIn(page, SEEDED.user.email, SEEDED.user.password);
    await page.goto('/quotes/new');

    await page.getByLabel('Installation address').fill('Hauptstrasse 1, 10115 Berlin');
    await page.getByLabel('Monthly consumption').fill('450');
    await page.getByLabel('System size').fill('5');
    await page.getByLabel('Down payment (optional)').fill('99999');
    await page.getByRole('button', { name: 'Get pre-qualification' }).click();

    await expect(page.getByText('Down payment cannot be more than the system price')).toBeVisible();
    await expect(page).toHaveURL(/\/quotes\/new$/);
  });

  test('an offer expands into its payment schedule', async ({ page }) => {
    await signIn(page, SEEDED.user.email, SEEDED.user.password);
    await page.goto('/quotes');
    await page
      .getByRole('link', { name: /^View quote from/ })
      .first()
      .click();

    await expect(page.getByRole('heading', { name: 'Instalment offers' })).toBeVisible();
    await page
      .getByRole('link', { name: 'View schedule for the 10 year term' })
      .filter({ visible: true })
      .first()
      .click();

    await expect(
      page.getByRole('heading', { name: /Payment schedule over 10 years/ }),
    ).toBeVisible();

    const schedule = page.getByRole('table', { name: /Amortisation schedule/ });
    await expect(schedule).toBeVisible();
    // The loan is retired exactly, so the final balance is zero.
    await expect(schedule.getByRole('row').last()).toContainText('0,00 €');
  });
});
