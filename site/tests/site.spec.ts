import { test, expect } from '@playwright/test';

test('landing page renders the hero and the architecture trace', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Understand Software.' })).toBeVisible();
  await expect(page.getByText('ARCHITECTURE TRACE · example.com')).toBeVisible();
  await expect(page.getByText('<LoginButton/>').first()).toBeVisible();
});

test('navbar is present with anchor links', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('navigation')).toBeVisible();
  await expect(page.getByRole('link', { name: 'How it works' })).toHaveAttribute('href', '#how');
});

test('all major sections render with substance', async ({ page }) => {
  await page.goto('/');
  for (const heading of ['THE PROBLEM', 'HOW IT WORKS', 'VS THE REST', "WHO IT'S FOR", 'SECURITY', 'FAQ']) {
    await expect(page.getByText(heading, { exact: true }).first()).toBeVisible();
  }
  await expect(page.getByText('45 minutes')).toBeVisible();
  await expect(page.getByText('the system', { exact: true }).first()).toBeVisible();
});

test('FAQ accordion reveals an answer on toggle', async ({ page }) => {
  await page.goto('/');
  const answer = page.getByText('free and open source under Apache-2.0');
  await expect(answer).toBeHidden();
  await page.getByText('Is it free?').click();
  await expect(answer).toBeVisible();
});

test('install + github CTAs are present and github points to the repo', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'View on GitHub' })).toHaveAttribute(
    'href', 'https://github.com/Salah-XD/archify');
});

test('live demo overlay updates on hover', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Product card').hover();
  await expect(page.locator('span.font-semibold', { hasText: /^Card$/ })).toBeVisible();
});

test('privacy page is reachable and states no data is collected', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: 'Archify collects nothing.' })).toBeVisible();
  await expect(page.getByText('Data we collect')).toBeVisible();
});

test('footer privacy link navigates to /privacy', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Privacy' }).first().click();
  await expect(page).toHaveURL(/\/privacy\/?$/);
});
