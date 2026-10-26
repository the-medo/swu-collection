import { chromium, expect } from 'playwright/test';
import { eq } from 'drizzle-orm';
import { db } from '../../server/db';
import { user } from '../../server/db/schema/auth-schema.ts';
import { authEmailOutbox } from '../../server/db/schema/auth-email.ts';
import { openEmail, recipientHash } from '../../server/lib/auth-email/crypto.ts';
import { processAuthEmails } from '../../server/lib/auth-email/outbox.ts';

if (process.env.SWUBASE_EMAIL_AUTH_BROWSER_TEST !== '1')
  throw new Error('Set SWUBASE_EMAIL_AUTH_BROWSER_TEST=1 to run.');
const database = new URL(process.env.DATABASE_URL!);
if (
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_') ||
  process.env.AUTH_EMAIL_MODE !== 'capture'
)
  throw new Error('Browser test requires a local worktree in capture mode.');
const origin = process.env.BETTER_AUTH_URL!;
const email = `email-browser-${crypto.randomUUID()}@invalid.local`;
const password = 'browser-fixture-password-123';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
const page = await context.newPage();
page.setDefaultTimeout(15_000);
const errors: string[] = [];
const analytics: string[] = [];
page.on('pageerror', error => errors.push(error.message));
page.on('request', request => {
  if (request.url().includes('amplitude.com')) analytics.push(request.url());
});
await page.addInitScript(() => localStorage.setItem('vite-ui-theme', 'dark'));
await page.addLocatorHandler(page.getByRole('button', { name: 'Dismiss', exact: true }), () =>
  page.getByRole('button', { name: 'Dismiss', exact: true }).click(),
);
async function message() {
  const [row] = await db
    .select()
    .from(authEmailOutbox)
    .where(eq(authEmailOutbox.recipientHash, recipientHash(email)));
  expect(row).toBeTruthy();
  const payload = openEmail(row.payload!) as { email: { url: string } };
  await processAuthEmails();
  expect(await Bun.file(`.swubase/auth-emails/${row.id}.html`).exists()).toBe(true);
  await db.delete(authEmailOutbox).where(eq(authEmailOutbox.id, row.id));
  return payload.email.url;
}
try {
  await page.goto(origin + '/auth/sign-in');
  let dialog = page.getByRole('dialog');
  await expect(
    dialog.getByRole('button', { name: 'Sign in with Google', exact: true }),
  ).toBeVisible();
  await expect(dialog.locator('[data-auth-private]')).toHaveClass(/amp-block/);
  await dialog.getByRole('button', { name: 'Create account', exact: true }).click();
  await dialog.getByLabel('Name', { exact: true }).fill('Browser fixture');
  await dialog.getByLabel('Email', { exact: true }).fill(email);
  for (const theme of ['dark', 'light']) {
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: width === 1440 ? 1050 : 740 });
      await page.evaluate(
        theme => document.documentElement.classList.toggle('dark', theme === 'dark'),
        theme,
      );
      expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(
        true,
      );
      await dialog.screenshot({
        path: `.swubase/email-signup-${width}-${theme}.png`,
        animations: 'disabled',
      });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1050 });
  await dialog.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(dialog.getByRole('status').filter({ hasText: 'Check your inbox' })).toBeVisible();
  expect(analytics).toHaveLength(0);
  await page.goto(await message());
  await expect(page.locator('form[data-auth-private]')).toHaveClass(/amp-block/);
  await page.getByLabel('New password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Save password', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Your password is ready' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Sign In', exact: true }).last().click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Email', { exact: true }).fill(email);
  await dialog.getByLabel('Password', { exact: true }).fill(password);
  await dialog.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL(origin + '/');
  expect(
    (await (await context.request.get(origin + '/api/auth/get-session')).json()).user.email,
  ).toBe(email);
  await page.goto(origin + '/settings?page=security');
  await expect(page.getByRole('heading', { name: 'Change password', exact: true })).toBeVisible();
  await expect(page.locator('[data-auth-private]')).toHaveClass(/amp-block/);
  await page.getByLabel('Current password', { exact: true }).fill(password);
  await page.getByLabel('New password', { exact: true }).fill(password + '-changed');
  await page.getByLabel('Confirm new password', { exact: true }).fill(password + '-changed');
  await page.getByRole('button', { name: 'Change password', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Password updated' })).toBeVisible();
  await context.request.post(origin + '/api/auth/sign-out', {
    headers: { Origin: origin },
    data: {},
  });
  await page.goto(origin + '/auth/sign-in');
  dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Forgot password?', exact: true }).click();
  await dialog.getByLabel('Email', { exact: true }).fill(email);
  await dialog.getByRole('button', { name: 'Send password reset email', exact: true }).click();
  await expect(
    dialog.getByRole('status').filter({ hasText: 'If an account exists' }),
  ).toBeVisible();
  await page.goto(await message());
  await page.getByLabel('New password', { exact: true }).fill(password + '-reset');
  await page.getByLabel('Confirm password', { exact: true }).fill(password + '-reset');
  await page.getByRole('button', { name: 'Save password', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Your password is ready' }),
  ).toBeVisible();
  await page.goto(origin + '/auth/reset-password?token=expired-test-token');
  await page.getByLabel('New password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Save password', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Send password reset email', exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  console.log(
    'Email browser flow passed: signup, capture, verify, sign-in, settings, reset, invalid link, responsive themes.',
  );
} catch (error) {
  await page.screenshot({ path: '.swubase/email-browser-failure.png', fullPage: true });
  await Bun.write(
    '.swubase/email-browser-failure.txt',
    new URL(page.url()).pathname + '\n' + (await page.locator('body').innerText()),
  );
  throw error;
} finally {
  await db.delete(user).where(eq(user.email, email));
  await db.delete(authEmailOutbox).where(eq(authEmailOutbox.recipientHash, recipientHash(email)));
  await browser.close();
}

process.exit(0);
