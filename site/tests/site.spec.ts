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

test('live demo: hovering an element updates the ARCH readout', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('email').hover();
  await expect(page.getByText('<EmailField/>')).toBeVisible();
});

test('live demo: clicking Pay traces the flow', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Pay $49' }).click();
  await expect(page.getByText('TRACED FROM YOUR CLICK')).toBeVisible();
  await expect(page.getByText('POST /api/charge', { exact: false })).toBeVisible();
  await expect(page.getByText('sets a token', { exact: false })).toBeVisible();
  await expect(page.getByText('/confirmation', { exact: false })).toBeVisible();
});

test('live demo: order summary shows the no-flow teaching state', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('group', { name: 'Order summary' }).click();
  await expect(page.getByText("wasn't triggered by your interaction")).toBeVisible();
});

test('live demo: card field uses honest "listens on" wording, not "can read"', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('card number').hover();
  await expect(page.getByText('listens on the card field', { exact: false })).toBeVisible();
});

test('the demo no longer overclaims a "TRIGGERED API"', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('TRIGGERED API')).toHaveCount(0);
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

// ---- Waitlist popup (assumes the extension is unpublished: WEBSTORE_URL === '#') ----

const okRoute = (route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, already: false }),
  });

test('waitlist: clicking the CTA opens the dialog', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Join the waitlist' }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('Be first to trace your stack.')).toBeVisible();
});

test('waitlist: invalid email errors inline, valid email succeeds', async ({ page }) => {
  await page.route('**/api/waitlist', okRoute);
  await page.goto('/');
  await page.getByRole('button', { name: 'Join the waitlist' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Email address').fill('not-an-email');
  await dialog.getByRole('button', { name: /Join/ }).click();
  await expect(dialog.getByText("That doesn't look like an email.")).toBeVisible();
  await dialog.getByLabel('Email address').fill('dev@example.com');
  await dialog.getByRole('button', { name: /Join/ }).click();
  await expect(dialog.getByText("You're on the list.")).toBeVisible();
});

test('waitlist: dismissing is remembered across reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Join the waitlist' }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.reload();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);
  await expect(page.getByRole('dialog')).toBeHidden(); // suppressed by localStorage flag
});

test('waitlist: auto-fires once on deep scroll, then never again', async ({ page }) => {
  await page.route('**/api/waitlist', okRoute);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Join the waitlist' }).first()).toBeVisible();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.getByRole('dialog')).toBeVisible(); // auto-fired
  await page.keyboard.press('Escape');
  await page.reload();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);
  await expect(page.getByRole('dialog')).toBeHidden(); // suppressed
});

test('waitlist: exit-intent (mouse leaves toward the tab bar) auto-fires once', async ({ page }) => {
  await page.route('**/api/waitlist', okRoute);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Join the waitlist' }).first()).toBeVisible();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.evaluate(() =>
    document.dispatchEvent(new MouseEvent('mouseout', { clientY: -1, relatedTarget: null, bubbles: true })),
  );
  await expect(page.getByRole('dialog')).toBeVisible();
});
