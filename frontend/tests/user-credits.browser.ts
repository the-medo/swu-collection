// BATTLEFIELD_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/user-credits.browser.ts
import { withBattlefieldFixture, expect } from './battlefield/fixture.ts';

await withBattlefieldFixture('credits-admin', async f => {
  const displayName = 'Credit-admin-' + crypto.randomUUID().slice(0, 8);
  await f.sql`UPDATE "user" SET role='admin', display_name=${displayName} WHERE id=${f.userId}`;
  await f.page.goto(f.origin + '/admin?page=credits');
  await expect(f.page.getByRole('heading', { name: 'User credits', exact: true })).toBeVisible({
    timeout: 60000,
  });
  const search = f.page.getByRole('textbox', { name: 'Search users', exact: true });
  await search.fill(displayName);
  const open = f.page.getByRole('button', { name: 'Give credits to ' + displayName, exact: true });
  await expect(open).toBeEnabled();
  await expect(f.page.getByText('200,000 credits', { exact: true })).toBeVisible();
  await open.focus();
  await f.page.keyboard.press('Enter');
  const dialog = f.page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const amount = dialog.getByRole('spinbutton', { name: 'Credits to add' });
  const submit = dialog.getByRole('button', { name: 'Give credits', exact: true });
  await expect(submit).toBeDisabled();
  await amount.fill('-1');
  await expect(submit).toBeDisabled();
  await amount.fill('750');
  await expect(submit).toBeEnabled();
  let loseResponse = true;
  let rejectRetry = true;
  const requests: { amount: number; requestId: string }[] = [];
  await f.page.route('**/api/admin/credits/*/grants', async route => {
    requests.push(route.request().postDataJSON());
    if (!loseResponse && rejectRetry) {
      rejectRetry = false;
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Simulated expired session.' }),
      });
      return;
    }
    const response = await route.fetch();
    if (loseResponse) {
      loseResponse = false;
      expect(response.ok()).toBe(true);
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Simulated lost response. Retry this grant.' }),
      });
    } else await route.fulfill({ response });
  });
  await submit.click();
  await expect(dialog.getByRole('alert')).toHaveText('Simulated lost response. Retry this grant.');
  await expect(amount).toBeDisabled();
  await expect(dialog).toContainText('200,750 credits');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(open).toBeEnabled();
  await open.click();
  await expect(amount).toHaveValue('750');
  await expect(amount).toBeDisabled();
  await dialog.getByRole('button', { name: 'Retry grant', exact: true }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Simulated expired session.');
  await expect(amount).toBeDisabled();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await open.click();
  await expect(amount).toHaveValue('750');
  await expect(amount).toBeDisabled();
  await dialog.getByRole('button', { name: 'Retry grant', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(f.page.getByRole('status').filter({ hasText: 'Added 750 credits' })).toBeVisible();
  await expect(f.page.getByText('200,750 credits', { exact: true })).toBeVisible();
  expect(requests).toHaveLength(3);
  expect(requests[0]).toEqual(requests[1]);
  expect(requests[0]).toEqual(requests[2]);
  const awards =
    await f.sql`SELECT amount FROM user_credits WHERE user_id=${f.userId} AND source='admin'`;
  expect(awards).toHaveLength(1);
  expect(Number(awards[0].amount)).toBe(750);
  expect((await f.editor()).balance).toBe(200750);
  await f.page.unroute('**/api/admin/credits/*/grants');
  await f.page.screenshot({ path: f.screenshots + 'desktop.png', fullPage: true });
  await f.page.setViewportSize({ width: 390, height: 844 });
  await f.page.evaluate(() => localStorage.setItem('vite-ui-theme', 'dark'));
  await f.page.reload();
  await search.fill(displayName);
  await expect(open).toBeEnabled();
  await open.click();
  await expect(dialog).toBeVisible();
  await amount.fill('1000');
  await expect(submit).toBeEnabled();
  await expect
    .poll(async () => {
      const box = await dialog.boundingBox();
      return !!box && box.x >= -0.5 && box.x + box.width <= 390.5;
    })
    .toBe(true);
  expect(
    await f.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  await f.page.screenshot({
    path: f.screenshots + 'mobile-dark.png',
    fullPage: true,
    animations: 'disabled',
  });
  await f.page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await search.fill('no-such-credit-user-' + crypto.randomUUID());
  await expect(f.page.getByText('No matching users.', { exact: true })).toBeVisible();
  let failList = true;
  await f.page.route('**/api/admin/credits?*', async route => {
    if (failList) {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Simulated list failure.' }),
      });
    } else await route.continue();
  });
  await search.fill(displayName);
  await expect(f.page.getByRole('alert')).toContainText('Simulated list failure.');
  failList = false;
  await f.page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(open).toBeEnabled();
  await f.page.reload();
  await search.fill(displayName);
  await expect(f.page.getByText('200,750 credits', { exact: true })).toBeVisible();
  const unsafeUser = 'credit-unsafe-' + crypto.randomUUID();
  try {
    await f.sql`INSERT INTO "user"(id,name,display_name,email,email_verified,currency,role,created_at,updated_at)
      VALUES(${unsafeUser},${unsafeUser},${unsafeUser},${unsafeUser + '@invalid.local'},false,'USD','user',now(),now())`;
    await f.sql`INSERT INTO user_credits(user_id,amount,source,source_key) VALUES
      (${unsafeUser},${Number.MAX_SAFE_INTEGER},'credit-test',${crypto.randomUUID()}),
      (${unsafeUser},1,'credit-test',${crypto.randomUUID()})`;
    await search.fill(unsafeUser);
    await expect(f.page.getByText('Balance requires review', { exact: true })).toBeVisible();
    await expect(
      f.page.getByRole('button', { name: 'Give credits to ' + unsafeUser, exact: true }),
    ).toBeDisabled();
  } finally {
    await f.sql`DELETE FROM "user" WHERE id=${unsafeUser}`;
  }
  console.log(
    'PASS: admin grants, lost-response retry after closing/reopening and denial, refreshed shared balance, keyboard, mobile dark layout, empty/error/review states and direct navigation.',
  );
});
