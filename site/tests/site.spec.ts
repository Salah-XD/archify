import { test, expect } from '@playwright/test';

test('landing page renders the hero and key sections', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Understand Software.' })).toBeVisible();
  await expect(page.getByText('THE 30-SECOND DEMO')).toBeVisible();
  await expect(page.getByText('WHAT IT DETECTS')).toBeVisible();
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
